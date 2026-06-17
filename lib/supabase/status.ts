/**
 * lib/supabase/status.ts
 *
 * Runtime readiness check for Supabase configuration.
 * Safe to call from client or server components.
 *
 * v4.0: Detection only. No reads or writes yet.
 */

export interface SupabaseStatus {
  configured:    boolean;
  urlPresent:    boolean;
  anonKeyPresent: boolean;
  mode:          "local-only" | "supabase-ready";
}

export function getSupabaseStatus(): SupabaseStatus {
  const urlPresent    = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKeyPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured    = urlPresent && anonKeyPresent;

  return {
    configured,
    urlPresent,
    anonKeyPresent,
    mode: configured ? "supabase-ready" : "local-only",
  };
}
