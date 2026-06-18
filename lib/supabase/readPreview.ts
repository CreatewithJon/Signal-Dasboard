/**
 * lib/supabase/readPreview.ts
 *
 * Supabase Read Preview — Sovereign OS v4.6
 *
 * READ-ONLY inspection utility. Fetches counts and latest records from
 * Supabase so the user can verify what was written after dual-write or
 * migration. Does NOT make Supabase the source of truth. No writes.
 *
 * Requires an authenticated user so reads are scoped to meaningful data.
 * Without RLS (live in v4.7+) all table rows are returned — that's
 * expected and noted in the UI.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { getCachedUserId }   from "@/lib/supabase/authStatus";
import { getMemoryItemsLocal }                         from "@/lib/repositories/memoryRepository";
import { getProjectsLocal, getProjectTasksLocal }      from "@/lib/repositories/projectRepository";
import { getContentItemsLocal }                        from "@/lib/repositories/contentRepository";
import { getFocusSessionsLocal }                       from "@/lib/repositories/focusSessionRepository";

// ── Types ──────────────────────────────────────────────────────────────────

/** Minimal fields shown in the latest-records preview */
export interface PreviewRecord {
  id:        string;
  title:     string;
  updatedAt: string;
}

export interface ModulePreview {
  module:         string;
  label:          string;
  table:          string;
  localCount:     number;
  supabaseCount:  number | null;  // null when query errored
  difference:     number | null;  // localCount - supabaseCount; null on error
  latestRecords:  PreviewRecord[];
  error?:         string;
}

export interface SupabasePreviewResult {
  fetchedAt:      string;
  userId:         string;
  modules:        ModulePreview[];
  totalLocal:     number;
  totalSupabase:  number | null;
  totalDifference: number | null;
}

// ── Module definitions ─────────────────────────────────────────────────────

const MODULE_DEFS = [
  { module: "memory",         label: "Memory Items",   table: "memory_items"   },
  { module: "projects",       label: "Projects",       table: "projects"       },
  { module: "project_tasks",  label: "Project Tasks",  table: "project_tasks"  },
  { module: "content",        label: "Content Items",  table: "content_items"  },
  { module: "focus_sessions", label: "Focus Sessions", table: "focus_sessions" },
] as const;

function getLocalCount(module: string): number {
  switch (module) {
    case "memory":         return getMemoryItemsLocal().length;
    case "projects":       return getProjectsLocal().length;
    case "project_tasks":  return getProjectTasksLocal().length;
    case "content":        return getContentItemsLocal().length;
    case "focus_sessions": return getFocusSessionsLocal().length;
    default:               return 0;
  }
}

// ── Main fetch ─────────────────────────────────────────────────────────────

/**
 * fetchSupabasePreview
 *
 * Fetches counts and latest 5 records from each of the 5 core tables.
 * Also reads local counts for comparison.
 *
 * Returns an error string if Supabase is unconfigured or user is not
 * authenticated. Per-module errors are non-fatal and surfaced inline.
 */
export async function fetchSupabasePreview(): Promise<
  { ok: false; error: string } | { ok: true; data: SupabasePreviewResult }
> {
  const userId = getCachedUserId();
  if (!userId) {
    return { ok: false, error: "Not authenticated. Sign in to inspect Supabase data." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const fetchedAt = new Date().toISOString();
  const modules: ModulePreview[] = [];

  for (const def of MODULE_DEFS) {
    const localCount = getLocalCount(def.module);

    // Count query
    const { count, error: countErr } = await sb
      .from(def.table)
      .select("id", { count: "exact", head: true });

    if (countErr) {
      modules.push({
        module:        def.module,
        label:         def.label,
        table:         def.table,
        localCount,
        supabaseCount: null,
        difference:    null,
        latestRecords: [],
        error:         countErr.message,
      });
      continue;
    }

    const supabaseCount = count ?? 0;

    // Latest 5 records — minimal fields; all tables have title + updated_at
    const { data: rows, error: rowsErr } = await sb
      .from(def.table)
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    const latestRecords: PreviewRecord[] = rowsErr
      ? []
      : (rows ?? []).map((r: { id: string; title: string; updated_at: string }) => ({
          id:        r.id,
          title:     r.title,
          updatedAt: r.updated_at,
        }));

    modules.push({
      module:        def.module,
      label:         def.label,
      table:         def.table,
      localCount,
      supabaseCount,
      difference:    localCount - supabaseCount,
      latestRecords,
      error:         rowsErr?.message,
    });
  }

  const totalLocal     = modules.reduce((s, m) => s + m.localCount, 0);
  const totalSupabase  = modules.every((m) => m.supabaseCount !== null)
    ? modules.reduce((s, m) => s + (m.supabaseCount ?? 0), 0)
    : null;
  const totalDifference = totalSupabase !== null ? totalLocal - totalSupabase : null;

  return {
    ok: true,
    data: { fetchedAt, userId, modules, totalLocal, totalSupabase, totalDifference },
  };
}
