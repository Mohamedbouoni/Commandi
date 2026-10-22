// =============================================================================
// Order Schemas — request validation and shared row types
// =============================================================================
// All money values are integer millimes (1 TND = 1000 millimes).
// =============================================================================

import { z } from "zod";
import { GOVERNORATE_KEYS, normalizePhone } from "./tunisia";

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SOURCES = ["messenger", "instagram", "whatsapp", "phone", "store", "other"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

const millimes = z.number().int().min(0).max(100_000_000);

export const orderItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1).max(999),
  unitPrice: millimes,
  unitCost: millimes.default(0),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

const phoneSchema = z
  .string()
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Invalid Tunisian phone number." });
      return z.NEVER;
    }
    return phone;
  });

// No defaults here: a partial update must leave fields it does not send untouched
const orderFields = {
  customerName: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  governorate: z.union([z.enum(GOVERNORATE_KEYS as [string, ...string[]]), z.literal("")]),
  address: z.string().trim().max(500),
  items: z.array(orderItemSchema).min(1).max(50),
  deliveryFee: millimes,
  shippingCost: millimes,
  source: z.enum(ORDER_SOURCES),
  notes: z.string().trim().max(1000),
};

export const orderInputSchema = z.object({
  ...orderFields,
  governorate: orderFields.governorate.default(""),
  address: orderFields.address.default(""),
  source: orderFields.source.default("messenger"),
  notes: orderFields.notes.default(""),
});
export type OrderInput = z.input<typeof orderInputSchema>;

export const orderUpdateSchema = z.object(orderFields).partial().extend({
  status: z.enum(ORDER_STATUSES).optional(),
  /** Set when the seller opens the WhatsApp confirmation */
  confirmSent: z.literal(true).optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: millimes,
  cost: millimes,
  // No defaults: Zod applies them even under .partial(), which would reset
  // these on every price edit. The service fills them in on create.
  /** null = stock not tracked */
  stock: z.number().int().min(-100_000).max(1_000_000).nullable().optional(),
  visible: z.boolean().optional(),
});

/** Lowercase letters, digits and inner dashes, 3–40 chars: "boutique-yasmine" */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use 3–40 letters, numbers or dashes.");

export const shopUpdateSchema = z.object({
  name: z.string().trim().max(120).optional(),
  defaultDeliveryFee: millimes.optional(),
  defaultShippingCost: millimes.optional(),
  confirmTemplate: z.string().trim().max(1000).nullable().optional(),
  slug: slugSchema.nullable().optional(),
  storeEnabled: z.boolean().optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(ORDER_STATUSES),
});

// ---------------------------------------------------------------------------
// Row types returned by the API
// ---------------------------------------------------------------------------

/** The same phone's record at other shops (Commandi Shield) — counts only. */
export interface ShieldHistory {
  shops: number;
  delivered: number;
  returned: number;
  cancelled: number;
}

export interface BuyerHistory {
  totalOrders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  network: ShieldHistory;
}

export interface Order {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  shippingCost: number;
  productCost: number;
  status: OrderStatus;
  source: OrderSource;
  notes: string;
  confirmSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** This phone's past orders at this shop (including this one) */
  buyer: BuyerHistory;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number | null;
  visible: boolean;
}

export interface Shop {
  name: string;
  defaultDeliveryFee: number;
  defaultShippingCost: number;
  confirmTemplate: string | null;
  slug: string | null;
  storeEnabled: boolean;
}

export type BuyerRisk = "new" | "trusted" | "risky";

/**
 * Risky once a buyer refused or cancelled at least one parcel and has at least
 * as many failures as deliveries — counting this shop and the Shield together.
 */
export function buyerRisk(buyer: BuyerHistory): BuyerRisk {
  const failed = buyer.returned + buyer.cancelled + shieldFailed(buyer.network);
  const delivered = buyer.delivered + buyer.network.delivered;
  if (failed > 0 && failed >= delivered) return "risky";
  if (delivered > 0) return "trusted";
  return "new";
}

/** Only refused parcels count from other shops: a cancel there may be their own choice. */
export function shieldFailed(network: ShieldHistory): number {
  return network.returned;
}
