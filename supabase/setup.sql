-- =============================================================================
-- Commandi — full database setup for a NEW Supabase project
-- = 001_initial_schema.sql + 002_shield_store_stock.sql. Safe to re-run.
-- =============================================================================

-- =============================================================================
-- Commandi — Initial Database Schema
-- =============================================================================
-- Migration: 001_initial_schema
-- Shops (one per seller), products, and cash-on-delivery orders.
-- Money is stored in millimes (1 TND = 1000 millimes) as integers.
-- Safe to re-run: every statement skips or replaces what already exists.
-- =============================================================================

-- =============================================================================
-- 1. Shops — one per authenticated seller, created on sign-up
-- =============================================================================
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    -- What the customer pays for delivery (added to the order total)
    default_delivery_fee INTEGER NOT NULL DEFAULT 7000 CHECK (default_delivery_fee >= 0),
    -- What the delivery company charges the seller per parcel
    default_shipping_cost INTEGER NOT NULL DEFAULT 7000 CHECK (default_shipping_cost >= 0),
    -- WhatsApp confirmation message; NULL means the app's default template
    confirm_template TEXT CHECK (char_length(confirm_template) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own shop" ON shops;
CREATE POLICY "Sellers can view own shop"
    ON shops FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Sellers can create own shop" ON shops;
CREATE POLICY "Sellers can create own shop"
    ON shops FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Sellers can update own shop" ON shops;
CREATE POLICY "Sellers can update own shop"
    ON shops FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create the shop row on sign-up
CREATE OR REPLACE FUNCTION public.commandi_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.shops (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_commandi ON auth.users;
CREATE TRIGGER on_auth_user_created_commandi
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.commandi_handle_new_user();

-- Backfill shops for users that signed up before this migration
INSERT INTO shops (id, name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Products — catalog with sale price and cost (for profit)
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id, name);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own products" ON products;
CREATE POLICY "Sellers manage own products"
    ON products FOR ALL
    USING (auth.uid() = shop_id)
    WITH CHECK (auth.uid() = shop_id);

-- =============================================================================
-- 3. Orders — one row per cash-on-delivery order
-- =============================================================================
-- items: [{ "name": text, "qty": int, "unitPrice": millimes, "unitCost": millimes }]
-- Lifecycle: new -> confirmed -> shipped -> delivered | returned; cancelled anytime
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    number BIGINT GENERATED ALWAYS AS IDENTITY,
    customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
    -- Normalized to 8 local digits (no +216)
    phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{8}$'),
    governorate TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '' CHECK (char_length(address) <= 500),
    items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
    subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    delivery_fee INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    shipping_cost INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    product_cost INTEGER NOT NULL DEFAULT 0 CHECK (product_cost >= 0),
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled')),
    source TEXT NOT NULL DEFAULT 'messenger'
        CHECK (source IN ('messenger', 'instagram', 'whatsapp', 'phone', 'other')),
    notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
    confirm_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_shop_phone ON orders(shop_id, phone);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own orders" ON orders;
CREATE POLICY "Sellers manage own orders"
    ON orders FOR ALL
    USING (auth.uid() = shop_id)
    WITH CHECK (auth.uid() = shop_id);

-- =============================================================================
-- 4. Buyer history — per-shop delivery record for each phone number
-- =============================================================================
-- security_invoker makes the view obey the caller's RLS on orders,
-- so a seller only ever sees their own customers.
CREATE OR REPLACE VIEW buyer_stats WITH (security_invoker = true) AS
SELECT
    shop_id,
    phone,
    count(*) AS total_orders,
    count(*) FILTER (WHERE status = 'delivered') AS delivered,
    count(*) FILTER (WHERE status = 'returned') AS returned,
    count(*) FILTER (WHERE status = 'cancelled') AS cancelled
FROM orders
GROUP BY shop_id, phone;

-- =============================================================================
-- 5. updated_at maintenance
-- =============================================================================
CREATE OR REPLACE FUNCTION public.commandi_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_touch ON shops;
CREATE TRIGGER shops_touch BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION public.commandi_touch_updated_at();
DROP TRIGGER IF EXISTS products_touch ON products;
CREATE TRIGGER products_touch BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION public.commandi_touch_updated_at();
DROP TRIGGER IF EXISTS orders_touch ON orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION public.commandi_touch_updated_at();

-- Make the new tables visible to the API immediately
NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- Commandi — Shield, store link and stock
-- =============================================================================
-- Migration: 002_shield_store_stock
-- 1. Shield: delivery record of a phone number across ALL shops (counts only)
-- 2. Store link: public order page per shop (/s/<slug>)
-- 3. Stock: optional per-product stock, moved by order status
-- Safe to re-run.
-- =============================================================================

-- =============================================================================
-- 1. Shop and product columns
-- =============================================================================
ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shops_slug_format') THEN
        ALTER TABLE shops ADD CONSTRAINT shops_slug_format
            CHECK (slug IS NULL OR slug ~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug) WHERE slug IS NOT NULL;

-- NULL stock = not tracked (always available)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER CHECK (stock IS NULL OR stock >= -100000);
-- Hidden products stay usable in the dashboard but are not shown on the store link
ALTER TABLE products ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;

-- Orders placed by buyers on the store link
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check
    CHECK (source IN ('messenger', 'instagram', 'whatsapp', 'phone', 'store', 'other'));

-- =============================================================================
-- 2. Shield — how a phone number behaved at OTHER shops
-- =============================================================================
-- Returns counts only: no shop names, customer names or addresses ever leave
-- their shop. Signed-in sellers only, and at most 500 phones per call.
CREATE OR REPLACE FUNCTION public.commandi_shield(p_phones TEXT[])
RETURNS TABLE (phone TEXT, shops BIGINT, delivered BIGINT, returned BIGINT, cancelled BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        o.phone,
        count(DISTINCT o.shop_id) AS shops,
        count(*) FILTER (WHERE o.status = 'delivered') AS delivered,
        count(*) FILTER (WHERE o.status = 'returned') AS returned,
        count(*) FILTER (WHERE o.status = 'cancelled') AS cancelled
    FROM public.orders o
    WHERE auth.uid() IS NOT NULL
      AND cardinality(p_phones) <= 500
      AND o.phone = ANY (p_phones)
      AND o.shop_id <> auth.uid()
    GROUP BY o.phone;
$$;

REVOKE ALL ON FUNCTION public.commandi_shield(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commandi_shield(TEXT[]) TO authenticated;

-- =============================================================================
-- 3. Store link — public read of a shop's catalog
-- =============================================================================
CREATE OR REPLACE FUNCTION public.commandi_store(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'name', s.name,
        'deliveryFee', s.default_delivery_fee,
        'products', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'price', p.price,
                    'inStock', p.stock IS NULL OR p.stock > 0
                )
                ORDER BY p.name
            )
            FROM public.products p
            WHERE p.shop_id = s.id AND p.visible
        ), '[]'::jsonb)
    )
    FROM public.shops s
    WHERE s.slug = lower(p_slug) AND s.store_enabled;
$$;

-- Places an order from the store link. Prices, costs and fees come from the
-- database, never from the buyer. Returns the new order number.
CREATE OR REPLACE FUNCTION public.commandi_place_store_order(
    p_slug TEXT,
    p_customer_name TEXT,
    p_phone TEXT,
    p_governorate TEXT,
    p_address TEXT,
    p_items JSONB,
    p_notes TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_shop public.shops%ROWTYPE;
    v_items JSONB := '[]'::jsonb;
    v_subtotal INTEGER := 0;
    v_cost INTEGER := 0;
    v_line JSONB;
    v_qty INTEGER;
    v_product public.products%ROWTYPE;
    v_number BIGINT;
BEGIN
    SELECT * INTO v_shop FROM public.shops WHERE slug = lower(p_slug) AND store_enabled;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'STORE_NOT_FOUND';
    END IF;

    IF char_length(COALESCE(p_governorate, '')) > 40 THEN
        RAISE EXCEPTION 'INVALID_REQUEST';
    END IF;

    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
        RAISE EXCEPTION 'INVALID_ITEMS';
    END IF;

    -- Anti-spam: at most 5 store orders per phone per shop per hour
    IF (SELECT count(*) FROM public.orders
        WHERE shop_id = v_shop.id AND phone = p_phone AND source = 'store'
          AND created_at > now() - interval '1 hour') >= 5 THEN
        RAISE EXCEPTION 'TOO_MANY_ORDERS';
    END IF;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_line->>'qty')::INTEGER;
        IF v_qty IS NULL OR v_qty NOT BETWEEN 1 AND 20 THEN
            RAISE EXCEPTION 'INVALID_ITEMS';
        END IF;

        SELECT * INTO v_product FROM public.products
        WHERE id = (v_line->>'productId')::UUID AND shop_id = v_shop.id AND visible;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_ITEMS';
        END IF;
        IF v_product.stock IS NOT NULL AND v_product.stock < v_qty THEN
            RAISE EXCEPTION 'OUT_OF_STOCK';
        END IF;

        v_items := v_items || jsonb_build_object(
            'name', v_product.name,
            'qty', v_qty,
            'unitPrice', v_product.price,
            'unitCost', v_product.cost
        );
        v_subtotal := v_subtotal + v_product.price * v_qty;
        v_cost := v_cost + v_product.cost * v_qty;
    END LOOP;

    INSERT INTO public.orders (
        shop_id, customer_name, phone, governorate, address, items,
        subtotal, product_cost, delivery_fee, shipping_cost, source, notes
    )
    VALUES (
        v_shop.id, p_customer_name, p_phone, COALESCE(p_governorate, ''), COALESCE(p_address, ''), v_items,
        v_subtotal, v_cost, v_shop.default_delivery_fee, v_shop.default_shipping_cost, 'store', COALESCE(p_notes, '')
    )
    RETURNING number INTO v_number;

    RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.commandi_store(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commandi_store(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.commandi_place_store_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commandi_place_store_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;

-- =============================================================================
-- 4. Stock — leaves when a parcel ships, comes back if it returns
-- =============================================================================
-- Order items are matched to products by name (case-insensitive), the same
-- way the order form links them. Untracked products (NULL stock) are skipped.
CREATE OR REPLACE FUNCTION public.commandi_move_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_was_out BOOLEAN := OLD.status IN ('shipped', 'delivered');
    v_is_out BOOLEAN := NEW.status IN ('shipped', 'delivered');
    v_sign INTEGER;
BEGIN
    IF v_was_out = v_is_out THEN
        RETURN NEW;
    END IF;
    v_sign := CASE WHEN v_is_out THEN -1 ELSE 1 END;

    UPDATE public.products p
    SET stock = p.stock + v_sign * line.qty
    FROM (
        SELECT lower(trim(i->>'name')) AS name, sum((i->>'qty')::INTEGER) AS qty
        FROM jsonb_array_elements(NEW.items) i
        GROUP BY 1
    ) line
    WHERE p.shop_id = NEW.shop_id
      AND p.stock IS NOT NULL
      AND lower(trim(p.name)) = line.name;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_move_stock ON orders;
CREATE TRIGGER orders_move_stock AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION public.commandi_move_stock();

NOTIFY pgrst, 'reload schema';
