/**
 * lib/supabase/authStatus.ts
 *
 * Auth state utility for Sovereign OS v4.4.
 *
 * Three modes:
 *   "anonymous-local"      — Supabase not configured; app is fully local
 *   "supabase-auth-ready"  — Supabase configured but user not signed in
 *   "authenticated"        — User is signed in; user_id available
 *
 * IMPORTANT: App remains fully functional in all three modes.
 * localStorage is still the source of truth. Auth only adds user_id
 * to background Supabase writes so data can eventually be scoped per-user.
 *
 * getCachedUserId() — sync accessor used by repositories to stamp user_id
 *                     on Supabase rows without async overhead per-write.
 * initAuthListener() — call once on app mount; keeps the cache updated.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseStatus } from "@/lib/supabase/status";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthStatus {
  supabaseConfigured: boolean;
  authenticated:      boolean;
  userId?:            string;
  email?:             string;
  mode: "anonymous-local" | "supabase-auth-ready" | "authenticated";
}

// ── In-memory user_id cache ────────────────────────────────────────────────
// Populated by initAuthListener() on auth state changes.
// Repositories read this synchronously — no async overhead per-write.

let _cachedUserId: string | null = null;
let _listenerActive = false;

/**
 * getCachedUserId
 * Returns the authenticated user's UUID, or null if not signed in.
 * Used by repository row mappers to stamp user_id on Supabase writes.
 */
export function getCachedUserId(): string | null {
  return _cachedUserId;
}

/**
 * initAuthListener
 * Sets up `onAuthStateChange` so the cache stays current.
 * Safe to call multiple times — only registers once.
 * Call from a "use client" component that mounts early (e.g. layout).
 */
export function initAuthListener(): void {
  if (_listenerActive) return;
  const sb = getSupabaseClient();
  if (!sb) return;

  _listenerActive = true;

  sb.auth.onAuthStateChange((_event, session) => {
    _cachedUserId = session?.user?.id ?? null;
  });

  // Seed cache from current session (resolves async but fires quickly)
  sb.auth.getSession().then(({ data }) => {
    _cachedUserId = data.session?.user?.id ?? null;
  });
}

// ── Auth status (async) ────────────────────────────────────────────────────

/**
 * getAuthStatus
 * Returns a full snapshot of the current auth + Supabase configuration state.
 * Async because it reads the live Supabase session.
 * Use in client components that need the current state on mount.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const { configured } = getSupabaseStatus();

  if (!configured) {
    return {
      supabaseConfigured: false,
      authenticated:      false,
      mode:               "anonymous-local",
    };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return {
      supabaseConfigured: false,
      authenticated:      false,
      mode:               "anonymous-local",
    };
  }

  try {
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;

    if (user) {
      return {
        supabaseConfigured: true,
        authenticated:      true,
        userId:             user.id,
        email:              user.email,
        mode:               "authenticated",
      };
    }

    return {
      supabaseConfigured: true,
      authenticated:      false,
      mode:               "supabase-auth-ready",
    };
  } catch {
    return {
      supabaseConfigured: true,
      authenticated:      false,
      mode:               "supabase-auth-ready",
    };
  }
}

// ── Sign-in / sign-out helpers ─────────────────────────────────────────────

/**
 * sendMagicLink
 * Sends a Supabase magic link to the given email.
 * redirectTo should be your app's /settings URL so the user lands back here.
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string
): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();
  if (!sb) return { error: "Supabase is not configured" };

  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * signOut
 * Signs the current user out and clears the cached user_id.
 */
export async function signOut(): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();
  if (!sb) return { error: "Supabase is not configured" };

  try {
    const { error } = await sb.auth.signOut();
    _cachedUserId = null;
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: String(err) };
  }
}
