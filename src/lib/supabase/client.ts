// =============================================================================
// Supabase Browser Client
// =============================================================================
// Use this in Client Components (anything with "use client").
// Creates a singleton Supabase client for the browser.
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, anonKey);
}
