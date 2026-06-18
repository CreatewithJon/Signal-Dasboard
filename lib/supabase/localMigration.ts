/**
 * lib/supabase/localMigration.ts
 *
 * Local → Supabase Migration Assistant — Sovereign OS v4.5
 *
 * Two-phase flow:
 *   1. analyzeLocalDataForMigration() — dry run; reads localStorage, counts
 *      eligible items, surfaces warnings. No writes anywhere.
 *   2. migrateLocalDataToSupabase() — requires authenticated user; upserts
 *      each item via existing repository functions; continues on failure;
 *      returns per-module result detail.
 *
 * Safety guarantees:
 *   - localStorage is NEVER modified (no deletes, no overwrites)
 *   - All upserts use the item's existing id → idempotent; safe to re-run
 *   - Requires getCachedUserId() !== null (i.e. user must be signed in)
 *   - Individual item failures do not abort the migration
 */

import { getCachedUserId } from "@/lib/supabase/authStatus";
import { getMemoryItemsLocal }    from "@/lib/repositories/memoryRepository";
import { getProjectsLocal, getProjectTasksLocal } from "@/lib/repositories/projectRepository";
import { getContentItemsLocal }   from "@/lib/repositories/contentRepository";
import { getFocusSessionsLocal }  from "@/lib/repositories/focusSessionRepository";
import { upsertMemoryItemSupabase }    from "@/lib/repositories/memoryRepository";
import { upsertProjectSupabase, upsertProjectTaskSupabase } from "@/lib/repositories/projectRepository";
import { upsertContentItemSupabase }   from "@/lib/repositories/contentRepository";
import { upsertFocusSessionSupabase }  from "@/lib/repositories/focusSessionRepository";

// ── Analysis types ─────────────────────────────────────────────────────────

export interface ModuleAnalysis {
  module:               string;
  label:                string;
  localCount:           number;
  eligibleCount:        number;
  skippedCount:         number;
  warnings:             string[];
  estimatedOperations:  number;
}

export interface MigrationAnalysis {
  authenticated:   boolean;
  userId:          string | null;
  modules:         ModuleAnalysis[];
  totalLocal:      number;
  totalEligible:   number;
  totalSkipped:    number;
  globalWarnings:  string[];
}

// ── Result types ───────────────────────────────────────────────────────────

export interface ModuleMigrationResult {
  module:    string;
  label:     string;
  attempted: number;
  succeeded: number;
  failed:    number;
  errors:    string[];
}

export interface MigrationResult {
  userId:         string;
  startedAt:      string;
  completedAt:    string;
  modules:        ModuleMigrationResult[];
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed:    number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hasValidId(item: unknown): item is { id: string } {
  return (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof (item as Record<string, unknown>).id === "string" &&
    (item as Record<string, unknown>).id !== ""
  );
}

// ── analyzeLocalDataForMigration ───────────────────────────────────────────

/**
 * Dry-run analysis.
 * Reads localStorage and returns what would be migrated — no Supabase calls.
 * Safe to call at any time; does not require authentication.
 */
export function analyzeLocalDataForMigration(): MigrationAnalysis {
  const userId = getCachedUserId();
  const authenticated = userId !== null;
  const globalWarnings: string[] = [];

  if (!authenticated) {
    globalWarnings.push("You must be signed in to migrate data.");
  }

  // ── Memory ──
  const memoryItems = getMemoryItemsLocal();
  const memoryEligible = memoryItems.filter(hasValidId);
  const memorySkipped  = memoryItems.length - memoryEligible.length;
  const memoryWarnings: string[] = [];
  if (memorySkipped > 0) memoryWarnings.push(`${memorySkipped} item(s) skipped — missing id`);

  // ── Projects ──
  const projects = getProjectsLocal();
  const projectsEligible = projects.filter(hasValidId);
  const projectsSkipped  = projects.length - projectsEligible.length;
  const projectsWarnings: string[] = [];
  if (projectsSkipped > 0) projectsWarnings.push(`${projectsSkipped} project(s) skipped — missing id`);

  // ── Project Tasks ──
  const tasks = getProjectTasksLocal();
  const tasksEligible = tasks.filter(
    (t) => hasValidId(t) && typeof t.project_id === "string" && t.project_id !== ""
  );
  const tasksSkipped = tasks.length - tasksEligible.length;
  const tasksWarnings: string[] = [];
  if (tasksSkipped > 0) tasksWarnings.push(`${tasksSkipped} task(s) skipped — missing id or project_id`);

  // ── Content ──
  const contentItems = getContentItemsLocal();
  const contentEligible = contentItems.filter(hasValidId);
  const contentSkipped  = contentItems.length - contentEligible.length;
  const contentWarnings: string[] = [];
  if (contentSkipped > 0) contentWarnings.push(`${contentSkipped} content item(s) skipped — missing id`);

  // ── Focus Sessions ──
  const sessions = getFocusSessionsLocal();
  const sessionsEligible = sessions.filter(hasValidId);
  const sessionsSkipped  = sessions.length - sessionsEligible.length;
  const sessionsWarnings: string[] = [];
  if (sessionsSkipped > 0) sessionsWarnings.push(`${sessionsSkipped} session(s) skipped — missing id`);

  const modules: ModuleAnalysis[] = [
    {
      module: "memory",         label: "Memory Items",
      localCount: memoryItems.length,  eligibleCount: memoryEligible.length,
      skippedCount: memorySkipped,     warnings: memoryWarnings,
      estimatedOperations: memoryEligible.length,
    },
    {
      module: "projects",       label: "Projects",
      localCount: projects.length,     eligibleCount: projectsEligible.length,
      skippedCount: projectsSkipped,   warnings: projectsWarnings,
      estimatedOperations: projectsEligible.length,
    },
    {
      module: "project_tasks",  label: "Project Tasks",
      localCount: tasks.length,        eligibleCount: tasksEligible.length,
      skippedCount: tasksSkipped,      warnings: tasksWarnings,
      estimatedOperations: tasksEligible.length,
    },
    {
      module: "content",        label: "Content Items",
      localCount: contentItems.length, eligibleCount: contentEligible.length,
      skippedCount: contentSkipped,    warnings: contentWarnings,
      estimatedOperations: contentEligible.length,
    },
    {
      module: "focus_sessions", label: "Focus Sessions",
      localCount: sessions.length,     eligibleCount: sessionsEligible.length,
      skippedCount: sessionsSkipped,   warnings: sessionsWarnings,
      estimatedOperations: sessionsEligible.length,
    },
  ];

  const totalLocal    = modules.reduce((s, m) => s + m.localCount,    0);
  const totalEligible = modules.reduce((s, m) => s + m.eligibleCount, 0);
  const totalSkipped  = modules.reduce((s, m) => s + m.skippedCount,  0);

  if (totalEligible === 0 && totalLocal === 0) {
    globalWarnings.push("No local data found in any module.");
  }

  return { authenticated, userId, modules, totalLocal, totalEligible, totalSkipped, globalWarnings };
}

// ── migrateLocalDataToSupabase ─────────────────────────────────────────────

/**
 * Runs the actual migration.
 * Requires authenticated user (getCachedUserId() !== null).
 * Upserts every eligible item via the existing Supabase upsert functions.
 * Uses item's existing id — safe to run multiple times (idempotent).
 * Continues past individual item failures.
 * Does NOT touch localStorage at any point.
 */
export async function migrateLocalDataToSupabase(): Promise<
  { ok: false; error: string } | { ok: true; result: MigrationResult }
> {
  const userId = getCachedUserId();
  if (!userId) {
    return { ok: false, error: "Not authenticated. Sign in before running migration." };
  }

  const startedAt = new Date().toISOString();
  const moduleResults: ModuleMigrationResult[] = [];

  // ── Memory ──
  {
    const items = getMemoryItemsLocal().filter(hasValidId);
    const errors: string[] = [];
    let succeeded = 0;

    for (const item of items) {
      const r = await upsertMemoryItemSupabase(item);
      if (r === "success") {
        succeeded++;
      } else if (r === "failed") {
        errors.push(`id:${item.id.slice(0, 8)} — upsert failed`);
      }
      // "skipped" = Supabase not configured; shouldn't happen here but is non-fatal
    }
    moduleResults.push({
      module: "memory", label: "Memory Items",
      attempted: items.length, succeeded, failed: errors.length, errors,
    });
  }

  // ── Projects ──
  {
    const items = getProjectsLocal().filter(hasValidId);
    const errors: string[] = [];
    let succeeded = 0;

    for (const item of items) {
      const r = await upsertProjectSupabase(item);
      if (r === "success") succeeded++;
      else if (r === "failed") errors.push(`id:${item.id.slice(0, 8)} — upsert failed`);
    }
    moduleResults.push({
      module: "projects", label: "Projects",
      attempted: items.length, succeeded, failed: errors.length, errors,
    });
  }

  // ── Project Tasks ──
  {
    const items = getProjectTasksLocal().filter(
      (t) => hasValidId(t) && typeof t.project_id === "string" && t.project_id !== ""
    );
    const errors: string[] = [];
    let succeeded = 0;

    for (const item of items) {
      const r = await upsertProjectTaskSupabase(item);
      if (r === "success") succeeded++;
      else if (r === "failed") errors.push(`id:${item.id.slice(0, 8)} — upsert failed`);
    }
    moduleResults.push({
      module: "project_tasks", label: "Project Tasks",
      attempted: items.length, succeeded, failed: errors.length, errors,
    });
  }

  // ── Content ──
  {
    const items = getContentItemsLocal().filter(hasValidId);
    const errors: string[] = [];
    let succeeded = 0;

    for (const item of items) {
      const r = await upsertContentItemSupabase(item);
      if (r === "success") succeeded++;
      else if (r === "failed") errors.push(`id:${item.id.slice(0, 8)} — upsert failed`);
    }
    moduleResults.push({
      module: "content", label: "Content Items",
      attempted: items.length, succeeded, failed: errors.length, errors,
    });
  }

  // ── Focus Sessions ──
  {
    const items = getFocusSessionsLocal().filter(hasValidId);
    const errors: string[] = [];
    let succeeded = 0;

    for (const item of items) {
      const r = await upsertFocusSessionSupabase(item);
      if (r === "success") succeeded++;
      else if (r === "failed") errors.push(`id:${item.id.slice(0, 8)} — upsert failed`);
    }
    moduleResults.push({
      module: "focus_sessions", label: "Focus Sessions",
      attempted: items.length, succeeded, failed: errors.length, errors,
    });
  }

  const completedAt    = new Date().toISOString();
  const totalAttempted = moduleResults.reduce((s, m) => s + m.attempted,  0);
  const totalSucceeded = moduleResults.reduce((s, m) => s + m.succeeded,  0);
  const totalFailed    = moduleResults.reduce((s, m) => s + m.failed,     0);

  return {
    ok: true,
    result: { userId, startedAt, completedAt, modules: moduleResults, totalAttempted, totalSucceeded, totalFailed },
  };
}
