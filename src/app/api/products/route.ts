import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { createProduct, listProducts } from "@/modules/orders/order-service";

export async function GET() {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    return NextResponse.json({ success: true, data: await listProducts(supabase) });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/products");
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const data = await createProduct(supabase, user.id, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "POST /api/products");
  }
}
