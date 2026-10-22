import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { getBuyerHistory } from "@/modules/orders/order-service";
import { normalizePhone } from "@/modules/orders/tunisia";

/** History for a phone typed into the order form, before the order exists. */
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const phone = normalizePhone(new URL(request.url).searchParams.get("phone") ?? "");
    const data = phone ? await getBuyerHistory(supabase, phone) : null;
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/orders/buyer");
  }
}
