// =============================================================================
// Store Service — the public order page behind a shop's link (/s/<slug>)
// =============================================================================
// Buyers are anonymous, so everything goes through two SECURITY DEFINER
// functions (migration 002) that only expose the visible catalog and compute
// prices server-side.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { GOVERNORATE_KEYS, normalizePhone } from "@/modules/orders/tunisia";

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

export interface Store {
  name: string;
  deliveryFee: number;
  products: StoreProduct[];
}

export const storeOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Invalid Tunisian phone number." });
      return z.NEVER;
    }
    return phone;
  }),
  governorate: z.enum(GOVERNORATE_KEYS as [string, ...string[]]),
  address: z.string().trim().min(3).max(500),
  items: z
    .array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(20) }))
    .min(1)
    .max(20),
  notes: z.string().trim().max(500).default(""),
  /** Honeypot: hidden from people, filled by bots */
  website: z.string().max(0).optional(),
});
export type StoreOrderInput = z.input<typeof storeOrderSchema>;

export async function getStore(supabase: SupabaseClient, slug: string): Promise<Store | null> {
  const { data, error } = await supabase.rpc("commandi_store", { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data as Store | null) ?? null;
}

const STORE_ERRORS: Record<string, [string, number]> = {
  STORE_NOT_FOUND: ["This store is not available.", 404],
  INVALID_ITEMS: ["Some products are no longer available. Refresh the page.", 400],
  OUT_OF_STOCK: ["A product is out of stock. Refresh the page.", 409],
  TOO_MANY_ORDERS: ["Too many orders from this number. Please contact the shop.", 429],
  INVALID_REQUEST: ["Check your details and try again.", 400],
};

/** Returns the new order number. */
export async function placeStoreOrder(supabase: SupabaseClient, slug: string, input: unknown): Promise<number> {
  const order = storeOrderSchema.parse(input);
  const { data, error } = await supabase.rpc("commandi_place_store_order", {
    p_slug: slug,
    p_customer_name: order.customerName,
    p_phone: order.phone,
    p_governorate: order.governorate,
    p_address: order.address,
    p_items: order.items,
    p_notes: order.notes,
  });
  if (error) {
    const known = Object.keys(STORE_ERRORS).find((code) => error.message.includes(code));
    if (known) {
      const [message, status] = STORE_ERRORS[known]!;
      throw new AppError("INVALID_REQUEST", message, status);
    }
    throw new Error(error.message);
  }
  return Number(data);
}
