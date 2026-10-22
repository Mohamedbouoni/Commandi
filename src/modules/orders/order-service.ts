// =============================================================================
// Order Service — database access for shops, products and orders
// =============================================================================
// Every function takes the request's Supabase client, so queries run as the
// seller and RLS limits them to their own shop.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import {
  orderInputSchema,
  orderUpdateSchema,
  productInputSchema,
  shopUpdateSchema,
  type BuyerHistory,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
  type Shop,
} from "./schemas";

interface OrderRow {
  id: string;
  number: number;
  customer_name: string;
  phone: string;
  governorate: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  shipping_cost: number;
  product_cost: number;
  status: OrderStatus;
  source: Order["source"];
  notes: string;
  confirm_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BuyerStatsRow {
  phone: string;
  total_orders: number;
  delivered: number;
  returned: number;
  cancelled: number;
}

const ORDER_COLUMNS =
  "id, number, customer_name, phone, governorate, address, items, subtotal, delivery_fee, shipping_cost, product_cost, status, source, notes, confirm_sent_at, created_at, updated_at";

const EMPTY_HISTORY: BuyerHistory = { totalOrders: 0, delivered: 0, returned: 0, cancelled: 0 };

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function toOrder(row: OrderRow, buyer: BuyerHistory = EMPTY_HISTORY): Order {
  return {
    id: row.id,
    number: row.number,
    customerName: row.customer_name,
    phone: row.phone,
    governorate: row.governorate,
    address: row.address,
    items: row.items,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    shippingCost: row.shipping_cost,
    productCost: row.product_cost,
    status: row.status,
    source: row.source,
    notes: row.notes,
    confirmSentAt: row.confirm_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyer,
  };
}

async function buyerHistories(
  supabase: SupabaseClient,
  phones: string[]
): Promise<Map<string, BuyerHistory>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return new Map();
  const rows = check(
    await supabase
      .from("buyer_stats")
      .select("phone, total_orders, delivered, returned, cancelled")
      .in("phone", unique)
  ) as BuyerStatsRow[];
  return new Map(
    rows.map((r) => [
      r.phone,
      {
        totalOrders: Number(r.total_orders),
        delivered: Number(r.delivered),
        returned: Number(r.returned),
        cancelled: Number(r.cancelled),
      },
    ])
  );
}

function totals(items: OrderItem[]) {
  return {
    subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    product_cost: items.reduce((sum, item) => sum + item.unitCost * item.qty, 0),
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderFilters {
  status?: OrderStatus;
  /** Matches name, phone or order number */
  q?: string;
  from?: string;
  limit?: number;
}

export async function listOrders(supabase: SupabaseClient, filters: OrderFilters = {}): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 300, 1000));

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);

  const q = filters.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    // Strip characters PostgREST's or() syntax treats specially
    const safe = q.replace(/[,()*%\\]/g, " ").trim();
    const parts = [`customer_name.ilike.*${safe}*`];
    if (digits.length >= 2) parts.push(`phone.like.*${digits}*`);
    if (/^#?\d{1,12}$/.test(q)) parts.push(`number.eq.${digits}`);
    query = query.or(parts.join(","));
  }

  const rows = check(await query) as OrderRow[];
  const histories = await buyerHistories(supabase, rows.map((r) => r.phone));
  return rows.map((row) => toOrder(row, histories.get(row.phone)));
}

export async function createOrder(
  supabase: SupabaseClient,
  shopId: string,
  input: unknown
): Promise<Order> {
  const order = orderInputSchema.parse(input);
  const row = check(
    await supabase
      .from("orders")
      .insert({
        shop_id: shopId,
        customer_name: order.customerName,
        phone: order.phone,
        governorate: order.governorate,
        address: order.address,
        items: order.items,
        ...totals(order.items),
        delivery_fee: order.deliveryFee,
        shipping_cost: order.shippingCost,
        source: order.source,
        notes: order.notes,
      })
      .select(ORDER_COLUMNS)
      .single()
  ) as OrderRow;

  const histories = await buyerHistories(supabase, [row.phone]);
  return toOrder(row, histories.get(row.phone));
}

export async function updateOrder(supabase: SupabaseClient, id: string, input: unknown): Promise<Order> {
  const changes = orderUpdateSchema.parse(input);
  const patch: Record<string, unknown> = {};

  if (changes.customerName !== undefined) patch.customer_name = changes.customerName;
  if (changes.phone !== undefined) patch.phone = changes.phone;
  if (changes.governorate !== undefined) patch.governorate = changes.governorate;
  if (changes.address !== undefined) patch.address = changes.address;
  if (changes.items !== undefined) Object.assign(patch, { items: changes.items }, totals(changes.items));
  if (changes.deliveryFee !== undefined) patch.delivery_fee = changes.deliveryFee;
  if (changes.shippingCost !== undefined) patch.shipping_cost = changes.shippingCost;
  if (changes.source !== undefined) patch.source = changes.source;
  if (changes.notes !== undefined) patch.notes = changes.notes;
  if (changes.status !== undefined) patch.status = changes.status;
  if (changes.confirmSent) patch.confirm_sent_at = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    throw new AppError("INVALID_REQUEST", "Nothing to update.", 400);
  }

  const row = check(
    await supabase.from("orders").update(patch).eq("id", id).select(ORDER_COLUMNS).maybeSingle()
  ) as OrderRow | null;
  if (!row) throw new AppError("NOT_FOUND", "Order not found.", 404);

  const histories = await buyerHistories(supabase, [row.phone]);
  return toOrder(row, histories.get(row.phone));
}

export async function deleteOrder(supabase: SupabaseClient, id: string): Promise<void> {
  const rows = check(await supabase.from("orders").delete().eq("id", id).select("id"));
  if (!rows || rows.length === 0) throw new AppError("NOT_FOUND", "Order not found.", 404);
}

/** Past orders for a phone, so the form can warn before saving. */
export async function getBuyerHistory(supabase: SupabaseClient, phone: string): Promise<BuyerHistory> {
  const histories = await buyerHistories(supabase, [phone]);
  return histories.get(phone) ?? EMPTY_HISTORY;
}

// ---------------------------------------------------------------------------
// Stats — profit for a period
// ---------------------------------------------------------------------------

export interface OrderStats {
  counts: Record<OrderStatus, number>;
  total: number;
  /** returned / (delivered + returned), 0–1 */
  returnRate: number;
  /** Cash collected on delivered orders (items + delivery fee) */
  revenue: number;
  productCost: number;
  /** Delivery company fees on delivered AND returned parcels */
  shippingCost: number;
  /** Shipping fees lost on returned parcels (part of shippingCost) */
  returnLoss: number;
  profit: number;
  daily: { date: string; orders: number; delivered: number }[];
}

export async function getStats(supabase: SupabaseClient, from: string): Promise<OrderStats> {
  const rows = check(
    await supabase
      .from("orders")
      .select("status, subtotal, delivery_fee, shipping_cost, product_cost, created_at")
      .gte("created_at", from)
      .limit(10000)
  ) as Pick<OrderRow, "status" | "subtotal" | "delivery_fee" | "shipping_cost" | "product_cost" | "created_at">[];

  const counts = { new: 0, confirmed: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0 };
  let revenue = 0;
  let productCost = 0;
  let shippingCost = 0;
  let returnLoss = 0;
  const byDay = new Map<string, { orders: number; delivered: number }>();

  for (const row of rows) {
    counts[row.status]++;
    const day = row.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { orders: 0, delivered: 0 };
    entry.orders++;
    if (row.status === "delivered") {
      entry.delivered++;
      revenue += row.subtotal + row.delivery_fee;
      productCost += row.product_cost;
      shippingCost += row.shipping_cost;
    } else if (row.status === "returned") {
      // The product comes back, but the delivery company still bills the trip
      shippingCost += row.shipping_cost;
      returnLoss += row.shipping_cost;
    }
    byDay.set(day, entry);
  }

  const finished = counts.delivered + counts.returned;
  return {
    counts,
    total: rows.length,
    returnRate: finished === 0 ? 0 : counts.returned / finished,
    revenue,
    productCost,
    shippingCost,
    returnLoss,
    profit: revenue - productCost - shippingCost,
    daily: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts(supabase: SupabaseClient): Promise<Product[]> {
  return check(
    await supabase.from("products").select("id, name, price, cost").order("name").limit(500)
  ) as Product[];
}

export async function createProduct(supabase: SupabaseClient, shopId: string, input: unknown): Promise<Product> {
  const product = productInputSchema.parse(input);
  return check(
    await supabase
      .from("products")
      .insert({ shop_id: shopId, ...product })
      .select("id, name, price, cost")
      .single()
  ) as Product;
}

export async function updateProduct(supabase: SupabaseClient, id: string, input: unknown): Promise<Product> {
  const changes = productInputSchema.partial().parse(input);
  const row = check(
    await supabase.from("products").update(changes).eq("id", id).select("id, name, price, cost").maybeSingle()
  ) as Product | null;
  if (!row) throw new AppError("NOT_FOUND", "Product not found.", 404);
  return row;
}

export async function deleteProduct(supabase: SupabaseClient, id: string): Promise<void> {
  const rows = check(await supabase.from("products").delete().eq("id", id).select("id"));
  if (!rows || rows.length === 0) throw new AppError("NOT_FOUND", "Product not found.", 404);
}

// ---------------------------------------------------------------------------
// Shop settings
// ---------------------------------------------------------------------------

interface ShopRow {
  name: string;
  default_delivery_fee: number;
  default_shipping_cost: number;
  confirm_template: string | null;
}

function toShop(row: ShopRow): Shop {
  return {
    name: row.name,
    defaultDeliveryFee: row.default_delivery_fee,
    defaultShippingCost: row.default_shipping_cost,
    confirmTemplate: row.confirm_template,
  };
}

const SHOP_COLUMNS = "name, default_delivery_fee, default_shipping_cost, confirm_template";

export async function getShop(supabase: SupabaseClient, shopId: string): Promise<Shop> {
  const row = check(
    await supabase.from("shops").select(SHOP_COLUMNS).eq("id", shopId).maybeSingle()
  ) as ShopRow | null;
  // The sign-up trigger creates the row; fall back to defaults if it is missing
  return row
    ? toShop(row)
    : { name: "", defaultDeliveryFee: 7000, defaultShippingCost: 7000, confirmTemplate: null };
}

export async function updateShop(supabase: SupabaseClient, shopId: string, input: unknown): Promise<Shop> {
  const changes = shopUpdateSchema.parse(input);
  const patch: Partial<ShopRow> = {};
  if (changes.name !== undefined) patch.name = changes.name;
  if (changes.defaultDeliveryFee !== undefined) patch.default_delivery_fee = changes.defaultDeliveryFee;
  if (changes.defaultShippingCost !== undefined) patch.default_shipping_cost = changes.defaultShippingCost;
  if (changes.confirmTemplate !== undefined) patch.confirm_template = changes.confirmTemplate || null;

  const row = check(
    await supabase.from("shops").upsert({ id: shopId, ...patch }).select(SHOP_COLUMNS).single()
  ) as ShopRow;
  return toShop(row);
}

export const idSchema = z.string().uuid();
