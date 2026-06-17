/**
 * lib/repositories/projectRepository.ts
 *
 * Dual-write repository for Projects and ProjectTasks — v4.2
 *
 * Strategy (identical to memoryRepository):
 *   1. Write to localStorage first (always)
 *   2. If Supabase is configured, upsert in background
 *   3. Supabase failures caught and returned — never thrown into UI
 *   4. Returns DualWriteResult so callers can show appropriate status
 *
 * Reads: NOT implemented here — components read from localStorage directly.
 * Reordering: NOT synced to Supabase — no order field in schema.
 */

import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/supabase/syncHealth";
import { getCachedUserId } from "@/lib/supabase/authStatus";
import type { Project, ProjectTask } from "@/lib/types/projects";

// ── Result type ────────────────────────────────────────────────────────────

export interface DualWriteResult {
  local:    "success" | "failed";
  supabase: "success" | "skipped" | "failed";
  error?:   string;
}

// ── Project localStorage helpers ───────────────────────────────────────────

export function getProjectsLocal(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.PROJECTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectLocal(project: Project): "success" | "failed" {
  try {
    const existing = getProjectsLocal();
    const idx = existing.findIndex((p) => p.id === project.id);
    const next =
      idx === -1
        ? [project, ...existing]
        : existing.map((p) => (p.id === project.id ? project : p));
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(next));
    return "success";
  } catch {
    return "failed";
  }
}

export function deleteProjectLocal(id: string): "success" | "failed" {
  try {
    const existing = getProjectsLocal();
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(existing.filter((p) => p.id !== id)));
    return "success";
  } catch {
    return "failed";
  }
}

// ── ProjectTask localStorage helpers ──────────────────────────────────────

export function getProjectTasksLocal(): ProjectTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.PROJECT_TASKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectTask[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectTaskLocal(task: ProjectTask): "success" | "failed" {
  try {
    const existing = getProjectTasksLocal();
    const idx = existing.findIndex((t) => t.id === task.id);
    const next =
      idx === -1
        ? [task, ...existing]
        : existing.map((t) => (t.id === task.id ? task : t));
    localStorage.setItem(KEYS.PROJECT_TASKS, JSON.stringify(next));
    return "success";
  } catch {
    return "failed";
  }
}

/** Write the full tasks array — used for reorders (no Supabase sync). */
export function saveProjectTasksLocal(tasks: ProjectTask[]): "success" | "failed" {
  try {
    localStorage.setItem(KEYS.PROJECT_TASKS, JSON.stringify(tasks));
    return "success";
  } catch {
    return "failed";
  }
}

export function deleteProjectTaskLocal(id: string): "success" | "failed" {
  try {
    const existing = getProjectTasksLocal();
    localStorage.setItem(
      KEYS.PROJECT_TASKS,
      JSON.stringify(existing.filter((t) => t.id !== id))
    );
    return "success";
  } catch {
    return "failed";
  }
}

// ── Supabase row mappers ───────────────────────────────────────────────────

interface ProjectRow {
  id:          string;
  user_id:     string | null;
  title:       string;
  status:      string;
  category:    string;
  priority:    string;
  description: string;
  objective:   string;
  next_action: string;
  due_date:    string;
  links:       string[];
  notes:       string;
  metadata:    Record<string, unknown>;
  created_at:  string;
  updated_at:  string;
}

function toProjectRow(p: Project): ProjectRow {
  return {
    id:          p.id,
    user_id:     getCachedUserId(),
    title:       p.title,
    status:      p.status,
    category:    p.category,
    priority:    p.priority,
    description: p.description,
    objective:   p.objective,
    next_action: p.next_action,
    due_date:    p.due_date,
    links:       p.links,
    notes:       p.notes,
    metadata:    {},
    created_at:  p.created_at,
    updated_at:  p.updated_at,
  };
}

interface ProjectTaskRow {
  id:         string;
  user_id:    string | null;
  project_id: string;
  title:      string;
  status:     string;
  priority:   string;
  due_date:   string;
  notes:      string;
  metadata:   Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function toProjectTaskRow(t: ProjectTask): ProjectTaskRow {
  return {
    id:         t.id,
    user_id:    getCachedUserId(),
    project_id: t.project_id,
    title:      t.title,
    status:     t.status,
    priority:   t.priority,
    due_date:   t.due_date,
    notes:      t.notes,
    metadata:   {},
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

// ── Supabase write helpers ─────────────────────────────────────────────────

export async function upsertProjectSupabase(
  project: Project
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb
      .from("projects")
      .upsert(toProjectRow(project), { onConflict: "id" });
    const result = error ? "failed" : "success";
    if (error) console.warn("[projectRepository] Supabase project upsert error:", error.message);
    recordSyncResult({
      module: "projects", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[projectRepository] Supabase project upsert threw:", err);
    recordSyncResult({
      module: "projects", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

export async function deleteProjectSupabase(
  id: string
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb.from("projects").delete().eq("id", id);
    const result = error ? "failed" : "success";
    if (error) console.warn("[projectRepository] Supabase project delete error:", error.message);
    recordSyncResult({
      module: "projects", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[projectRepository] Supabase project delete threw:", err);
    recordSyncResult({
      module: "projects", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

export async function upsertProjectTaskSupabase(
  task: ProjectTask
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb
      .from("project_tasks")
      .upsert(toProjectTaskRow(task), { onConflict: "id" });
    const result = error ? "failed" : "success";
    if (error) console.warn("[projectRepository] Supabase task upsert error:", error.message);
    recordSyncResult({
      module: "project_tasks", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[projectRepository] Supabase task upsert threw:", err);
    recordSyncResult({
      module: "project_tasks", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

export async function deleteProjectTaskSupabase(
  id: string
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb.from("project_tasks").delete().eq("id", id);
    const result = error ? "failed" : "success";
    if (error) console.warn("[projectRepository] Supabase task delete error:", error.message);
    recordSyncResult({
      module: "project_tasks", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[projectRepository] Supabase task delete threw:", err);
    recordSyncResult({
      module: "project_tasks", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

// ── Dual-write functions ───────────────────────────────────────────────────

export async function saveProjectDual(project: Project): Promise<DualWriteResult> {
  const local    = saveProjectLocal(project);
  const supabase = await upsertProjectSupabase(project);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage write failed"
      : supabase === "failed" ? "Supabase sync failed — saved locally"
      : undefined,
  };
}

export async function deleteProjectDual(id: string): Promise<DualWriteResult> {
  const local    = deleteProjectLocal(id);
  const supabase = await deleteProjectSupabase(id);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage delete failed"
      : supabase === "failed" ? "Supabase delete failed — removed locally"
      : undefined,
  };
}

export async function saveProjectTaskDual(task: ProjectTask): Promise<DualWriteResult> {
  const local    = saveProjectTaskLocal(task);
  const supabase = await upsertProjectTaskSupabase(task);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage write failed"
      : supabase === "failed" ? "Supabase sync failed — saved locally"
      : undefined,
  };
}

export async function deleteProjectTaskDual(id: string): Promise<DualWriteResult> {
  const local    = deleteProjectTaskLocal(id);
  const supabase = await deleteProjectTaskSupabase(id);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage delete failed"
      : supabase === "failed" ? "Supabase delete failed — removed locally"
      : undefined,
  };
}
