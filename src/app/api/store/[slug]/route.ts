import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { placeStoreOrder } from "@/modules/store/store-service";

type Params = { params: Promise<{ slug: string }> };

/** Public: a buyer places an order from the shop's store link. */
export async function POST(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const number = await placeStoreOrder(supabase, (await params).slug, await request.json().catch(() => ({})));
    return NextResponse.json({ success: true, data: { number } }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "POST /api/store/[slug]");
  }
}
