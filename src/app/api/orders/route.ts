import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { createOrder, listOrders } from "@/modules/orders/order-service";
import { ORDER_STATUSES } from "@/modules/orders/schemas";

const filtersSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const params = Object.fromEntries(new URL(request.url).searchParams);
    const data = await listOrders(supabase, filtersSchema.parse(params));
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/orders");
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const data = await createOrder(supabase, user.id, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "POST /api/orders");
  }
}
