"use client";

/**
 * components/settings/FocusCleanupStatus.tsx — Sovereign OS v6.9
 *
 * Shows last focus session cleanup result in settings.
 * Reads from KEYS.FOCUS_CLEANUP_LOG (written by cleanupStaleFocusSessions on startup).
 */

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";
import type { CleanupResult } from "@/lib/focus/cleanup";

export default function FocusCleanupStatus() {
  const [log, setLog] = useState<CleanupResult | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.FOCUS_CLEANUP_LOG);
      if (raw) setLog(JSON.parse(raw) as CleanupResult);
    } catch { /* noop */ }
  }, []);

  if (!log) return null;

  const date = new Date(log.timestamp);
  const label = date.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-xs text-white/40">Last session cleanup</span>
      <span className="text-xs font-mono text-white/35">
        {log.count > 0
          ? `${log.count} closed · ${label}`
          : `0 stale · ${label}`}
      </span>
    </div>
  );
}
