/**
 * lib/workspaces/analytics.ts — Sovereign OS v7.5
 *
 * Workspace Analytics Engine.
 * Computes operational metrics for each workspace:
 *   openProjects, overdueTasks, activeOpportunities,
 *   highPriorityPeople, contentPipeline, focusMinutesWeek,
 *   memoryCount, riskScore (0–100), momentumScore (0–100)
 *
 * Pure function — no side effects, no localStorage access.
 * Call from client components after loading data.
 */

import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { FocusSession } from "@/lib/types/execution";
import type { Workspace } from "@/lib/types/workspace";

// ── output type ──────────────────────────────────────────────────────────────

export interface WorkspaceAnalytics {
  workspace:           Workspace;
  openProjects:        number;
  overdueTasks:        number;
  activeOpportunities: number;
  highPriorityPeople:  number;
  contentPipeline:     number;      // items not Published / Archived
  focusMinutesWeek:    number;
  focusSessionsWeek:   number;
  memoryCount:         number;
  riskScore:           number;      // 0–100, higher = more risk
  momentumScore:       number;      // 0–100, higher = more momentum
  riskFactors:         string[];    // human-readable risk bullets
  // v7.7 — Revenue Intelligence (computed from opportunity revenue fields)
  pipelineValue:       number;      // sum of estimated_value for active opps
  expectedRevenue:     number;      // sum of estimated_value * close_probability for active opps
}

// ── input type ───────────────────────────────────────────────────────────────

export interface AnalyticsInput {
  workspaces:    Workspace[];
  projects:      Project[];
  projectTasks:  ProjectTask[];
  memoryItems:   MemoryItem[];
  contentItems:  ContentItem[];
  opportunities: Opportunity[];
  people:        Person[];
  focusSessions: FocusSession[];
  todayStr:      string;   // "YYYY-MM-DD"
  weekStartStr:  string;   // "YYYY-MM-DD" — Monday of current week
}

// ── helpers ───────────────────────────────────────────────────────────────────

function belongsTo<T extends { workspace_id?: string }>(item: T, wsId: string): boolean {
  if (wsId === "personal") return !item.workspace_id || item.workspace_id === "personal";
  return item.workspace_id === wsId;
}

function cap(n: number, max: number): number {
  return Math.min(n, max);
}

function computeRisk(
  overdueTasks:       number,
  criticalProjects:   number,
  noFocusThisWeek:    boolean,
  overdueRelationships: number,
): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  if (overdueTasks > 0) {
    const pts = cap(overdueTasks * 15, 45);
    score += pts;
    factors.push(`${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`);
  }
  if (criticalProjects > 0) {
    const pts = cap(criticalProjects * 12, 36);
    score += pts;
    factors.push(`${criticalProjects} critical-priority project${criticalProjects > 1 ? "s" : ""}`);
  }
  if (noFocusThisWeek) {
    score += 19;
    factors.push("No focus sessions this week");
  }
  if (overdueRelationships > 0) {
    const pts = cap(overdueRelationships * 5, 15);
    score += pts;
    factors.push(`${overdueRelationships} overdue follow-up${overdueRelationships > 1 ? "s" : ""}`);
  }

  return { score: Math.min(100, score), factors };
}

function computeMomentum(
  focusMinutes:          number,
  completedTasksWeek:    number,
  openProjects:          number,
  activeOpps:            number,
  recentMemories:        number,
): number {
  let score = 0;
  // Focus time: 0–30 pts (full at 120+ min/week)
  score += Math.round(cap(focusMinutes / 120, 1) * 30);
  // Completed tasks this week: 0–25 pts (full at 5+)
  score += Math.round(cap(completedTasksWeek / 5, 1) * 25);
  // Active projects: 0–20 pts (full at 3+)
  score += Math.round(cap(openProjects / 3, 1) * 20);
  // Active opps: 0–15 pts (full at 3+)
  score += Math.round(cap(activeOpps / 3, 1) * 15);
  // Memory captures this week: 0–10 pts (full at 3+)
  score += Math.round(cap(recentMemories / 3, 1) * 10);
  return Math.min(100, score);
}

// ── main export ───────────────────────────────────────────────────────────────

export function computeWorkspaceAnalytics(input: AnalyticsInput): WorkspaceAnalytics[] {
  const {
    workspaces, projects, projectTasks, memoryItems, contentItems,
    opportunities, people, focusSessions, todayStr, weekStartStr,
  } = input;

  return workspaces
    .filter((ws) => !ws.archived)
    .map((ws) => {
      const id = ws.id;

      // Partition data by workspace
      const wsProjects  = projects.filter((p) => belongsTo(p, id));
      const wsTasks     = projectTasks.filter((t) => belongsTo(t, id));
      const wsMemory    = memoryItems.filter((m) => belongsTo(m, id));
      const wsContent   = contentItems.filter((c) => belongsTo(c, id));
      const wsOpps      = opportunities.filter((o) => belongsTo(o, id));
      const wsPeople    = people.filter((p) => belongsTo(p, id));
      const wsSessions  = focusSessions.filter((s) => belongsTo(s, id));

      // Core metrics
      const openProjects = wsProjects.filter(
        (p) => p.status !== "Shipped" && p.status !== "Archived"
      ).length;

      const overdueTasks = wsTasks.filter(
        (t) => t.status !== "Done" && t.due_date && t.due_date < todayStr
      ).length;

      const activeOpportunities = wsOpps.filter(
        (o) => o.status === "Detected" || o.status === "Reviewing" || o.status === "Active"
      ).length;

      const highPriorityPeople = wsPeople.filter(
        (p) => p.priority === "High" || p.priority === "Critical"
      ).length;

      const contentPipeline = wsContent.filter(
        (c) => c.status !== "Published" && c.status !== "Archived"
      ).length;

      // Focus this week
      const weekSessions = wsSessions.filter((s) => {
        const d = s.startedAt?.slice(0, 10) ?? "";
        return d >= weekStartStr && d <= todayStr;
      });
      const focusMinutesWeek = weekSessions.reduce(
        (sum, s) => sum + (s.actualMinutes ?? s.plannedMinutes ?? 0), 0
      );

      // Risk factors
      const criticalProjects = wsProjects.filter(
        (p) => p.priority === "Critical" && p.status !== "Shipped" && p.status !== "Archived"
      ).length;

      const overdueRelationships = wsPeople.filter(
        (p) => p.next_follow_up_at && p.next_follow_up_at < todayStr && p.status !== "Archived"
      ).length;

      const noFocusThisWeek = weekSessions.length === 0;

      const { score: riskScore, factors: riskFactors } = computeRisk(
        overdueTasks, criticalProjects, noFocusThisWeek, overdueRelationships
      );

      // Momentum factors
      const completedTasksWeek = wsTasks.filter(
        (t) => t.status === "Done" && t.updated_at?.slice(0, 10) >= weekStartStr
      ).length;

      const recentMemories = wsMemory.filter(
        (m) => m.createdAt?.slice(0, 10) >= weekStartStr
      ).length;

      const momentumScore = computeMomentum(
        focusMinutesWeek, completedTasksWeek, openProjects,
        activeOpportunities, recentMemories
      );

      // v7.7 — Revenue values from active opportunities
      const DEFAULT_CLOSE_PROB = 0.25;
      const activeWsOpps = wsOpps.filter(
        (o) => o.status === "Detected" || o.status === "Reviewing" || o.status === "Active"
      );
      const pipelineValue = activeWsOpps.reduce(
        (sum, o) => sum + (o.estimated_value ?? 0), 0
      );
      const expectedRevenue = activeWsOpps.reduce(
        (sum, o) => sum + (o.estimated_value ?? 0) * (o.close_probability ?? DEFAULT_CLOSE_PROB), 0
      );

      return {
        workspace:           ws,
        openProjects,
        overdueTasks,
        activeOpportunities,
        highPriorityPeople,
        contentPipeline,
        focusMinutesWeek,
        focusSessionsWeek:   weekSessions.length,
        memoryCount:         wsMemory.length,
        riskScore,
        momentumScore,
        riskFactors,
        pipelineValue,
        expectedRevenue,
      };
    });
}

// ── helpers for consumers ─────────────────────────────────────────────────────

export function getWeekStart(todayStr: string): string {
  const d = new Date(todayStr + "T00:00:00");
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function riskLabel(score: number): string {
  if (score >= 70) return "Critical";
  if (score >= 45) return "High";
  if (score >= 20) return "Medium";
  return "Low";
}

export function riskColor(score: number): string {
  if (score >= 70) return "rgba(239,68,68,0.85)";
  if (score >= 45) return "rgba(245,158,11,0.85)";
  if (score >= 20) return "rgba(167,139,250,0.7)";
  return "rgba(52,211,153,0.7)";
}

export function momentumColor(score: number): string {
  if (score >= 70) return "rgba(52,211,153,0.85)";
  if (score >= 45) return "rgba(245,158,11,0.85)";
  return "rgba(239,68,68,0.75)";
}
