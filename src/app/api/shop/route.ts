import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { getShop, updateShop } from "@/modules/orders/order-service";

export async function GET() {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    return NextResponse.json({ success: true, data: await getShop(supabase, user.id) });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/shop");
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const data = await updateShop(supabase, user.id, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "PATCH /api/shop");
  }
}
