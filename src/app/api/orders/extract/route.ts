import { NextResponse } from "next/server";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { extractOrder, extractRequestSchema } from "@/modules/orders/extract-service";
import { getBuyerHistory, listProducts } from "@/modules/orders/order-service";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const { chat } = extractRequestSchema.parse(await request.json().catch(() => ({})));
    const draft = await extractOrder(chat, await listProducts(supabase));
    const buyer = draft.phoneValid ? await getBuyerHistory(supabase, draft.phone) : null;

    return NextResponse.json({ success: true, data: { ...draft, buyer } });
  } catch (err: unknown) {
    return handleApiError(err, "POST /api/orders/extract");
  }
}
