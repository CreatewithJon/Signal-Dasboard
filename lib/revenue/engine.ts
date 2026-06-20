/**
 * lib/revenue/engine.ts — Sovereign OS v7.7
 *
 * Revenue Intelligence Engine.
 * Pure function — answers: where is money likely to come from, which
 * workspaces are ahead/behind target, what revenue risks exist, and what
 * should be prioritized to increase revenue.
 *
 * This is an intelligence layer, not accounting software.
 */

import type { Workspace } from "@/lib/types/workspace";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { Project } from "@/lib/types/projects";

// ── Settings ──────────────────────────────────────────────────────────────────

export interface RevenueSettings {
  defaultCloseProbability: number; // 0.0–1.0, default 0.25
  monthlyRevenueGoal:      number; // default 5000
}

export const DEFAULT_REVENUE_SETTINGS: RevenueSettings = {
  defaultCloseProbability: 0.25,
  monthlyRevenueGoal:      5000,
};

// ── Output types ──────────────────────────────────────────────────────────────

export interface WorkspaceRevenueSummary {
  workspace:               Workspace;
  pipelineValue:           number;   // sum estimated_value for active opps
  expectedRevenue:         number;   // sum estimated_value * probability for active opps
  closedRevenue:           number;   // sum estimated_value for Converted opps
  activeOpportunityCount:  number;
  overdueOpportunityCount: number;   // expected_close_date passed + not closed
  revenueGoal:             number;   // proportional share of monthly goal
  revenueGap:              number;   // revenueGoal - expectedRevenue (positive = behind)
  confidenceScore:         number;   // 0–100
  topOpportunity:          Opportunity | null;
}

export type RevenueRiskSeverity = "Critical" | "High" | "Medium";

export interface RevenueRisk {
  severity:               RevenueRiskSeverity;
  message:                string;
  category:               string;
  relatedOpportunityId?:  string;
  relatedWorkspaceId?:    string;
}

export interface RevenueSuggestion {
  action:                 string;
  reason:                 string;
  priority:               "High" | "Medium" | "Low";
  relatedOpportunityId?:  string;
}

export interface RevenueSnapshot {
  totalPipelineValue:      number;
  totalExpectedRevenue:    number;
  totalClosedRevenue:      number;
  revenueGoal:             number;
  revenueGap:              number;   // goal - expectedRevenue (positive = behind)
  highestValueWorkspace:   WorkspaceRevenueSummary | null;
  highestRiskWorkspace:    WorkspaceRevenueSummary | null;
  workspaceSummaries:      WorkspaceRevenueSummary[];
  risks:                   RevenueRisk[];
  suggestions:             RevenueSuggestion[];
}

// ── Input type ────────────────────────────────────────────────────────────────

export interface RevenueEngineInput {
  workspaces:    Workspace[];
  opportunities: Opportunity[];
  people:        Person[];
  projects:      Project[];
  settings:      RevenueSettings;
  todayStr:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function belongsTo<T extends { workspace_id?: string }>(item: T, wsId: string): boolean {
  if (wsId === "personal") return !item.workspace_id || item.workspace_id === "personal";
  return item.workspace_id === wsId;
}

function isActive(opp: Opportunity): boolean {
  return opp.status === "Detected" || opp.status === "Reviewing" || opp.status === "Active";
}

function effectiveProb(opp: Opportunity, defaultProb: number): number {
  return opp.close_probability ?? defaultProb;
}

function computeConfidence(
  activeOpps:      Opportunity[],
  attachedPeople:  number,
  recentlyUpdated: number,   // count of opps updated in last 7 days
  overdueOpps:     number,
  stalledProjects: number,
): number {
  let score = 0;
  // Active opportunities: +20 each, max 40
  score += Math.min(activeOpps.length * 20, 40);
  // Relationships attached: +10 each, max 20
  score += Math.min(attachedPeople * 10, 20);
  // Recent updates: +15 each, max 30
  score += Math.min(recentlyUpdated * 15, 30);
  // Overdue opportunities: -10 each, max -30
  score -= Math.min(overdueOpps * 10, 30);
  // Stalled projects: -5 each, max -20
  score -= Math.min(stalledProjects * 5, 20);
  return Math.max(0, Math.min(100, score));
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeRevenueSnapshot(input: RevenueEngineInput): RevenueSnapshot {
  const { workspaces, opportunities, people, projects, settings, todayStr } = input;
  const { defaultCloseProbability, monthlyRevenueGoal } = settings;

  const sevenDaysAgo = new Date(todayStr + "T00:00:00");
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const activeWorkspaces = workspaces.filter((w) => !w.archived);
  const wsGoal = activeWorkspaces.length > 0
    ? monthlyRevenueGoal / activeWorkspaces.length
    : 0;

  // ── Per-workspace summaries ───────────────────────────────────────────────

  const workspaceSummaries: WorkspaceRevenueSummary[] = activeWorkspaces.map((ws) => {
    const wsOpps     = opportunities.filter((o) => belongsTo(o, ws.id));
    const wsProjects = projects.filter((p) => belongsTo(p, ws.id));
    const wsPeople   = people.filter((p) => belongsTo(p, ws.id));

    const activeOpps = wsOpps.filter(isActive);

    const pipelineValue = activeOpps.reduce(
      (sum, o) => sum + (o.estimated_value ?? 0), 0
    );
    const expectedRevenue = activeOpps.reduce(
      (sum, o) => sum + (o.estimated_value ?? 0) * effectiveProb(o, defaultCloseProbability), 0
    );
    const closedRevenue = wsOpps
      .filter((o) => o.status === "Converted")
      .reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

    const overdueOpps = activeOpps.filter(
      (o) => o.expected_close_date && o.expected_close_date < todayStr
    ).length;

    const recentlyUpdated = activeOpps.filter(
      (o) => (o.updated_at ?? "").slice(0, 10) >= sevenDaysAgoStr
    ).length;

    // Relationships attached to any active opportunity
    const oppRelatedPeople = new Set(activeOpps.flatMap((o) => o.related_people ?? []));
    const attachedPeople = wsPeople.filter((p) => oppRelatedPeople.has(p.name)).length;

    // Stalled projects: Active status, past due date
    const stalledProjects = wsProjects.filter(
      (p) => p.status === "Active" && p.due_date && p.due_date < todayStr
    ).length;

    const confidenceScore = computeConfidence(
      activeOpps, attachedPeople, recentlyUpdated, overdueOpps, stalledProjects
    );

    const topOpportunity = activeOpps.length > 0
      ? activeOpps.reduce((best, o) =>
          (o.estimated_value ?? 0) > (best.estimated_value ?? 0) ? o : best
        )
      : null;

    const revenueGap = wsGoal - expectedRevenue;

    return {
      workspace:               ws,
      pipelineValue,
      expectedRevenue,
      closedRevenue,
      activeOpportunityCount:  activeOpps.length,
      overdueOpportunityCount: overdueOpps,
      revenueGoal:             wsGoal,
      revenueGap,
      confidenceScore,
      topOpportunity,
    };
  });

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalPipelineValue  = workspaceSummaries.reduce((s, w) => s + w.pipelineValue, 0);
  const totalExpectedRevenue = workspaceSummaries.reduce((s, w) => s + w.expectedRevenue, 0);
  const totalClosedRevenue  = workspaceSummaries.reduce((s, w) => s + w.closedRevenue, 0);
  const revenueGap          = monthlyRevenueGoal - totalExpectedRevenue;

  // Highest value / highest risk
  const highestValueWorkspace = workspaceSummaries.length > 0
    ? workspaceSummaries.reduce((a, b) => a.expectedRevenue > b.expectedRevenue ? a : b)
    : null;
  const highestRiskWorkspace = workspaceSummaries.length > 0
    ? workspaceSummaries.reduce((a, b) => a.revenueGap > b.revenueGap ? a : b)
    : null;

  // ── Revenue Risks ─────────────────────────────────────────────────────────

  const risks: RevenueRisk[] = [];

  // Critical: high-value opp (>$1000) overdue with no related people
  const highValueOpps = opportunities.filter(
    (o) => isActive(o) && (o.estimated_value ?? 0) > 1000
  );
  for (const opp of highValueOpps) {
    const isOverdue = opp.expected_close_date && opp.expected_close_date < todayStr;
    const hasNoPeople = (opp.related_people ?? []).length === 0;
    if (isOverdue && hasNoPeople) {
      risks.push({
        severity: "Critical",
        message: `"${opp.title}" — high-value opportunity ($${(opp.estimated_value ?? 0).toLocaleString()}) is overdue with no contact attached`,
        category: "Pipeline",
        relatedOpportunityId: opp.id,
      });
    } else if (isOverdue) {
      // High-value + overdue + has people → check if any person has follow-up scheduled
      const hasFollowUp = (opp.related_people ?? []).some((name) => {
        const person = people.find((p) => p.name === name);
        return person?.next_follow_up_at && person.next_follow_up_at >= todayStr;
      });
      if (!hasFollowUp) {
        risks.push({
          severity: "Critical",
          message: `"${opp.title}" — $${(opp.estimated_value ?? 0).toLocaleString()} opportunity is overdue with no follow-up scheduled`,
          category: "Pipeline",
          relatedOpportunityId: opp.id,
        });
      }
    }
  }

  // High: workspace below 50% of target
  for (const ws of workspaceSummaries) {
    if (ws.revenueGoal > 0 && ws.expectedRevenue < ws.revenueGoal * 0.5) {
      risks.push({
        severity: "High",
        message: `${ws.workspace.name} is tracking below 50% of revenue target — $${Math.round(ws.expectedRevenue).toLocaleString()} expected vs $${Math.round(ws.revenueGoal).toLocaleString()} goal`,
        category: "Goal",
        relatedWorkspaceId: ws.workspace.id,
      });
    }
  }

  // High: stalled project linked to an active opportunity
  const activeOppProjectIds = new Set(
    opportunities.filter(isActive).flatMap((o) => o.related_project_ids ?? [])
  );
  const stalledLinkedProjects = projects.filter(
    (p) =>
      p.status === "Active" &&
      p.due_date && p.due_date < todayStr &&
      activeOppProjectIds.has(p.id)
  );
  for (const proj of stalledLinkedProjects) {
    risks.push({
      severity: "High",
      message: `"${proj.title}" is stalled (Active, past due) and is linked to an active revenue opportunity`,
      category: "Projects",
    });
  }

  // Medium: opportunities with very low confidence (no people, no value, no close date)
  const lowConfidenceOpps = opportunities.filter(
    (o) =>
      isActive(o) &&
      (o.estimated_value ?? 0) > 0 &&
      (o.close_probability ?? defaultCloseProbability) < 0.2
  );
  for (const opp of lowConfidenceOpps) {
    risks.push({
      severity: "Medium",
      message: `"${opp.title}" has a low close probability (${Math.round((opp.close_probability ?? defaultCloseProbability) * 100)}%) — consider whether to pursue or archive`,
      category: "Pipeline",
      relatedOpportunityId: opp.id,
    });
  }

  // Medium: dormant relationships linked to active opps
  for (const opp of opportunities.filter(isActive)) {
    for (const personName of opp.related_people ?? []) {
      const person = people.find((p) => p.name === personName);
      if (person?.status === "Dormant") {
        risks.push({
          severity: "Medium",
          message: `${person.name} (linked to "${opp.title}") is marked Dormant — relationship may need re-activation`,
          category: "Relationships",
          relatedOpportunityId: opp.id,
        });
        break; // one risk per opportunity
      }
    }
  }

  // Sort: Critical → High → Medium
  const severityOrder: Record<RevenueRiskSeverity, number> = { Critical: 0, High: 1, Medium: 2 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // ── Revenue Suggestions ───────────────────────────────────────────────────

  const suggestions: RevenueSuggestion[] = [];

  // Follow up with person on opportunity
  for (const opp of opportunities.filter(isActive)) {
    for (const personName of opp.related_people ?? []) {
      const person = people.find((p) => p.name === personName);
      if (person?.next_follow_up_at && person.next_follow_up_at <= todayStr) {
        suggestions.push({
          action: `Follow up with ${person.name} on "${opp.title}"`,
          reason: `Follow-up was due ${person.next_follow_up_at}`,
          priority: "High",
          relatedOpportunityId: opp.id,
        });
        break;
      }
    }
  }

  // Convert high-score active opps into proposals
  const highScoreActiveOpps = opportunities.filter(
    (o) => isActive(o) && o.score >= 70 && (o.estimated_value ?? 0) > 0
  );
  for (const opp of highScoreActiveOpps.slice(0, 3)) {
    suggestions.push({
      action: `Convert "${opp.title}" into a proposal`,
      reason: `Score ${opp.score}/100 and $${(opp.estimated_value ?? 0).toLocaleString()} in pipeline — high readiness`,
      priority: "High",
      relatedOpportunityId: opp.id,
    });
  }

  // Schedule discovery call for Detected opps with no contacts
  const unattendedDetected = opportunities.filter(
    (o) => o.status === "Detected" && (o.related_people ?? []).length === 0
  );
  for (const opp of unattendedDetected.slice(0, 2)) {
    suggestions.push({
      action: `Schedule a discovery call for "${opp.title}"`,
      reason: "Opportunity has no contacts attached — qualify it before it goes cold",
      priority: "Medium",
      relatedOpportunityId: opp.id,
    });
  }

  // Re-engage dormant relationships
  const dormantLinked = people.filter(
    (p) =>
      p.status === "Dormant" &&
      opportunities.some(
        (o) => isActive(o) && (o.related_people ?? []).includes(p.name)
      )
  );
  for (const person of dormantLinked.slice(0, 2)) {
    suggestions.push({
      action: `Re-engage ${person.name}`,
      reason: `Marked Dormant but linked to an active opportunity — a quick check-in could unlock movement`,
      priority: "Medium",
    });
  }

  // Set close dates on opps without one
  const noDates = opportunities.filter(
    (o) => isActive(o) && !o.expected_close_date && (o.estimated_value ?? 0) > 0
  );
  for (const opp of noDates.slice(0, 2)) {
    suggestions.push({
      action: `Set an expected close date on "${opp.title}"`,
      reason: "No close date set — without a date it won't appear in pipeline forecasts",
      priority: "Medium",
      relatedOpportunityId: opp.id,
    });
  }

  // Sort: High → Medium → Low
  const suggestOrder = { High: 0, Medium: 1, Low: 2 };
  suggestions.sort((a, b) => suggestOrder[a.priority] - suggestOrder[b.priority]);

  return {
    totalPipelineValue,
    totalExpectedRevenue,
    totalClosedRevenue,
    revenueGoal:          monthlyRevenueGoal,
    revenueGap,
    highestValueWorkspace,
    highestRiskWorkspace,
    workspaceSummaries,
    risks,
    suggestions,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function confidenceColor(score: number): string {
  if (score >= 70) return "rgba(52,211,153,0.85)";
  if (score >= 40) return "rgba(245,158,11,0.85)";
  return "rgba(239,68,68,0.75)";
}

export function riskSeverityColor(severity: RevenueRiskSeverity): string {
  switch (severity) {
    case "Critical": return "rgba(239,68,68,0.85)";
    case "High":     return "rgba(245,158,11,0.85)";
    case "Medium":   return "rgba(167,139,250,0.75)";
  }
}

export function gapColor(gap: number): string {
  if (gap <= 0) return "rgba(52,211,153,0.85)";  // at or above target
  if (gap <= 1000) return "rgba(245,158,11,0.85)"; // close
  return "rgba(239,68,68,0.75)";                   // behind
}
