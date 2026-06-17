/**
 * lib/supabase/syncHealth.ts
 *
 * Sync health report for Sovereign OS v4.3.
 *
 * Provides:
 *   - Per-module last-sync-result persistence (sovereign_sync_status)
 *   - getSyncHealth() — full report consumed by the Settings Sync Health panel
 *
 * This module intentionally has NO Supabase imports — it only reads localStorage
 * and the Supabase status flag so it can be called freely from client components.
 */

import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";

// ── Types ──────────────────────────────────────────────────────────────────

export type SyncModule =
  | "memory"
  | "projects"
  | "project_tasks"
  | "content"
  | "focus_sessions";

export type SyncResult = "success" | "skipped" | "failed";

export interface SyncStatusEntry {
  module:    SyncModule;
  operation: string;           // "upsert" | "delete"
  timestamp: string;           // ISO-8601
  local:     "success" | "failed";
  supabase:  SyncResult;
  error?:    string;
}

/** sovereign_sync_status shape in localStorage */
type SyncStatusStore = Partial<Record<SyncModule, SyncStatusEntry>>;

// ── Read / Write ────────────────────────────────────────────────────────────

function readStore(): SyncStatusStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS.SYNC_STATUS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SyncStatusStore;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * recordSyncResult
 *
 * Called by repositories after each Supabase write attempt.
 * Persists the most-recent result for the module so the health panel can
 * surface it without doing any Supabase reads.
 *
 * Safe to call from any async context — never throws.
 */
export function recordSyncResult(entry: SyncStatusEntry): void {
  if (typeof window === "undefined") return;
  try {
    const store = readStore();
    store[entry.module] = entry;
    localStorage.setItem(KEYS.SYNC_STATUS, JSON.stringify(store));
  } catch {
    // silently ignore — never interrupt the caller
  }
}

export function getLastSyncResult(module: SyncModule): SyncStatusEntry | undefined {
  return readStore()[module];
}

// ── Local item counts ───────────────────────────────────────────────────────

function countLocal(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// ── Health report ───────────────────────────────────────────────────────────

export interface ModuleHealth {
  module:       SyncModule;
  label:        string;
  table:        string;
  localCount:   number;
  dualWrite:    boolean;     // always true for v4.1+ modules
  lastResult:   SyncStatusEntry | undefined;
  warning?:     string;
}

export interface SyncHealthReport {
  supabaseConfigured: boolean;
  modules:            ModuleHealth[];
  localOnlyModules:   string[];       // keys that exist in localStorage but aren't dual-written
  exportAvailable:    boolean;        // true if any EXPORT_KEY has data
}

const MODULE_DEFS: { module: SyncModule; label: string; table: string; key: string }[] = [
  { module: "memory",         label: "Memory",        table: "memory_items",   key: KEYS.MEMORY_ITEMS },
  { module: "projects",       label: "Projects",      table: "projects",       key: KEYS.PROJECTS },
  { module: "project_tasks",  label: "Project Tasks", table: "project_tasks",  key: KEYS.PROJECT_TASKS },
  { module: "content",        label: "Content",       table: "content_items",  key: KEYS.CONTENT_ITEMS },
  { module: "focus_sessions", label: "Focus Sessions",table: "focus_sessions", key: KEYS.FOCUS_SESSIONS },
];

const LOCAL_ONLY_LABELS: { key: string; label: string }[] = [
  { key: KEYS.HABITS,          label: "Habits" },
  { key: KEYS.HABIT_LOG,       label: "Habit Logs" },
  { key: KEYS.PLANNER_DAILY,   label: "Daily Plan" },
  { key: KEYS.PLANNER_WEEKLY,  label: "Weekly Plan" },
  { key: KEYS.PLANNER_MONTHLY, label: "Monthly Plan" },
  { key: KEYS.PLANNER_1YR,     label: "1-Year Vision" },
  { key: KEYS.PLANNER_3YR,     label: "3-Year Vision" },
  { key: KEYS.PLANNER_5YR,     label: "5-Year Vision" },
];

const EXPORT_KEYS: string[] = [
  KEYS.PROJECTS, KEYS.PROJECT_TASKS, KEYS.MEMORY_ITEMS, KEYS.CONTENT_ITEMS,
  KEYS.FOCUS_SESSIONS, KEYS.HABITS, KEYS.HABIT_LOG,
  KEYS.PLANNER_DAILY, KEYS.PLANNER_WEEKLY, KEYS.PLANNER_MONTHLY,
  KEYS.PLANNER_1YR, KEYS.PLANNER_3YR, KEYS.PLANNER_5YR,
  KEYS.PLANNER_REVIEW, KEYS.NARRATIVES, KEYS.CONTENT_IDEAS, KEYS.BTC_STACK,
  KEYS.NOTE, KEYS.TASKS,
];

export function getSyncHealth(): SyncHealthReport {
  const { configured } = getSupabaseStatus();
  const store = readStore();

  const modules: ModuleHealth[] = MODULE_DEFS.map(({ module, label, table, key }) => {
    const localCount = countLocal(key);
    const lastResult = store[module];

    let warning: string | undefined;
    if (!configured) {
      warning = "Supabase not configured — writes go to localStorage only";
    } else if (lastResult?.supabase === "failed") {
      warning = `Last sync failed: ${lastResult.error ?? "unknown error"}`;
    }

    return { module, label, table, localCount, dualWrite: true, lastResult, warning };
  });

  // Which local-only keys actually have data?
  const localOnlyModules = LOCAL_ONLY_LABELS
    .filter(({ key }) => {
      if (typeof window === "undefined") return false;
      return !!localStorage.getItem(key);
    })
    .map(({ label }) => label);

  // Export is available if any export key has data
  const exportAvailable =
    typeof window !== "undefined" &&
    EXPORT_KEYS.some((k) => !!localStorage.getItem(k));

  return { supabaseConfigured: configured, modules, localOnlyModules, exportAvailable };
}
