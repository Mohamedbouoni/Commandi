import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { deleteOrder, idSchema, updateOrder } from "@/modules/orders/order-service";

type Params = { params: Promise<{ id: string }> };

// Both handlers run as the seller: RLS hides other shops' orders, which
// surfaces here as "not found".
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const id = idSchema.parse((await params).id);
    const data = await updateOrder(supabase, id, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "PATCH /api/orders/[id]");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    await deleteOrder(supabase, idSchema.parse((await params).id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleApiError(err, "DELETE /api/orders/[id]");
  }
}
