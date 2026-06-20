/**
 * lib/systemHealth/engine.ts — Sovereign OS v7.6
 *
 * System Health & Observability engine.
 * Pure function — accepts pre-loaded data, returns a full SystemHealthReport.
 *
 * Caller responsibilities:
 *   - Read all data from localStorage before calling
 *   - Resolve Supabase + auth status
 *   - Run computeWorkspaceAnalytics() and pass the result in
 */

import type { SyncHealthReport } from "@/lib/supabase/syncHealth";
import type { WorkspaceAnalytics } from "@/lib/workspaces/analytics";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";

// ── Output types ──────────────────────────────────────────────────────────────

export type HealthStatus   = "Healthy" | "Warning" | "Critical";
export type WarningSeverity = "Critical" | "High" | "Medium";

export interface SystemWarning {
  severity: WarningSeverity;
  message:  string;
  category: string;
}

export interface StorageHealth {
  localStorageEnabled:   boolean;
  localItemCount:        number;
  supabaseConfigured:    boolean;
  supabaseAuthenticated: boolean;
  readMode:              "local-only" | "supabase-ready" | "authenticated";
  lastSyncResults: Array<{
    module:     string;
    result:     "success" | "skipped" | "failed" | "never";
    timestamp?: string;
    error?:     string;
  }>;
  failedWrites: number;
  fallbackMode: boolean;
}

export interface AIHealth {
  anthropicConfigured:  boolean;
  chatAvailable:        boolean;
  openaiConfigured:     boolean;
  embeddingsAvailable:  boolean;
  vectorMode:           "none" | "planned" | "active";
  vectorDbReady:        boolean;
  semanticSearchActive: boolean;
}

export interface DataHealth {
  projects:      number;
  tasks:         number;
  memories:      number;
  relationships: number;
  opportunities: number;
  content:       number;
  focusSessions: number;
  total:         number;
}

export interface WarningCounts {
  critical: number;
  high:     number;
  medium:   number;
  total:    number;
}

export interface SystemHealthReport {
  overallStatus:  HealthStatus;
  lastUpdated:    string;           // ISO-8601
  storage:        StorageHealth;
  ai:             AIHealth;
  data:           DataHealth;
  workspaceHealth: WorkspaceAnalytics[];
  warnings:       SystemWarning[];  // sorted Critical → High → Medium
  warningCounts:  WarningCounts;
}

// ── Input type ────────────────────────────────────────────────────────────────

export interface SystemHealthInput {
  // Infrastructure
  localStorageAvailable: boolean;
  localItemCount:        number;
  supabaseConfigured:    boolean;
  supabaseAuthenticated: boolean;
  syncReport:            SyncHealthReport;

  // AI configuration (read from server-side env, passed in as booleans)
  anthropicConfigured: boolean;
  openaiConfigured:    boolean;

  // Raw data (for warning generation)
  projects:       Project[];
  projectTasks:   ProjectTask[];
  memoryItems:    MemoryItem[];
  contentItems:   ContentItem[];
  opportunities:  Opportunity[];
  people:         Person[];
  focusSessionCount: number;

  // Pre-computed workspace analytics
  workspaceAnalytics: WorkspaceAnalytics[];

  // System flags
  isDemoMode: boolean;
  todayStr:   string;
}

// ── Engine ────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<WarningSeverity, number> = {
  Critical: 0,
  High:     1,
  Medium:   2,
};

export function computeSystemHealth(input: SystemHealthInput): SystemHealthReport {
  const {
    localStorageAvailable, localItemCount,
    supabaseConfigured, supabaseAuthenticated,
    syncReport, anthropicConfigured, openaiConfigured,
    projects, projectTasks, memoryItems, contentItems,
    opportunities, people, focusSessionCount,
    workspaceAnalytics, isDemoMode, todayStr,
  } = input;

  // ── Storage Health ─────────────────────────────────────────────────────────

  const syncResults = syncReport.modules.map((m) => ({
    module:    m.label,
    result:    (m.lastResult?.supabase ?? "never") as "success" | "skipped" | "failed" | "never",
    timestamp: m.lastResult?.timestamp,
    error:     m.lastResult?.error,
  }));

  const failedWrites = syncReport.modules.filter(
    (m) => m.lastResult?.supabase === "failed"
  ).length;

  const readMode = !supabaseConfigured
    ? "local-only"
    : supabaseAuthenticated
      ? "authenticated"
      : "supabase-ready";

  const storage: StorageHealth = {
    localStorageEnabled:   localStorageAvailable,
    localItemCount,
    supabaseConfigured,
    supabaseAuthenticated,
    readMode,
    lastSyncResults:       syncResults,
    failedWrites,
    fallbackMode:          !supabaseConfigured || failedWrites > 0,
  };

  // ── AI Health ──────────────────────────────────────────────────────────────

  const ai: AIHealth = {
    anthropicConfigured,
    chatAvailable:        anthropicConfigured,
    openaiConfigured,
    embeddingsAvailable:  false,       // planned — not yet implemented
    vectorMode:           "planned",
    vectorDbReady:        false,
    semanticSearchActive: false,
  };

  // ── Data Health ────────────────────────────────────────────────────────────

  const data: DataHealth = {
    projects:      projects.length,
    tasks:         projectTasks.length,
    memories:      memoryItems.length,
    relationships: people.length,
    opportunities: opportunities.length,
    content:       contentItems.length,
    focusSessions: focusSessionCount,
    total:
      projects.length +
      projectTasks.length +
      memoryItems.length +
      people.length +
      opportunities.length +
      contentItems.length +
      focusSessionCount,
  };

  // ── Warnings ───────────────────────────────────────────────────────────────

  const warnings: SystemWarning[] = [];

  // Critical: localStorage unavailable
  if (!localStorageAvailable) {
    warnings.push({
      severity: "Critical",
      message:  "localStorage is unavailable — no data can be read or written",
      category: "Storage",
    });
  }

  // Critical: multiple sync modules failing
  if (failedWrites >= 2) {
    warnings.push({
      severity: "Critical",
      message:  `${failedWrites} sync modules reporting failures — data may not be backed up to Supabase`,
      category: "Sync",
    });
  }

  // High: single sync failure
  if (failedWrites === 1) {
    const failed = syncReport.modules.find((m) => m.lastResult?.supabase === "failed");
    warnings.push({
      severity: "High",
      message:  `${failed?.label ?? "A module"} sync failed — check Settings → Sync Health`,
      category: "Sync",
    });
  }

  // High: demo mode active
  if (isDemoMode) {
    warnings.push({
      severity: "High",
      message:  "Demo mode is active — your real data is hidden behind demo data",
      category: "System",
    });
  }

  // High: many overdue tasks
  const overdueTasks = projectTasks.filter(
    (t) => t.status !== "Done" && t.due_date && t.due_date < todayStr
  );
  if (overdueTasks.length >= 5) {
    warnings.push({
      severity: "High",
      message:  `${overdueTasks.length} overdue tasks across your projects`,
      category: "Tasks",
    });
  } else if (overdueTasks.length > 0) {
    warnings.push({
      severity: "Medium",
      message:  `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} need attention`,
      category: "Tasks",
    });
  }

  // High: active projects past due date
  const stalledProjects = projects.filter(
    (p) => p.status === "Active" && p.due_date && p.due_date < todayStr
  );
  if (stalledProjects.length > 0) {
    warnings.push({
      severity: "High",
      message:  `${stalledProjects.length} active project${stalledProjects.length > 1 ? "s are" : " is"} past due date`,
      category: "Projects",
    });
  }

  // High: opportunities with overdue follow-ups
  const activeOpps = opportunities.filter((o) =>
    ["Detected", "Reviewing", "Active"].includes(o.status)
  );
  const oppsWithStaleFollowUp = activeOpps.filter((opp) =>
    (opp.related_people ?? []).some((personId) => {
      const person = people.find((p) => p.id === personId);
      return person?.next_follow_up_at && person.next_follow_up_at < todayStr;
    })
  );
  if (oppsWithStaleFollowUp.length > 0) {
    warnings.push({
      severity: "High",
      message:  `${oppsWithStaleFollowUp.length} opportunit${oppsWithStaleFollowUp.length > 1 ? "ies have" : "y has"} overdue follow-ups`,
      category: "Opportunities",
    });
  }

  // Medium: content past publish date
  const overdueContent = contentItems.filter(
    (c) =>
      c.status !== "Published" &&
      c.status !== "Archived" &&
      c.publish_date &&
      c.publish_date < todayStr
  );
  if (overdueContent.length > 0) {
    warnings.push({
      severity: "Medium",
      message:  `${overdueContent.length} content item${overdueContent.length > 1 ? "s are" : " is"} past publish date`,
      category: "Content",
    });
  }

  // Medium: memories not semantically indexed
  if (memoryItems.length > 0) {
    warnings.push({
      severity: "Medium",
      message:  `${memoryItems.length} memor${memoryItems.length > 1 ? "ies are" : "y is"} not semantically indexed — vector memory is planned`,
      category: "AI",
    });
  }

  // Medium: Supabase configured but not authenticated (RLS not active)
  if (supabaseConfigured && !supabaseAuthenticated) {
    warnings.push({
      severity: "Medium",
      message:  "Supabase is configured but you are not signed in — RLS policies are not yet enforced",
      category: "Security",
    });
  }

  // Sort: Critical → High → Medium
  warnings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const warningCounts: WarningCounts = {
    critical: warnings.filter((w) => w.severity === "Critical").length,
    high:     warnings.filter((w) => w.severity === "High").length,
    medium:   warnings.filter((w) => w.severity === "Medium").length,
    total:    warnings.length,
  };

  // ── Overall Status ─────────────────────────────────────────────────────────

  let overallStatus: HealthStatus = "Healthy";
  if (!localStorageAvailable || failedWrites >= 2 || warningCounts.critical > 0) {
    overallStatus = "Critical";
  } else if (warningCounts.high > 0 || warningCounts.medium > 0) {
    overallStatus = "Warning";
  }

  return {
    overallStatus,
    lastUpdated:     new Date().toISOString(),
    storage,
    ai,
    data,
    workspaceHealth: workspaceAnalytics,
    warnings,
    warningCounts,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusColor(status: HealthStatus): string {
  switch (status) {
    case "Healthy":  return "rgba(52,211,153,0.85)";
    case "Warning":  return "rgba(245,158,11,0.85)";
    case "Critical": return "rgba(239,68,68,0.85)";
  }
}

export function statusBg(status: HealthStatus): string {
  switch (status) {
    case "Healthy":  return "rgba(52,211,153,0.08)";
    case "Warning":  return "rgba(245,158,11,0.08)";
    case "Critical": return "rgba(239,68,68,0.08)";
  }
}

export function statusBorder(status: HealthStatus): string {
  switch (status) {
    case "Healthy":  return "rgba(52,211,153,0.18)";
    case "Warning":  return "rgba(245,158,11,0.18)";
    case "Critical": return "rgba(239,68,68,0.2)";
  }
}

export function severityColor(severity: WarningSeverity): string {
  switch (severity) {
    case "Critical": return "rgba(239,68,68,0.85)";
    case "High":     return "rgba(245,158,11,0.85)";
    case "Medium":   return "rgba(167,139,250,0.75)";
  }
}

/** One-line system risk note for Chief of Staff integration */
export function buildSystemRiskNote(report: SystemHealthReport): string | null {
  if (report.overallStatus === "Healthy") return null;

  const parts: string[] = [];

  const overdueTasks = report.warnings.find(
    (w) => w.category === "Tasks" && w.message.includes("overdue task")
  );
  if (overdueTasks) {
    const match = overdueTasks.message.match(/^(\d+)/);
    if (match) parts.push(`${match[1]} overdue task${parseInt(match[1]) > 1 ? "s" : ""}`);
  }

  if (report.storage.failedWrites > 0) {
    parts.push(`${report.storage.failedWrites} sync failure${report.storage.failedWrites > 1 ? "s" : ""}`);
  }

  if (report.warningCounts.critical > 0) {
    parts.push(`${report.warningCounts.critical} critical issue${report.warningCounts.critical > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return `System is ${report.overallStatus.toLowerCase()} — ${report.warningCounts.total} warning${report.warningCounts.total > 1 ? "s" : ""} detected`;
  }

  return `System reports ${parts.join(" and ")}.`;
}
