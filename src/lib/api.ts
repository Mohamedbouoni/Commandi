// =============================================================================
// Route Handler Helpers
// =============================================================================

import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";

/** Returns the verified session user, or null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The request's Supabase client plus its verified user. Queries made with this
 * client run as the user, so RLS scopes them to their own shop.
 */
export async function getSession(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function unauthenticated() {
  return NextResponse.json(
    { success: false, code: "UNAUTHENTICATED", error: "Authentication required." },
    { status: 401 }
  );
}

/**
 * Recognizes failures caused by an incomplete installation rather than a bug,
 * so the UI can say exactly what to fix instead of "something went wrong".
 */
function setupProblem(message: string): string | null {
  if (/Could not find the (table|function)|schema cache|relation .* does not exist/i.test(message)) {
    return "The database is not set up yet. Run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor.";
  }
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local (Supabase → Project Settings → API).";
  }
  if (message.includes("No AI provider is configured")) {
    return "No AI provider is configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env.local.";
  }
  if (message.includes("Ollama is not reachable")) {
    return "AI_PROVIDER=ollama is set but Ollama is not running. Start Ollama or remove AI_PROVIDER from .env.local.";
  }
  return null;
}

/**
 * Maps thrown errors to JSON responses. Unexpected failures (provider, DB)
 * are logged in full but never echoed, since they may carry upstream details.
 */
export function handleApiError(err: unknown, route: string) {
  // Let Next.js handle its own control-flow errors (prerender bail-outs from
  // cookies()/request.url, redirect(), notFound()) instead of turning them into 500s
  unstable_rethrow(err);

  if (err instanceof ZodError) {
    return NextResponse.json(
      { success: false, code: "INVALID_REQUEST", error: "Invalid request.", issues: err.issues },
      { status: 400 }
    );
  }

  if (err instanceof AppError) {
    return NextResponse.json(
      { success: false, code: err.code, error: err.message },
      { status: err.status }
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error(`API ${route} error`, { error: message });

  const setup = setupProblem(message);
  if (setup) {
    return NextResponse.json(
      { success: false, code: "SETUP_REQUIRED", error: setup },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { success: false, error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
