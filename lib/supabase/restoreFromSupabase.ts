/**
 * lib/supabase/restoreFromSupabase.ts
 *
 * Supabase → localStorage Restore Utility — Sovereign OS v4.7
 *
 * Allows an authenticated user to manually pull Supabase data back into
 * localStorage, module by module. Supports two merge strategies.
 *
 * Safety guarantees:
 *   - Requires getCachedUserId() !== null (auth gate)
 *   - A downloadable backup of the current module localStorage is created
 *     before any write
 *   - Each Supabase row is validated before being written
 *   - Malformed rows are skipped and counted, not written
 *   - Supabase data is never deleted or modified
 *   - All other modules are completely untouched
 *   - Never auto-runs — explicit confirmation required by caller
 *
 * Restore modes:
 *   replace_local_module — discard current local array, write Supabase rows
 *   merge_by_id          — merge Supabase rows into local; newer updated_at wins
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { getCachedUserId }   from "@/lib/supabase/authStatus";
import { KEYS }              from "@/lib/keys";

import type { MemoryItem }   from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem }  from "@/lib/types/content";
import type { FocusSession } from "@/lib/types/execution";

// ── Supported modules ──────────────────────────────────────────────────────

export type RestoreModule =
  | "memory"
  | "projects"
  | "project_tasks"
  | "content"
  | "focus_sessions";

export type RestoreMode = "replace_local_module" | "merge_by_id";

// ── Preview types ──────────────────────────────────────────────────────────

export interface RestoreModulePreview {
  module:         RestoreModule;
  label:          string;
  localKey:       string;
  localCount:     number;
  supabaseCount:  number | null;
  latestRecords:  Array<{ id: string; title: string; updatedAt: string }>;
  error?:         string;
}

export interface RestorePreview {
  fetchedAt:      string;
  userId:         string;
  modules:        RestoreModulePreview[];
}

// ── Result types ───────────────────────────────────────────────────────────

export interface RestoreResult {
  module:            RestoreModule;
  label:             string;
  mode:              RestoreMode;
  fetchedFromSupabase: number;
  validRows:         number;
  invalidRows:       number;
  itemsWritten:      number;
  itemsMergedNew:    number;    // merge_by_id: new items added
  itemsMergedUpdated: number;   // merge_by_id: local items replaced by newer Supabase version
  itemsMergedKept:   number;    // merge_by_id: local items kept (newer or same)
  errors:            string[];
}

// ── Module metadata ────────────────────────────────────────────────────────

const MODULE_META: Record<RestoreModule, { label: string; table: string; key: string }> = {
  memory:         { label: "Memory Items",   table: "memory_items",   key: KEYS.MEMORY_ITEMS },
  projects:       { label: "Projects",       table: "projects",       key: KEYS.PROJECTS },
  project_tasks:  { label: "Project Tasks",  table: "project_tasks",  key: KEYS.PROJECT_TASKS },
  content:        { label: "Content Items",  table: "content_items",  key: KEYS.CONTENT_ITEMS },
  focus_sessions: { label: "Focus Sessions", table: "focus_sessions", key: KEYS.FOCUS_SESSIONS },
};

export const RESTORE_MODULES: RestoreModule[] = [
  "memory", "projects", "project_tasks", "content", "focus_sessions",
];

// ── localStorage helpers ───────────────────────────────────────────────────

function readLocalArray(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalArray(key: string, items: unknown[]): "success" | "failed" {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return "success";
  } catch {
    return "failed";
  }
}

// ── Backup helper ──────────────────────────────────────────────────────────

/**
 * backupLocalModule
 * Downloads the current localStorage value for the module as a JSON file.
 * Called before any write. Returns false if nothing to back up (empty module).
 */
export function backupLocalModule(module: RestoreModule): boolean {
  const { label, key } = MODULE_META[module];
  const current = readLocalArray(key);
  if (current.length === 0) return false;

  const payload = { module, label, backedUpAt: new Date().toISOString(), data: current };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `sovereign-restore-backup-${module}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

// ── Row → local type converters ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

// ── Memory ──

function rowToMemoryItem(row: AnyRow): MemoryItem | null {
  if (!isNonEmptyString(row.id) || !isNonEmptyString(row.title)) return null;
  return {
    id:                row.id,
    title:             row.title,
    content:           typeof row.content === "string" ? row.content : "",
    type:              row.type ?? "Note",
    importance:        row.importance ?? "Medium",
    source:            row.source ?? "Imported",
    tags:              Array.isArray(row.tags) ? row.tags : [],
    relatedProjectIds: Array.isArray(row.related_project_ids) ? row.related_project_ids : [],
    relatedPeople:     Array.isArray(row.related_people) ? row.related_people : [],
    createdAt:         row.created_at ?? new Date().toISOString(),
    updatedAt:         row.updated_at ?? new Date().toISOString(),
  };
}

// ── Projects ──

function rowToProject(row: AnyRow): Project | null {
  if (!isNonEmptyString(row.id) || !isNonEmptyString(row.title)) return null;
  return {
    id:          row.id,
    title:       row.title,
    status:      row.status       ?? "Active",
    category:    row.category     ?? "Other",
    priority:    row.priority     ?? "Medium",
    description: row.description  ?? "",
    objective:   row.objective    ?? "",
    next_action: row.next_action  ?? "",
    due_date:    row.due_date     ?? "",
    links:       Array.isArray(row.links) ? row.links : [],
    notes:       row.notes        ?? "",
    created_at:  row.created_at   ?? new Date().toISOString(),
    updated_at:  row.updated_at   ?? new Date().toISOString(),
  };
}

// ── Project Tasks ──

function rowToProjectTask(row: AnyRow): ProjectTask | null {
  if (!isNonEmptyString(row.id) || !isNonEmptyString(row.project_id)) return null;
  return {
    id:         row.id,
    project_id: row.project_id,
    title:      row.title      ?? "",
    status:     row.status     ?? "Todo",
    priority:   row.priority   ?? "Medium",
    due_date:   row.due_date   ?? "",
    notes:      row.notes      ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

// ── Content ──

function rowToContentItem(row: AnyRow): ContentItem | null {
  if (!isNonEmptyString(row.id) || !isNonEmptyString(row.title)) return null;
  return {
    id:                 row.id,
    title:              row.title,
    status:             row.status      ?? "Idea",
    platforms:          Array.isArray(row.platforms) ? row.platforms : [],
    priority:           row.priority    ?? "Medium",
    format:             row.format      ?? "Other",
    description:        row.description ?? "",
    notes:              row.notes       ?? "",
    related_project_id: row.related_project_id ?? "",
    publish_date:       row.publish_date ?? "",
    created_at:         row.created_at  ?? new Date().toISOString(),
    updated_at:         row.updated_at  ?? new Date().toISOString(),
  };
}

// ── Focus Sessions ──

function rowToFocusSession(row: AnyRow): FocusSession | null {
  if (!isNonEmptyString(row.id) || !isNonEmptyString(row.started_at)) return null;
  return {
    id:               row.id,
    title:            row.title          ?? "",
    sourceType:       row.source_type    ?? "Custom",
    sourceId:         row.source_id      ?? undefined,
    projectId:        row.project_id     ?? undefined,
    startedAt:        row.started_at,
    endedAt:          row.ended_at       ?? undefined,
    plannedMinutes:   row.planned_minutes ?? 25,
    actualMinutes:    row.actual_minutes  ?? undefined,
    status:           row.status         ?? "Completed",
    notes:            row.notes          ?? undefined,
    completedSummary: row.completed_summary ?? undefined,
    blockers:         row.blockers       ?? undefined,
    nextAction:       row.next_action    ?? undefined,
    savedToMemory:    row.saved_to_memory ?? false,
  };
}

// ── Convert Supabase rows → local items ───────────────────────────────────

function convertRows(
  module: RestoreModule,
  rows: AnyRow[]
): { valid: unknown[]; invalidCount: number } {
  let invalidCount = 0;
  const valid: unknown[] = [];

  for (const row of rows) {
    let converted: unknown = null;
    switch (module) {
      case "memory":         converted = rowToMemoryItem(row);    break;
      case "projects":       converted = rowToProject(row);       break;
      case "project_tasks":  converted = rowToProjectTask(row);   break;
      case "content":        converted = rowToContentItem(row);   break;
      case "focus_sessions": converted = rowToFocusSession(row);  break;
    }
    if (converted) {
      valid.push(converted);
    } else {
      invalidCount++;
    }
  }

  return { valid, invalidCount };
}

// ── previewSupabaseRestore ─────────────────────────────────────────────────

/**
 * Fetches counts and latest 5 records from each module in Supabase,
 * plus current local counts. Used to show the user what a restore would
 * bring in before they commit to it. No writes anywhere.
 */
export async function previewSupabaseRestore(): Promise<
  { ok: false; error: string } | { ok: true; data: RestorePreview }
> {
  const userId = getCachedUserId();
  if (!userId) {
    return { ok: false, error: "Not authenticated. Sign in before using restore." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const fetchedAt = new Date().toISOString();
  const modules: RestoreModulePreview[] = [];

  for (const mod of RESTORE_MODULES) {
    const { label, table, key } = MODULE_META[mod];
    const localCount = readLocalArray(key).length;

    const { count, error: countErr } = await sb
      .from(table)
      .select("id", { count: "exact", head: true });

    if (countErr) {
      modules.push({ module: mod, label, localKey: key, localCount, supabaseCount: null, latestRecords: [], error: countErr.message });
      continue;
    }

    const { data: rows, error: rowsErr } = await sb
      .from(table)
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    const latestRecords = rowsErr
      ? []
      : (rows ?? []).map((r: { id: string; title: string; updated_at: string }) => ({
          id: r.id, title: r.title || "(no title)", updatedAt: r.updated_at,
        }));

    modules.push({
      module: mod, label, localKey: key,
      localCount, supabaseCount: count ?? 0,
      latestRecords, error: rowsErr?.message,
    });
  }

  return { ok: true, data: { fetchedAt, userId, modules } };
}

// ── restoreModuleFromSupabase ──────────────────────────────────────────────

/**
 * Fetches ALL rows from one Supabase table, converts them to local format,
 * and writes them to localStorage using the specified mode.
 *
 * Always backs up current localStorage value before writing.
 * Returns a detailed result — never throws.
 *
 * NOTE: Fetches up to 1000 rows. This is sufficient for personal use.
 * If you have >1000 rows, run migration in batches.
 */
export async function restoreModuleFromSupabase(
  module: RestoreModule,
  options: { mode: RestoreMode }
): Promise<{ ok: false; error: string } | { ok: true; result: RestoreResult }> {
  const userId = getCachedUserId();
  if (!userId) {
    return { ok: false, error: "Not authenticated." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { label, table, key } = MODULE_META[module];
  const { mode } = options;

  // 1. Fetch all rows from Supabase (up to 1000)
  const { data: rows, error: fetchErr } = await sb
    .from(table)
    .select("*")
    .limit(1000);

  if (fetchErr) {
    return { ok: false, error: `Supabase fetch failed: ${fetchErr.message}` };
  }

  const fetchedFromSupabase = (rows ?? []).length;

  // 2. Convert and validate rows
  const { valid: supabaseItems, invalidCount } = convertRows(module, rows ?? []);
  const errors: string[] = invalidCount > 0
    ? [`${invalidCount} row(s) skipped — failed validation`]
    : [];

  // 3. Backup current localStorage before writing
  backupLocalModule(module);

  // 4. Apply mode
  let itemsWritten = 0;
  let itemsMergedNew = 0;
  let itemsMergedUpdated = 0;
  let itemsMergedKept = 0;

  if (mode === "replace_local_module") {
    const writeResult = writeLocalArray(key, supabaseItems);
    if (writeResult === "failed") {
      return { ok: false, error: "localStorage write failed." };
    }
    itemsWritten = supabaseItems.length;

  } else {
    // merge_by_id — last-write-wins by updated_at
    const localItems = readLocalArray(key) as Array<{ id: string; updated_at?: string; updatedAt?: string }>;
    const localMap = new Map(localItems.map((item) => [item.id, item]));

    const supabaseTyped = supabaseItems as Array<{
      id: string;
      updated_at?: string;
      updatedAt?: string;
      [k: string]: unknown;
    }>;

    for (const sbItem of supabaseTyped) {
      const local = localMap.get(sbItem.id);
      if (!local) {
        // New item from Supabase — add it
        localMap.set(sbItem.id, sbItem);
        itemsMergedNew++;
      } else {
        // Both exist — compare updated_at; keep newer
        const sbTs  = sbItem.updated_at  ?? sbItem.updatedAt  ?? "";
        const lcTs  = local.updated_at   ?? local.updatedAt   ?? "";
        if (sbTs > lcTs) {
          localMap.set(sbItem.id, sbItem);
          itemsMergedUpdated++;
        } else {
          itemsMergedKept++;
        }
      }
    }

    const merged = Array.from(localMap.values());
    const writeResult = writeLocalArray(key, merged);
    if (writeResult === "failed") {
      return { ok: false, error: "localStorage write failed." };
    }
    itemsWritten = merged.length;
  }

  return {
    ok: true,
    result: {
      module, label, mode,
      fetchedFromSupabase,
      validRows: supabaseItems.length,
      invalidRows: invalidCount,
      itemsWritten,
      itemsMergedNew,
      itemsMergedUpdated,
      itemsMergedKept,
      errors,
    },
  };
}
