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
