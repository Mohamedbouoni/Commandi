import { z } from "zod";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { listOrders } from "@/modules/orders/order-service";
import { ORDER_STATUSES } from "@/modules/orders/schemas";

const filtersSchema = z.object({ status: z.enum(ORDER_STATUSES).optional() });

function cell(value: string | number): string {
  const text = String(value);
  // Defuse spreadsheet formulas (=, +, -, @) and quote everything
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV for delivery companies and Excel (UTF-8 BOM so Excel shows Arabic). */
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const { status } = filtersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const orders = await listOrders(supabase, { status, limit: 1000 });

    const header = [
      "Order",
      "Date",
      "Customer",
      "Phone",
      "Governorate",
      "Address",
      "Items",
      "COD amount (TND)",
      "Status",
      "Notes",
    ];
    const lines = orders.map((o) =>
      [
        o.number,
        o.createdAt.slice(0, 10),
        o.customerName,
        o.phone,
        o.governorate,
        o.address,
        o.items.map((i) => `${i.qty} x ${i.name}`).join(" + "),
        ((o.subtotal + o.deliveryFee) / 1000).toFixed(3),
        o.status,
        o.notes,
      ]
        .map(cell)
        .join(",")
    );

    const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/orders/export");
  }
}
