import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { bulkUpdateStatus } from "@/modules/orders/order-service";

/** Sets one status on many orders at once. */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const updated = await bulkUpdateStatus(supabase, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data: { updated } });
  } catch (err: unknown) {
    return handleApiError(err, "POST /api/orders/bulk");
  }
}
