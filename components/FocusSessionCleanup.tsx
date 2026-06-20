"use client";

/**
 * components/FocusSessionCleanup.tsx — Sovereign OS v6.9
 *
 * Invisible component mounted in the root layout.
 * Runs cleanupStaleFocusSessions() once on app startup (client-side mount).
 * No UI. Silent on 0 closures.
 */

import { useEffect } from "react";
import { cleanupStaleFocusSessions } from "@/lib/focus/cleanup";

export default function FocusSessionCleanup() {
  useEffect(() => {
    cleanupStaleFocusSessions();
  }, []);

  return null;
}
