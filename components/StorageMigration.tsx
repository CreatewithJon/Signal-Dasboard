"use client";

/**
 * StorageMigration — runs the signal_* → sovereign_* migration once on first mount.
 *
 * Must be rendered inside a Client Component boundary (it is one).
 * Renders nothing to the DOM. Place it high in the tree (root layout) so it
 * runs before any panel reads from localStorage.
 */

import { useEffect } from "react";
import { runStorageMigration } from "@/lib/migration";

export default function StorageMigration() {
  useEffect(() => {
    // Runs exactly once per browser session. The migration utility itself
    // checks the sentinel key so subsequent calls are instant no-ops.
    runStorageMigration();
  }, []);

  return null;
}
