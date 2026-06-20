/**
 * lib/types/workspace.ts — Sovereign OS v6.7
 *
 * Workspace schema. A workspace is a named context for organizing data.
 * The Personal workspace is the default and always exists.
 *
 * Data filtering (scoping content/projects/etc. to a workspace) is NOT active yet.
 * This type is the foundation for that future capability.
 */

export type WorkspaceType =
  | "Personal"
  | "Company"
  | "Project"
  | "Client"
  | "Community"
  | "Education";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  description: string;
  color: string;         // hex accent color, e.g. "#8b5cf6"
  archived: boolean;
  created_at: string;    // ISO timestamp
  updated_at: string;
}

// ── Default workspace ─────────────────────────────────────────────────────────

export const DEFAULT_WORKSPACE: Workspace = {
  id:          "personal",
  name:        "Personal",
  type:        "Personal",
  description: "Your personal Sovereign OS — projects, goals, habits, and focus.",
  color:       "#8b5cf6",
  archived:    false,
  created_at:  "2026-01-01T00:00:00.000Z",
  updated_at:  "2026-01-01T00:00:00.000Z",
};

// ── Preset colors ─────────────────────────────────────────────────────────────

export const WORKSPACE_COLORS: { label: string; value: string }[] = [
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Indigo",  value: "#6366f1" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Slate",   value: "#64748b" },
];

// ── Type labels ───────────────────────────────────────────────────────────────

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  Personal:    "Personal",
  Company:     "Company / Brand",
  Project:     "Project",
  Client:      "Client",
  Community:   "Community",
  Education:   "Education",
};
