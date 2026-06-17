/**
 * lib/repositories/focusSessionRepository.ts
 *
 * Dual-write repository for FocusSessions — v4.2
 *
 * Strategy (identical to memoryRepository):
 *   1. Write to localStorage first (always)
 *   2. If Supabase is configured, upsert in background
 *   3. Supabase failures caught and returned — never thrown into UI
 *
 * Reads: NOT implemented here — components read from localStorage directly.
 * Session lifecycle: create → update → complete/abandon all map to upsert.
 */

import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/supabase/syncHealth";
import type { FocusSession } from "@/lib/types/execution";

// ── Result type ────────────────────────────────────────────────────────────

export interface DualWriteResult {
  local:    "success" | "failed";
  supabase: "success" | "skipped" | "failed";
  error?:   string;
}

// ── localStorage helpers ───────────────────────────────────────────────────

export function getFocusSessionsLocal(): FocusSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.FOCUS_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FocusSession[]) : [];
  } catch {
    return [];
  }
}

export function saveFocusSessionLocal(session: FocusSession): "success" | "failed" {
  try {
    const existing = getFocusSessionsLocal();
    const idx = existing.findIndex((s) => s.id === session.id);
    const next =
      idx === -1
        ? [...existing, session]  // new session — append (chronological order)
        : existing.map((s) => (s.id === session.id ? session : s));
    localStorage.setItem(KEYS.FOCUS_SESSIONS, JSON.stringify(next));
    return "success";
  } catch {
    return "failed";
  }
}

// ── Supabase row mapper ────────────────────────────────────────────────────

interface FocusSessionRow {
  id:                string;
  user_id:           null;
  title:             string;
  source_type:       string;
  source_id:         string | null;
  project_id:        string | null;
  started_at:        string;
  ended_at:          string | null;
  planned_minutes:   number;
  actual_minutes:    number | null;
  status:            string;
  notes:             string | null;
  completed_summary: string | null;
  blockers:          string | null;
  next_action:       string | null;
  saved_to_memory:   boolean;
  metadata:          Record<string, unknown>;
  created_at:        string;
  updated_at:        string;
}

function toFocusSessionRow(s: FocusSession): FocusSessionRow {
  const now = new Date().toISOString();
  return {
    id:                s.id,
    user_id:           null,
    title:             s.title,
    source_type:       s.sourceType,
    source_id:         s.sourceId ?? null,
    project_id:        s.projectId ?? null,
    started_at:        s.startedAt,
    ended_at:          s.endedAt ?? null,
    planned_minutes:   s.plannedMinutes,
    actual_minutes:    s.actualMinutes ?? null,
    status:            s.status,
    notes:             s.notes ?? null,
    completed_summary: s.completedSummary ?? null,
    blockers:          s.blockers ?? null,
    next_action:       s.nextAction ?? null,
    saved_to_memory:   s.savedToMemory,
    metadata:          {},
    created_at:        s.startedAt, // use startedAt as creation time
    updated_at:        now,
  };
}

// ── Supabase write helpers ─────────────────────────────────────────────────

export async function upsertFocusSessionSupabase(
  session: FocusSession
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb
      .from("focus_sessions")
      .upsert(toFocusSessionRow(session), { onConflict: "id" });
    const result = error ? "failed" : "success";
    if (error) console.warn("[focusSessionRepository] Supabase upsert error:", error.message);
    recordSyncResult({
      module: "focus_sessions", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[focusSessionRepository] Supabase upsert threw:", err);
    recordSyncResult({
      module: "focus_sessions", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

// ── Dual-write function ────────────────────────────────────────────────────

export async function saveFocusSessionDual(
  session: FocusSession
): Promise<DualWriteResult> {
  const local    = saveFocusSessionLocal(session);
  const supabase = await upsertFocusSessionSupabase(session);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage write failed"
      : supabase === "failed" ? "Supabase sync failed — saved locally"
      : undefined,
  };
}
