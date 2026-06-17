/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client for use in Next.js Route Handlers and
 * Server Components. Created inside the request scope (never at module level)
 * to avoid env-var-absent crashes at build time.
 *
 * Usage (Route Handler or Server Component):
 *   import { getSupabaseServer } from "@/lib/supabase/server";
 *   const sb = getSupabaseServer();
 *   if (!sb) return Response.json({ error: "Supabase not configured" }, { status: 503 });
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServer(): SupabaseClient | null {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  // Always create a fresh client per request on the server
  return createClient(url, key, {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false,
    },
  });
}
