/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client for Sovereign OS.
 *
 * Returns null when env vars are absent so the app continues working
 * in localStorage-only mode without throwing at module load time.
 *
 * Usage:
 *   import { getSupabaseClient } from "@/lib/supabase/client";
 *   const sb = getSupabaseClient();
 *   if (!sb) { // fall back to localStorage
 *   }
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  // Singleton — reuse the same client instance across renders
  if (!_client) {
    _client = createClient(url, key, {
      auth: {
        // v4.4: enable session persistence + URL detection for magic link auth
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
      },
    });
  }

  return _client;
}

/** Convenience: returns true when Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
