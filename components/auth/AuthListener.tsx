"use client";

/**
 * components/auth/AuthListener.tsx
 *
 * Invisible client component that initialises the Supabase auth state
 * listener on app mount (v4.4).
 *
 * Effect:
 *   - Calls initAuthListener() once, which subscribes to onAuthStateChange
 *     and seeds _cachedUserId from the current session.
 *   - After this runs, getCachedUserId() in repositories returns the real
 *     user_id (or null for anonymous users).
 *
 * Renders nothing — purely a side-effect component.
 * Placed in the root layout so it fires on every page.
 */

import { useEffect } from "react";
import { initAuthListener } from "@/lib/supabase/authStatus";

export default function AuthListener() {
  useEffect(() => {
    initAuthListener();
  }, []);

  return null;
}
