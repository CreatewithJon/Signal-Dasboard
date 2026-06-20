/**
 * lib/strategicPlanner/engine.ts
 *
 * Strategic Planner Engine — Sovereign OS v6.0
 *
 * Long-horizon planning layer that synthesizes vision, projects, opportunities,
 * relationships, content, memory, focus history, and graph intelligence into a
 * 30/60/90-day execution strategy.
 *
 * Sits ABOVE: Focus Engine · Briefing Engine · Chief of Staff · Action Engine.
 * Pure computation — no AI calls. Deterministic logic first.
 */

import type { Project, ProjectTask } from "@/lib/types/projects";
import type { Opportunity }          from "@/lib/types/opportunities";
import type { Person }               from "@/lib/types/relationships";
import type { ContentItem }          from "@/lib/types/content";
import type { MemoryItem }           from "@/lib/types/memory";
import type { FocusSession }         from "@/lib/types/execution";
import type { GraphInsight }         from "@/lib/knowledgeGraph/engine";
import type { ChiefOfStaffBrief }    from "@/lib/chiefOfStaff/engine";
import type { ActionEngineResult }   from "@/lib/actionEngine/engine";

// ── Types ──────────────────────────────────────────────────────────────────

export interface NorthStar {
  title:     string;
  rationale: string;
}

export type ObjectiveImpact    = "transformative" | "high" | "medium" | "low";
export type ObjectiveDifficulty = "easy" | "moderate" | "hard" | "very-hard";

export interface StrategicObjective {
  id:              string;
  title:           string;
  whyItMatters:    string;
  impact:          ObjectiveImpact;
  difficulty:      ObjectiveDifficulty;
  relatedProjects: string[];  // project IDs
}

export type BottleneckType =
  | "stalled_project"
  | "missing_next_action"
  | "overdue_task"
  | "missing_followup"
  | "content_gap"
  | "priority_overload";

export type Severity = "critical" | "high" | "medium";

export interface Bottleneck {
  id:       string;
  title:    string;
  type:     BottleneckType;
  severity: Severity;
  detail:   string;
  entityId?: string;
}

export interface DependencyChain {
  id:          string;
  steps:       string[];   // ordered labels in chain
  description: string;
  isBlocking:  boolean;    // does the first step gate the rest?
}

export interface StrategicRisk {
  id:             string;
  title:          string;
  type:           string;
  severity:       Severity;
  recommendation: string;
}

export interface HorizonPlan {
  label:      string;
  priorities: string[];
  milestones: string[];
  actions:    string[];
  goals:      string[];
}

export interface SequenceStep {
  order:  number;
  action: string;
  reason: string;
}

export interface StrategicPlan {
  generatedAt:    string;
  northStar:      NorthStar;
  topObjectives:  StrategicObjective[];
  bottlenecks:    Bottleneck[];
  dependencies:   DependencyChain[];
  strategicRisks: StrategicRisk[];
  thirtyDayPlan:  HorizonPlan;
  sixtyDayPlan:   HorizonPlan;
  ninetyDayPlan:  HorizonPlan;
  sequencing:     SequenceStep[];
  confidence:     number;   // 0–100
  reasoning:      string;
}

// ── Input ──────────────────────────────────────────────────────────────────

export interface StrategicInput {
  todayStr:      string;  // YYYY-MM-DD
  visionData:    { yr1: string[]; yr3: string[]; yr5: string[] };
  projects:      Project[];
  projectTasks:  ProjectTask[];
  opportunities: Opportunity[];
  people:        Person[];
  contentItems:  ContentItem[];
  memoryItems:   MemoryItem[];
  focusSessions: FocusSession[];
  graphInsights: GraphInsight[];
  chiefBrief?:   ChiefOfStaffBrief;   // optional enrichment
  actionResult?: ActionEngineResult;  // optional enrichment
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uid(prefix: string, idx: number): string {
  return `${prefix}_${idx}`;
}

function daysSince(isoDate: string, todayStr: string): number {
  const d = new Date(isoDate + (isoDate.includes("T") ? "" : "T00:00:00"));
  const t = new Date(todayStr + "T00:00:00");
  return Math.floor((t.getTime() - d.getTime()) / 86_400_000);
}

function isOverdue(dateStr: string, todayStr: string): boolean {
  if (!dateStr) return false;
  return dateStr < todayStr;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function activeProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status === "Active");
}

// ── North Star ─────────────────────────────────────────────────────────────

function deriveNorthStar(input: StrategicInput): NorthStar {
  const { visionData, projects } = input;

  // Priority 1: 1-year vision — take the most actionable statement
  const yr1 = visionData.yr1.filter((v) => v.trim().length > 0);
  if (yr1.length > 0) {
    const best = yr1[0];
    return {
      title:     best.length > 80 ? best.slice(0, 77) + "…" : best,
      rationale: yr1.length > 1
        ? `Derived from your 1-year vision (${yr1.length} goals). This is the primary heading objective.`
        : "Derived from your 1-year vision.",
    };
  }

  // Priority 2: Infer from most active, highest-priority projects
  const active = activeProjects(projects);
  if (active.length === 0) {
    return {
      title:     "Define your north star objective",
      rationale: "No active projects or vision data found. Set a 1-year vision in /planner to unlock strategic guidance.",
    };
  }

  // Weight: Critical=4, High=3, Medium=2, Low=1
  const weights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const top = [...active].sort(
    (a, b) => (weights[b.priority] ?? 0) - (weights[a.priority] ?? 0)
  )[0];

  // Infer theme from category
  const categoryThemes: Partial<Record<string, string>> = {
    "Sovereign OS":      "Ship Sovereign OS as a usable personal intelligence product",
    "Agentic Systems":   "Create recurring AI consulting revenue through automated systems",
    "DWT":               "Grow Digital Wealth Transfer into a trusted tech opportunity platform",
    "UNLV":              "Establish educational technology partnerships at UNLV",
    "Crypto Mondays":    "Scale Crypto Mondays LV into a sustainable community hub",
    "Content":           "Build content authority in AI, Bitcoin, and digital wealth",
    "Client":            "Deliver exceptional client results and generate referrals",
  };

  const theme = categoryThemes[top.category];
  if (theme) {
    return {
      title:     theme,
      rationale: `Inferred from your highest-priority active project in the ${top.category} category: "${top.title}". Set a 1-year vision in /planner for a more precise north star.`,
    };
  }

  return {
    title:     top.objective || `Advance "${top.title}" to completion`,
    rationale: `Derived from your highest-priority active project: "${top.title}" (${top.priority}).`,
  };
}

// ── Top Objectives ─────────────────────────────────────────────────────────

function deriveObjectives(input: StrategicInput): StrategicObjective[] {
  const { projects, projectTasks, opportunities, visionData } = input;
  const active = activeProjects(projects);

  // Score each active project
  const weights: Record<string, number> = { Critical: 100, High: 75, Medium: 50, Low: 25 };
  const oppsByProject = new Map<string, number>();

  for (const opp of opportunities) {
    for (const pid of (opp.related_project_ids ?? [])) {
      oppsByProject.set(pid, (oppsByProject.get(pid) ?? 0) + 1);
    }
  }

  const tasksByProject = new Map<string, number>();
  for (const task of projectTasks) {
    if (task.status !== "Done") {
      tasksByProject.set(task.project_id, (tasksByProject.get(task.project_id) ?? 0) + 1);
    }
  }

  const scored = active.map((p) => {
    const weight   = weights[p.priority] ?? 25;
    const oppBonus = (oppsByProject.get(p.id) ?? 0) * 15;
    const taskBonus = Math.min((tasksByProject.get(p.id) ?? 0) * 5, 25);
    return { project: p, score: weight + oppBonus + taskBonus };
  }).sort((a, b) => b.score - a.score);

  const objectives: StrategicObjective[] = [];

  // Up to 3 project-derived objectives
  for (const { project, score } of scored.slice(0, 3)) {
    const impact: ObjectiveImpact =
      score >= 100 ? "transformative" :
      score >= 75  ? "high" :
      score >= 50  ? "medium" : "low";

    const difficulty: ObjectiveDifficulty =
      project.priority === "Critical" ? "hard" :
      project.priority === "High"     ? "moderate" :
      project.priority === "Medium"   ? "easy" : "easy";

    objectives.push({
      id:              `obj_project_${project.id}`,
      title:           project.objective || `Complete "${project.title}"`,
      whyItMatters:    project.description ||
        `This project is ${project.priority.toLowerCase()} priority and directly supports your north star.`,
      impact,
      difficulty,
      relatedProjects: [project.id],
    });
  }

  // Vision-backed objective (yr1 item 2+ or yr3)
  const visionItems = [
    ...visionData.yr1.slice(1),
    ...visionData.yr3.slice(0, 1),
  ].filter((v) => v.trim().length > 0);

  if (visionItems.length > 0 && objectives.length < 5) {
    objectives.push({
      id:              "obj_vision_01",
      title:           visionItems[0].length > 80
        ? visionItems[0].slice(0, 77) + "…"
        : visionItems[0],
      whyItMatters:    "This appears in your multi-year vision — it's a strategic anchor that shapes medium-term decisions.",
      impact:          "high",
      difficulty:      "hard",
      relatedProjects: [],
    });
  }

  // Content/revenue objective if content gap detected
  const publishedContent = input.contentItems.filter((c) => c.status === "Published").length;
  const totalContent     = input.contentItems.length;
  if (totalContent > 3 && publishedContent === 0 && objectives.length < 5) {
    objectives.push({
      id:              "obj_content_01",
      title:           "Establish a consistent publishing cadence",
      whyItMatters:    `You have ${totalContent} content items but none published. Published content builds authority, drives inbound, and compounds over time.`,
      impact:          "high",
      difficulty:      "moderate",
      relatedProjects: [],
    });
  }

  return objectives.slice(0, 5);
}

// ── Dependency Detection ───────────────────────────────────────────────────

function detectDependencies(input: StrategicInput): DependencyChain[] {
  const { projects, opportunities, people, contentItems } = input;
  const chains: DependencyChain[] = [];
  const projectById  = new Map(projects.map((p) => [p.id, p]));
  const oppsByProject = new Map<string, string[]>();

  for (const opp of opportunities.filter((o) => o.status !== "Archived")) {
    for (const pid of (opp.related_project_ids ?? [])) {
      const arr = oppsByProject.get(pid) ?? [];
      arr.push(opp.title);
      oppsByProject.set(pid, arr);
    }
  }

  // Pattern 1: Project → Opportunity chain
  let idx = 0;
  for (const [pid, oppTitles] of oppsByProject.entries()) {
    const project = projectById.get(pid);
    if (!project || project.status === "Archived") continue;
    if (oppTitles.length === 0) continue;

    const isBlocking = project.status !== "Active" || project.next_action === "";
    chains.push({
      id:          uid("dep", idx++),
      steps:       [project.title, ...oppTitles.slice(0, 2)],
      description: `"${project.title}" must advance to unlock ${oppTitles.length === 1 ? `"${oppTitles[0]}"` : `${oppTitles.length} opportunities`}.`,
      isBlocking,
    });
  }

  // Pattern 2: Person → Opportunity → Revenue chain
  for (const person of people.filter((p) => p.status !== "Archived")) {
    const personOpps = opportunities.filter((o) =>
      o.related_people.some((name) =>
        name.toLowerCase().includes(person.name.toLowerCase().split(" ")[0])
      ) && o.status !== "Archived" && o.status !== "Converted"
    );

    if (personOpps.length === 0) continue;

    const revenueOpps = personOpps.filter((o) => o.type === "Revenue" || o.type === "Client");
    if (revenueOpps.length > 0) {
      chains.push({
        id:          uid("dep", idx++),
        steps:       [person.name, revenueOpps[0].title, "Revenue / Conversion"],
        description: `Following up with ${person.name} directly unlocks "${revenueOpps[0].title}" — a potential revenue opportunity.`,
        isBlocking:  person.next_follow_up_at !== "" && person.next_follow_up_at < input.todayStr,
      });
    }
  }

  // Pattern 3: Content → Audience → Leads
  const readyContent = contentItems.filter((c) => c.status === "Ready");
  if (readyContent.length >= 2) {
    chains.push({
      id:          uid("dep", idx++),
      steps:       ["Publish Content", "Build Audience", "Generate Leads"],
      description: `You have ${readyContent.length} content items marked Ready but not yet published. Publishing unlocks audience growth which drives inbound leads.`,
      isBlocking:  true,
    });
  }

  // Pattern 4: Sovereign OS → Case Study → Proposal (category-specific)
  const sovereignProj = projects.find((p) => p.category === "Sovereign OS" && p.status === "Active");
  const unlvProj      = projects.find((p) => p.category === "UNLV");
  if (sovereignProj && unlvProj) {
    chains.push({
      id:          uid("dep", idx++),
      steps:       [sovereignProj.title, "Case Study / Demo", unlvProj.title],
      description: `Advancing "${sovereignProj.title}" produces proof-of-work needed for "${unlvProj.title}". Ship a demo version before pursuing the educational proposal.`,
      isBlocking:  sovereignProj.status !== "Active",
    });
  }

  return chains.slice(0, 8);
}

// ── Bottleneck Detection ───────────────────────────────────────────────────

function detectBottlenecks(input: StrategicInput): Bottleneck[] {
  const { projects, projectTasks, people, contentItems, todayStr } = input;
  const bottlenecks: Bottleneck[] = [];
  let idx = 0;

  // 1. Stalled projects — active, no tasks In Progress, not updated in 14+ days
  for (const p of activeProjects(projects)) {
    const inProgress = projectTasks.filter(
      (t) => t.project_id === p.id && t.status === "In Progress"
    );
    const staleDays = daysSince(p.updated_at, todayStr);
    if (inProgress.length === 0 && staleDays > 14) {
      const severity: Severity = staleDays > 30 ? "critical" : staleDays > 21 ? "high" : "medium";
      bottlenecks.push({
        id:       uid("bn", idx++),
        title:    `"${p.title}" has stalled`,
        type:     "stalled_project",
        severity,
        detail:   `No tasks In Progress and no activity for ${staleDays} days. Start one task or archive if deprioritized.`,
        entityId: p.id,
      });
    }
  }

  // 2. Missing next actions on active projects
  const missingNextAction = activeProjects(projects).filter((p) => !p.next_action?.trim());
  if (missingNextAction.length > 0) {
    bottlenecks.push({
      id:       uid("bn", idx++),
      title:    `${missingNextAction.length} project${missingNextAction.length > 1 ? "s" : ""} missing a next action`,
      type:     "missing_next_action",
      severity: missingNextAction.length > 2 ? "high" : "medium",
      detail:   `Projects without a defined next action: ${missingNextAction.map((p) => `"${p.title}"`).slice(0, 3).join(", ")}${missingNextAction.length > 3 ? ` +${missingNextAction.length - 3} more` : ""}.`,
    });
  }

  // 3. Overdue tasks
  const overdueTasks = projectTasks.filter(
    (t) => t.status !== "Done" && t.due_date && isOverdue(t.due_date, todayStr)
  );
  if (overdueTasks.length > 0) {
    const criticalOverdue = overdueTasks.filter((t) => t.priority === "Critical" || t.priority === "High");
    bottlenecks.push({
      id:       uid("bn", idx++),
      title:    `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      type:     "overdue_task",
      severity: criticalOverdue.length > 0 ? "critical" : overdueTasks.length > 5 ? "high" : "medium",
      detail:   `${criticalOverdue.length > 0 ? `${criticalOverdue.length} critical/high priority. ` : ""}Overdue tasks drain focus and signal planning debt.`,
    });
  }

  // 4. Missing follow-ups on relationships
  const overdueFollowUps = people.filter(
    (p) => p.status !== "Archived" && p.next_follow_up_at && isOverdue(p.next_follow_up_at, todayStr)
  );
  if (overdueFollowUps.length > 0) {
    bottlenecks.push({
      id:       uid("bn", idx++),
      title:    `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length > 1 ? "s" : ""}`,
      type:     "missing_followup",
      severity: overdueFollowUps.length > 3 ? "high" : "medium",
      detail:   `Relationship momentum decays when follow-ups slip. Contacts: ${overdueFollowUps.map((p) => p.name).slice(0, 3).join(", ")}${overdueFollowUps.length > 3 ? ` +${overdueFollowUps.length - 3} more` : ""}.`,
    });
  }

  // 5. Content gap
  const publishedCount = contentItems.filter((c) => c.status === "Published").length;
  const ideasCount     = contentItems.filter((c) => c.status === "Idea").length;
  if (contentItems.length > 2 && publishedCount === 0) {
    bottlenecks.push({
      id:       uid("bn", idx++),
      title:    "No published content",
      type:     "content_gap",
      severity: ideasCount > 5 ? "high" : "medium",
      detail:   `${contentItems.length} content item${contentItems.length > 1 ? "s" : ""} exist but none are published. Ideas don't build authority — published work does.`,
    });
  }

  // 6. Priority overload
  const highPriorityActive = activeProjects(projects).filter(
    (p) => p.priority === "Critical" || p.priority === "High"
  );
  if (highPriorityActive.length > 5) {
    bottlenecks.push({
      id:       uid("bn", idx++),
      title:    `Too many simultaneous priorities (${highPriorityActive.length})`,
      type:     "priority_overload",
      severity: highPriorityActive.length > 8 ? "critical" : "high",
      detail:   `${highPriorityActive.length} active Critical/High projects compete for attention. Strategy requires focus — consider pausing or archiving the lowest-leverage ones.`,
    });
  }

  // Sort by severity
  const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
  return bottlenecks.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ── Strategic Risks ────────────────────────────────────────────────────────

function detectRisks(input: StrategicInput): StrategicRisk[] {
  const { projects, people, contentItems, opportunities, focusSessions, todayStr } = input;
  const risks: StrategicRisk[] = [];
  let idx = 0;

  // 1. Too many active projects
  const activeCount = activeProjects(projects).length;
  if (activeCount > 6) {
    risks.push({
      id:             uid("risk", idx++),
      title:          `${activeCount} active projects — attention fragmented`,
      type:           "overextension",
      severity:       activeCount > 9 ? "critical" : "high",
      recommendation: "Identify 1–3 projects to pause or archive. Momentum requires constraint.",
    });
  }

  // 2. Relationship decay
  const decayingRelationships = people.filter((p) => {
    if (p.status === "Archived" || p.priority === "Low") return false;
    if (!p.last_contacted_at) return p.priority === "Critical" || p.priority === "High";
    return daysSince(p.last_contacted_at, todayStr) > 30;
  });
  if (decayingRelationships.length > 0) {
    const criticalDecay = decayingRelationships.filter((p) => p.priority === "Critical");
    risks.push({
      id:             uid("risk", idx++),
      title:          `${decayingRelationships.length} key relationship${decayingRelationships.length > 1 ? "s" : ""} losing momentum`,
      type:           "relationship_decay",
      severity:       criticalDecay.length > 0 ? "critical" : "high",
      recommendation: `Re-engage: ${decayingRelationships.slice(0, 3).map((p) => p.name).join(", ")}. Schedule a check-in this week.`,
    });
  }

  // 3. Inconsistent execution
  if (focusSessions.length >= 5) {
    const completed  = focusSessions.filter((s) => s.status === "Completed").length;
    const rate       = completed / focusSessions.length;
    if (rate < 0.5) {
      risks.push({
        id:             uid("risk", idx++),
        title:          `Low focus completion rate (${Math.round(rate * 100)}%)`,
        type:           "inconsistent_execution",
        severity:       rate < 0.3 ? "critical" : "high",
        recommendation: "Shorten session targets or reduce ambient distractions. Completion builds momentum.",
      });
    }
  }

  // 4. Revenue concentration — all opps same type
  const activeOpps = opportunities.filter((o) => o.status === "Active" || o.status === "Detected");
  if (activeOpps.length >= 3) {
    const types = new Set(activeOpps.map((o) => o.type));
    if (types.size === 1) {
      risks.push({
        id:             uid("risk", idx++),
        title:          "All active opportunities in one category",
        type:           "revenue_concentration",
        severity:       "medium",
        recommendation: `Diversify opportunity types beyond "${[...types][0]}". Single-category reliance creates fragility.`,
      });
    }
  }

  // 5. No published proof of work
  const publishedContent  = contentItems.filter((c) => c.status === "Published").length;
  const shippedProjects   = projects.filter((p) => p.status === "Shipped").length;
  if (publishedContent === 0 && shippedProjects === 0 && contentItems.length > 0) {
    risks.push({
      id:             uid("risk", idx++),
      title:          "No published proof-of-work",
      type:           "visibility_gap",
      severity:       "high",
      recommendation: "Ship one thing publicly — a post, a project, a case study. Visibility compounds; invisibility doesn't.",
    });
  }

  // 6. No clear revenue path
  const revenueOpps = opportunities.filter(
    (o) => (o.type === "Revenue" || o.type === "Client") && o.status !== "Archived"
  );
  if (activeCount >= 3 && revenueOpps.length === 0) {
    risks.push({
      id:             uid("risk", idx++),
      title:          "No active revenue opportunities tracked",
      type:           "revenue_gap",
      severity:       "high",
      recommendation: "Add at least one Client or Revenue opportunity to the pipeline. Strategy without revenue path is a hobby.",
    });
  }

  const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
  return risks.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ── 30 / 60 / 90 Day Plans ─────────────────────────────────────────────────

function buildThirtyDayPlan(input: StrategicInput, bottlenecks: Bottleneck[]): HorizonPlan {
  const { projects, projectTasks, actionResult, todayStr } = input;
  const active = activeProjects(projects);

  // Priorities: top critical overdue tasks + highest priority project next actions
  const overdueTasks = projectTasks
    .filter((t) => t.status !== "Done" && t.due_date && isOverdue(t.due_date, todayStr) &&
      (t.priority === "Critical" || t.priority === "High"))
    .slice(0, 3);

  const criticalProjects = active
    .filter((p) => p.priority === "Critical" || p.priority === "High")
    .slice(0, 3);

  const priorities: string[] = [
    ...overdueTasks.map((t) => `[OVERDUE] ${t.title}`),
    ...criticalProjects
      .filter((p) => !overdueTasks.some((t) => t.project_id === p.id))
      .map((p) => p.next_action?.trim() || `Advance "${p.title}"`)
      .filter(Boolean),
  ].slice(0, 4);

  // Milestones: project due dates in next 30 days
  const in30 = new Date(todayStr + "T00:00:00");
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);

  const milestones: string[] = active
    .filter((p) => p.due_date && p.due_date >= todayStr && p.due_date <= in30Str)
    .map((p) => `${p.title} — due ${p.due_date}`)
    .slice(0, 3);

  // Actions: from action engine or bottleneck removal
  const actions: string[] = [];
  if (actionResult && actionResult.actions.length > 0) {
    actions.push(...actionResult.actions.slice(0, 3).map((a) => a.title));
  }
  const stalledBottleneck = bottlenecks.find((b) => b.type === "stalled_project");
  if (stalledBottleneck) actions.push(`Unblock: ${stalledBottleneck.title}`);
  if (actions.length === 0) {
    actions.push("Define one deliverable per active project");
    actions.push("Schedule a weekly review block");
  }

  return {
    label:      "30 Days",
    priorities: priorities.length > 0
      ? priorities
      : criticalProjects.slice(0, 3).map((p) => `Advance "${p.title}"`),
    milestones: milestones.length > 0 ? milestones : ["Ship one visible deliverable"],
    actions:    actions.slice(0, 4),
    goals:      [
      `Close ${Math.max(1, overdueTasks.length)} overdue items`,
      "Establish daily execution rhythm",
    ],
  };
}

function buildSixtyDayPlan(
  input: StrategicInput,
  objectives: StrategicObjective[]
): HorizonPlan {
  const { contentItems, opportunities } = input;

  // Content ready to publish in the 60-day window
  const readyContent = contentItems.filter((c) => c.status === "Ready" || c.status === "Drafting");

  // Partnership goals: high-score active opportunities
  const partnerOpps = opportunities
    .filter((o) => o.status === "Active" || o.status === "Reviewing")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const goals: string[] = partnerOpps.map(
    (o) => `Advance "${o.title}" — ${o.suggested_action || "next step"}`
  );

  // Priorities: second-tier objectives
  const priorities: string[] = objectives
    .slice(1, 4)
    .map((o) => o.title);

  // Milestones
  const milestones = [
    readyContent.length > 0
      ? `${readyContent.length} content piece${readyContent.length > 1 ? "s" : ""} published`
      : "Content engine shipping",
    partnerOpps.length > 0
      ? `${partnerOpps.length} active opportunity${partnerOpps.length > 1 ? " paths" : ""} advanced`
      : "Opportunity pipeline filled",
    "Weekly operating rhythm established",
  ];

  return {
    label:      "60 Days",
    priorities: priorities.length > 0 ? priorities : ["Advance top 3 strategic objectives"],
    milestones,
    actions: [
      "Conduct mid-point strategy review",
      "Archive or pause lowest-leverage projects",
      "Schedule 1:1s with top-priority relationships",
    ],
    goals: goals.length > 0 ? goals : ["Advance primary opportunity pipeline"],
  };
}

function buildNinetyDayPlan(
  input: StrategicInput,
  objectives: StrategicObjective[],
  northStar: NorthStar
): HorizonPlan {
  const { projects, opportunities, contentItems } = input;

  const shippableProjects = activeProjects(projects).filter((p) => p.priority === "Critical");

  // Outcomes
  const outcomes: string[] = [];
  for (const p of shippableProjects.slice(0, 2)) {
    outcomes.push(`"${p.title}" shipped or at milestone`);
  }
  if (objectives[0]) outcomes.push(objectives[0].title + " — measurable progress");
  if (outcomes.length === 0) outcomes.push("Primary objective achieved or substantially advanced");

  // Revenue goals
  const revenueOpps = opportunities.filter(
    (o) => (o.type === "Revenue" || o.type === "Client") && o.status !== "Archived"
  );
  const goals: string[] = revenueOpps.length > 0
    ? [`Convert at least ${Math.ceil(revenueOpps.length * 0.4)} of ${revenueOpps.length} active revenue opportunities`]
    : ["Identify and activate first paid engagement"];

  const publishedCount = contentItems.filter((c) => c.status === "Published").length;
  if (publishedCount < 3) {
    goals.push("Reach 3+ published proof-of-work pieces");
  }

  return {
    label:      "90 Days",
    priorities: [
      northStar.title,
      ...objectives.slice(0, 2).map((o) => o.title),
    ],
    milestones: [
      "90-day strategy review complete",
      "North star objective measurably advanced",
      "Clear pipeline of next-quarter priorities",
    ],
    actions: [
      "Full strategy retrospective — what worked, what didn't",
      "Update vision and set new 90-day plan",
      "Identify leverage points for Q2+",
    ],
    goals,
  };
}

// ── Sequencing Engine ──────────────────────────────────────────────────────

function buildSequencing(
  bottlenecks: Bottleneck[],
  dependencies: DependencyChain[],
  objectives: StrategicObjective[],
  actionResult?: ActionEngineResult
): SequenceStep[] {
  const steps: SequenceStep[] = [];
  let order = 1;

  // 1. Clear the hardest blockers first (critical bottlenecks)
  for (const bn of bottlenecks.filter((b) => b.severity === "critical").slice(0, 2)) {
    steps.push({
      order: order++,
      action: `Remove: ${bn.title}`,
      reason: "Critical bottlenecks block every downstream priority.",
    });
  }

  // 2. Resolve blocking dependencies (isBlocking chains)
  for (const dep of dependencies.filter((d) => d.isBlocking).slice(0, 2)) {
    steps.push({
      order: order++,
      action: `Advance "${dep.steps[0]}" → unlocks ${dep.steps.slice(1).join(" → ")}`,
      reason: dep.description,
    });
  }

  // 3. Top objective
  if (objectives[0]) {
    steps.push({
      order: order++,
      action: objectives[0].title,
      reason: `Your #1 strategic objective — ${objectives[0].whyItMatters}`,
    });
  }

  // 4. Action engine's top recommended action
  if (actionResult && actionResult.actions.length > 0) {
    const top = actionResult.actions[0];
    if (!steps.some((s) => s.action.toLowerCase().includes(top.title.toLowerCase().slice(0, 20)))) {
      steps.push({
        order: order++,
        action: top.title,
        reason: top.reason,
      });
    }
  }

  // 5. High bottlenecks
  for (const bn of bottlenecks.filter((b) => b.severity === "high").slice(0, 1)) {
    steps.push({
      order: order++,
      action: `Address: ${bn.title}`,
      reason: "High-severity bottleneck limiting throughput.",
    });
  }

  // 6. Second objective
  if (objectives[1]) {
    steps.push({
      order: order++,
      action: objectives[1].title,
      reason: objectives[1].whyItMatters,
    });
  }

  // 7. Non-blocking dependency chains
  for (const dep of dependencies.filter((d) => !d.isBlocking).slice(0, 1)) {
    steps.push({
      order: order++,
      action: `Build chain: ${dep.steps.join(" → ")}`,
      reason: dep.description,
    });
  }

  // Ensure minimum output
  if (steps.length === 0) {
    steps.push({ order: 1, action: "Define your north star and top 3 priorities", reason: "Clarity precedes execution." });
    steps.push({ order: 2, action: "Audit and prune active projects list", reason: "Focus requires constraint." });
    steps.push({ order: 3, action: "Ship one visible deliverable", reason: "Proof-of-work builds momentum and trust." });
  }

  return steps;
}

// ── Confidence Scoring ─────────────────────────────────────────────────────

function scoreConfidence(input: StrategicInput): number {
  const { visionData, projects, people, contentItems, focusSessions, actionResult } = input;
  let score = 40; // base

  // Vision clarity
  if (visionData.yr1.filter((v) => v.trim()).length > 0) score += 12;
  if (visionData.yr3.filter((v) => v.trim()).length > 0) score += 5;

  // Active project count (richness, not overload)
  const active = activeProjects(projects).length;
  if (active >= 2 && active <= 6) score += 10;
  else if (active > 6) score += 3;

  // Relationship data
  if (people.length >= 3) score += 8;

  // Content pipeline health
  const publishedContent = contentItems.filter((c) => c.status === "Published").length;
  if (publishedContent > 0) score += 8;
  else if (contentItems.length > 2) score += 3;

  // Execution history
  if (focusSessions.length >= 5) {
    const completionRate = focusSessions.filter((s) => s.status === "Completed").length / focusSessions.length;
    if (completionRate >= 0.7) score += 10;
    else if (completionRate >= 0.5) score += 5;
  }

  // Action engine available
  if (actionResult && actionResult.actions.length > 0) score += 7;

  return clamp(score, 20, 96);
}

// ── Reasoning ─────────────────────────────────────────────────────────────

function buildReasoning(
  input: StrategicInput,
  northStar: NorthStar,
  objectives: StrategicObjective[],
  bottlenecks: Bottleneck[],
  risks: StrategicRisk[],
  confidence: number
): string {
  const lines: string[] = [];

  lines.push(`**North Star:** "${northStar.title}" — ${northStar.rationale}`);

  lines.push(
    `**Top Objectives (${objectives.length}):** ${objectives.map((o) => `"${o.title}" (${o.impact} impact, ${o.difficulty})`).join("; ")}.`
  );

  if (bottlenecks.length > 0) {
    const critical = bottlenecks.filter((b) => b.severity === "critical");
    lines.push(
      `**Bottlenecks:** ${bottlenecks.length} detected${critical.length > 0 ? `, ${critical.length} critical` : ""}. Primary: ${bottlenecks[0].title}.`
    );
  }

  if (risks.length > 0) {
    lines.push(
      `**Risks:** ${risks.length} strategic risk${risks.length > 1 ? "s" : ""} identified. Most urgent: ${risks[0].title}.`
    );
  }

  lines.push(
    `**Confidence (${confidence}/100):** ${confidence >= 80
      ? "High — strong data foundation and execution history."
      : confidence >= 60
      ? "Moderate — good data but some gaps in execution consistency or vision clarity."
      : "Low — limited data. Fill in vision (/planner), relationships, and content pipeline for better guidance."
    }`
  );

  if (input.chiefBrief) {
    const aligned = objectives.some((o) =>
      input.chiefBrief!.highestLeverageAction.title.toLowerCase().includes(
        o.title.toLowerCase().slice(0, 15)
      )
    );
    lines.push(
      `**Chief of Staff alignment:** ${aligned
        ? "Today's highest-leverage action aligns with a top strategic objective."
        : "Today's highest-leverage action does not directly match a top strategic objective — consider whether daily execution reflects long-term strategy."
      }`
    );
  }

  return lines.join("\n\n");
}

// ── Main Export ────────────────────────────────────────────────────────────

export function computeStrategicPlan(input: StrategicInput): StrategicPlan {
  const northStar   = deriveNorthStar(input);
  const objectives  = deriveObjectives(input);
  const bottlenecks = detectBottlenecks(input);
  const dependencies = detectDependencies(input);
  const risks       = detectRisks(input);
  const confidence  = scoreConfidence(input);

  const thirtyDayPlan  = buildThirtyDayPlan(input, bottlenecks);
  const sixtyDayPlan   = buildSixtyDayPlan(input, objectives);
  const ninetyDayPlan  = buildNinetyDayPlan(input, objectives, northStar);
  const sequencing     = buildSequencing(bottlenecks, dependencies, objectives, input.actionResult);
  const reasoning      = buildReasoning(input, northStar, objectives, bottlenecks, risks, confidence);

  return {
    generatedAt: new Date().toISOString(),
    northStar,
    topObjectives:  objectives,
    bottlenecks,
    dependencies,
    strategicRisks: risks,
    thirtyDayPlan,
    sixtyDayPlan,
    ninetyDayPlan,
    sequencing,
    confidence,
    reasoning,
  };
}
