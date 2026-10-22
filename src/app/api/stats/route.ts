import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, handleApiError, unauthenticated } from "@/lib/api";
import { getStats } from "@/modules/orders/order-service";

const querySchema = z.object({ from: z.iso.datetime({ offset: true }) });

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSession();
    if (!user) return unauthenticated();

    const { from } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const data = await getStats(supabase, from);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "GET /api/stats");
  }
}
