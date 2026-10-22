// =============================================================================
// Meta Webhook — Messenger and Instagram messages arrive here
// =============================================================================
// GET:  Meta's one-time subscription check (echoes hub.challenge).
// POST: message events, signed with the app secret (X-Hub-Signature-256).
// =============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging/logger";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (
    verifyToken &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === verifyToken
  ) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** True when the body was signed with our app secret. */
function validSignature(body: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const received = Buffer.from(header.slice("sha256=".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    logger.error("META_APP_SECRET is not set; rejecting webhook");
    return new Response("Not configured", { status: 503 });
  }

  // The signature covers the exact bytes, so read the raw text before parsing
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: { object?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("meta_events")
    .insert({ object: payload.object ?? "unknown", payload });
  if (error) {
    // Still answer 200: Meta retries failed deliveries and eventually disables
    // the webhook, which is worse than losing one event while the DB is down
    logger.error("Failed to store Meta event", { error: error.message });
  }

  return NextResponse.json({ received: true });
}
