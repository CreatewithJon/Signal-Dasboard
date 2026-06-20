/**
 * lib/focus/cleanup.ts — Sovereign OS v6.9
 *
 * Cleans up stale "Active" focus sessions on app startup.
 * A session is stale if its status is "Active" and startedAt is older than 24 hours.
 * Stale sessions are marked "Abandoned" with an auto-close note.
 */

import { KEYS } from "@/lib/keys";
import type { FocusSession } from "@/lib/types/execution";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CleanupResult {
  count:     number;   // number of sessions closed
  timestamp: string;   // ISO timestamp of when cleanup ran
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

/**
 * Find and close stale Active sessions.
 * Returns the number of sessions that were updated.
 */
export function cleanupStaleFocusSessions(): CleanupResult {
  const now       = Date.now();
  const nowISO    = new Date(now).toISOString();
  const sessions  = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);

  let count = 0;
  const updated = sessions.map((session) => {
    if (session.status !== "Active") return session;

    const startedMs = session.startedAt ? new Date(session.startedAt).getTime() : 0;
    if (isNaN(startedMs) || now - startedMs < STALE_THRESHOLD_MS) return session;

    count++;
    return {
      ...session,
      status:       "Abandoned" as const,
      endedAt:      nowISO,
      actualMinutes: Math.round((now - startedMs) / 60_000),
      notes:        session.notes
        ? `${session.notes}\n\nAuto-closed after 24h of inactivity.`
        : "Auto-closed after 24h of inactivity.",
    };
  });

  if (count > 0) {
    safeWrite(KEYS.FOCUS_SESSIONS, updated);
  }

  const result: CleanupResult = { count, timestamp: nowISO };
  safeWrite(KEYS.FOCUS_CLEANUP_LOG, result);

  return result;
}
