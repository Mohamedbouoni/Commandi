// =============================================================================
// Order UI helpers — status styles, money inputs, WhatsApp message
// =============================================================================

import type { TranslationData } from "@/lib/i18n/translations";
import type { Order, OrderStatus } from "@/modules/orders/schemas";
import { fmt } from "@/lib/i18n/format";
import { governorateLabel } from "@/modules/orders/tunisia";

export const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  shipped: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  delivered: "bg-positive-soft text-positive",
  returned: "bg-negative-soft text-negative",
  cancelled: "bg-muted text-muted-foreground",
};

/** The next step for each status, shown as the primary action on an order card. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function statusLabel(status: OrderStatus, t: TranslationData): string {
  return t.status[status] ?? status;
}

/** 45500 -> "45.5" for an editable input */
export function millimesToInput(millimes: number): string {
  return String(millimes / 1000);
}

/** "45,5" / "45.500" -> 45500; empty or invalid -> 0 */
export function inputToMillimes(value: string): number {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : 0;
}

/** 45500 -> "45.5" (no trailing zeros), for display next to the currency label */
export function dinars(millimes: number): string {
  const amount = millimes / 1000;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(3).replace(/0+$/, "");
}

// Customer-facing, so it stays in Tunisian Arabic whatever the UI language
export const DEFAULT_CONFIRM_TEMPLATE =
  "مرحبا {name} 👋\nمعاك {shop}. نأكدو طلبك رقم {number}:\n{items}\nالمجموع: {total} د.ت (بالتوصيل) إلى {governorate}.\nابعث 1 للتأكيد ✅ ولا 2 للإلغاء.";

export function confirmMessage(
  order: Pick<Order, "customerName" | "number" | "items" | "subtotal" | "deliveryFee" | "governorate" | "address">,
  shopName: string,
  template: string | null
): string {
  return fmt(template || DEFAULT_CONFIRM_TEMPLATE, {
    name: order.customerName,
    number: order.number,
    items: order.items.map((i) => `• ${i.qty} × ${i.name}`).join("\n"),
    total: dinars(order.subtotal + order.deliveryFee),
    governorate: governorateLabel(order.governorate, "ar") || order.address,
    address: order.address,
    shop: shopName || "المتجر",
  });
}
