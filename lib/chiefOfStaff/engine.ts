/**
 * lib/chiefOfStaff/engine.ts
 *
 * Chief of Staff Engine — Sovereign OS v5.0
 *
 * Deterministic synthesis layer above Focus Engine and Daily Briefing.
 * No AI calls — pure computation from localStorage data.
 * Produces a ChiefOfStaffBrief consumed by /chief page and homepage widget.
 */

import type { MemoryItem } from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem, DailyBriefing } from "@/lib/briefing/daily";
import type { FocusEngineResult } from "@/lib/focus/engine";

// ── Input ──────────────────────────────────────────────────────────────────

export interface ChiefInput {
  todayStr:      string;                 // YYYY-MM-DD
  projects:      Project[];
  projectTasks:  ProjectTask[];
  memoryItems:   MemoryItem[];
  contentItems:  ContentItem[];
  dailyItems:    PlannerItem[];
  weeklyItems:   PlannerItem[];
  monthlyItems:  string[];
  habits:        HabitEntry[];
  habitLog:      Record<string, string[]>;
  visionData:    { yr1: string[]; yr3: string[]; yr5: string[] };
  focusEngine:   FocusEngineResult;
  dailyBriefing: DailyBriefing | null;
  focusSessions: Array<{ date: string; completedAt?: string; abandoned?: boolean }>;
}

// ── Output ─────────────────────────────────────────────────────────────────

export interface LeverageAction {
  title:           string;
  reason:          string;
  impact:          string;
  relatedProject?: string;
}

export type RiskSeverity = "critical" | "high" | "medium";

export interface RiskSignal {
  title:          string;
  severity:       RiskSeverity;
  recommendation: string;
}

export interface BlockedItem {
  text:          string;
  reason:        string;
  projectName?:  string;
}

export type OpportunityType = "content" | "leverage" | "relationship" | "repurpose";

export interface Opportunity {
  title:       string;
  type:        OpportunityType;
  description: string;
  action:      string;
}

export type ScheduleFocus = "deep-work" | "admin" | "creator" | "habits" | "review";

export interface ScheduleBlock {
  time:        string;
  label:       string;
  description: string;
  focus:       ScheduleFocus;
}

export interface ScoredMetric {
  score:       number;
  explanation: string;
}

export interface ChiefOfStaffBrief {
  generatedAt:           string;
  executiveSummary:      string;
  highestLeverageAction: LeverageAction;
  biggestRisk:           RiskSignal;
  blockedItems:          BlockedItem[];
  opportunities:         Opportunity[];
  recommendedSchedule:   ScheduleBlock[];
  weeklyMomentum:        ScoredMetric;
  strategicAlignment:    ScoredMetric;
  reasoning:             string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000
  );
}

// ── Scoring ────────────────────────────────────────────────────────────────

function scoreWeeklyMomentum(input: ChiefInput): ScoredMetric {
  const { todayStr, habits, habitLog, focusSessions, projectTasks } = input;

  // Habit completion last 7 days (40 pts)
  let habitPts = 0;
  if (habits.length > 0) {
    let totalPossible = 0;
    let totalDone = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const doneTodayIds = new Set(habitLog[ds] ?? []);
      totalPossible += habits.length;
      totalDone += habits.filter((h) => doneTodayIds.has(h.id)).length;
    }
    habitPts = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 40) : 0;
  }

  // Focus sessions this week (25 pts)
  const sessionCount = focusSessions.filter((s) => {
    if (!s.completedAt && !s.date) return false;
    const sessionDate = s.completedAt ? s.completedAt.slice(0, 10) : s.date;
    return daysBetween(sessionDate, todayStr) <= 6 && !s.abandoned;
  }).length;
  const sessionPts = clamp(sessionCount * 5, 0, 25);

  // Completed tasks this week proxy (20 pts)
  const completedTasks = projectTasks.filter((t) => t.status === "Done").length;
  const taskPts = clamp(completedTasks * 4, 0, 20);

  // Overdue penalty (-7 each, max -35)
  const today = new Date(todayStr + "T00:00:00");
  const overdueCount = projectTasks.filter((t) => {
    if (t.status === "Done" || !t.due_date) return false;
    return new Date(t.due_date + "T00:00:00") < today;
  }).length;
  const overduePenalty = clamp(overdueCount * 7, 0, 35);

  // Base 15
  const raw = 15 + habitPts + sessionPts + taskPts - overduePenalty;
  const score = clamp(raw, 0, 100);

  const parts: string[] = [];
  if (habitPts >= 30) parts.push("strong habit consistency");
  else if (habitPts >= 15) parts.push("partial habit completion");
  else parts.push("low habit completion");

  if (sessionPts >= 20) parts.push("high focus session output");
  else if (sessionPts >= 10) parts.push("moderate focus sessions");
  else parts.push("few focus sessions logged");

  if (overdueCount > 0) parts.push(`${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} dragging score`);

  return {
    score,
    explanation: parts.join("; "),
  };
}

function scoreStrategicAlignment(input: ChiefInput): ScoredMetric {
  const { visionData, weeklyItems, projects, contentItems, focusEngine } = input;

  // Vision defined (30 pts)
  const visionDepth =
    (visionData.yr1.length > 0 ? 10 : 0) +
    (visionData.yr3.length > 0 ? 10 : 0) +
    (visionData.yr5.length > 0 ? 10 : 0);

  // Weekly goals exist (20 pts)
  const weeklyPts = weeklyItems.length > 0 ? 20 : 0;

  // Top priority aligns with vision keywords (25 pts)
  let alignmentPts = 0;
  if (focusEngine.topThree.length > 0) {
    const topText = focusEngine.topThree[0].text.toLowerCase();
    const allVision = [
      ...visionData.yr1,
      ...visionData.yr3,
      ...visionData.yr5,
    ]
      .join(" ")
      .toLowerCase();

    const visionWords = allVision
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const matched = visionWords.some((w) => topText.includes(w));
    if (matched) alignmentPts = 25;
    else {
      // Partial: check any of top 3
      const anyMatch = focusEngine.topThree.some((p) =>
        visionWords.some((w) => p.text.toLowerCase().includes(w))
      );
      if (anyMatch) alignmentPts = 12;
    }
  }

  // Active high-priority project (15 pts)
  const hasHighProject = projects.some(
    (p) => p.status !== "Archived" && (p.priority === "High" || p.priority === "Critical")
  );
  const projectPts = hasHighProject ? 15 : 0;

  // Content in progress or published (10 pts)
  const hasContent = contentItems.some(
    (c) => c.status === "Ready" || c.status === "Published" || c.status === "Drafting"
  );
  const contentPts = hasContent ? 10 : 0;

  const score = clamp(visionDepth + weeklyPts + alignmentPts + projectPts + contentPts, 0, 100);

  const parts: string[] = [];
  if (visionDepth >= 30) parts.push("vision fully defined (1yr + 3yr + 5yr)");
  else if (visionDepth > 0) parts.push("vision partially defined");
  else parts.push("no vision goals set");

  if (weeklyPts > 0) parts.push("weekly goals active");
  if (alignmentPts >= 25) parts.push("top priority matches vision");
  else if (alignmentPts > 0) parts.push("partial vision alignment");
  else parts.push("top priorities don't match vision keywords");

  if (!hasHighProject) parts.push("no high-priority active project");

  return { score, explanation: parts.join("; ") };
}

// ── Executive Summary ──────────────────────────────────────────────────────

function buildExecutiveSummary(
  input: ChiefInput,
  momentum: ScoredMetric,
  alignment: ScoredMetric
): string {
  const { projects, projectTasks, contentItems, dailyBriefing } = input;

  const activeProjCount = projects.filter((p) => p.status !== "Archived").length;
  const overdueTaskCount = projectTasks.filter((t) => {
    if (t.status === "Done" || !t.due_date) return false;
    const today = new Date(input.todayStr + "T00:00:00");
    return new Date(t.due_date + "T00:00:00") < today;
  }).length;
  const readyContent = contentItems.filter((c) => c.status === "Ready").length;

  const momentumLabel =
    momentum.score >= 75 ? "strong momentum" :
    momentum.score >= 50 ? "moderate momentum" :
    "low momentum";

  const alignLabel =
    alignment.score >= 75 ? "well-aligned" :
    alignment.score >= 45 ? "partially aligned" :
    "misaligned";

  let summary = `You have ${activeProjCount} active project${activeProjCount !== 1 ? "s" : ""} and are operating with ${momentumLabel} (${momentum.score}/100), ${alignLabel} with your vision (${alignment.score}/100).`;

  if (overdueTaskCount > 0) {
    summary += ` There ${overdueTaskCount === 1 ? "is" : "are"} ${overdueTaskCount} overdue task${overdueTaskCount > 1 ? "s" : ""} requiring attention.`;
  }
  if (readyContent > 0) {
    summary += ` ${readyContent} content piece${readyContent > 1 ? "s are" : " is"} ready to publish.`;
  }
  if (dailyBriefing?.headline) {
    summary += ` ${dailyBriefing.headline}`;
  }

  return summary;
}

// ── Highest Leverage Action ────────────────────────────────────────────────

function findHighestLeverageAction(input: ChiefInput): LeverageAction {
  const { focusEngine, contentItems, projects, projectTasks } = input;

  // Priority 1: Ready-to-publish content with no publish date (fastest win)
  const readyNow = contentItems.find(
    (c) =>
      c.status === "Ready" &&
      !c.publish_date &&
      (c.priority === "High" || c.priority === "Critical")
  );
  if (readyNow) {
    return {
      title:          `Publish: "${readyNow.title}"`,
      reason:         "High-priority content is Ready — publishing it creates immediate audience value and compounds future reach.",
      impact:         "Audience growth, brand presence, content momentum",
      relatedProject: projects.find((p) => p.id === readyNow.related_project_id)?.title,
    };
  }

  // Priority 2: Top focus engine priority
  if (focusEngine.topThree.length > 0) {
    const top = focusEngine.topThree[0];
    return {
      title:          top.text,
      reason:         focusEngine.whyItMatters[0]?.whyNow ?? "Highest-ranked by Focus Engine.",
      impact:         focusEngine.whyItMatters[0]?.impact ?? "Moves the most important needle today.",
      relatedProject: top.projectName,
    };
  }

  // Priority 3: First overdue critical task
  const today = new Date(input.todayStr + "T00:00:00");
  const overdueCritical = projectTasks.find((t) => {
    if (t.status === "Done" || !t.due_date) return false;
    return (
      new Date(t.due_date + "T00:00:00") < today &&
      t.priority === "Critical"
    );
  });
  if (overdueCritical) {
    const proj = projects.find((p) => p.id === overdueCritical.project_id);
    return {
      title:          overdueCritical.title,
      reason:         "This task is overdue and critical. Clearing it removes a drag on every other metric.",
      impact:         "Momentum recovery, project health",
      relatedProject: proj?.title,
    };
  }

  // Fallback
  return {
    title:  "Define today's #1 outcome",
    reason: "No dominant priority found. Spend 5 minutes deciding what would make today a success.",
    impact: "Clarity, momentum, intentional action",
  };
}

// ── Biggest Risk ───────────────────────────────────────────────────────────

function findBiggestRisk(input: ChiefInput): RiskSignal {
  const { projectTasks, projects, contentItems, todayStr } = input;
  const today = new Date(todayStr + "T00:00:00");

  // Critical overdue tasks
  const criticalOverdue = projectTasks.filter(
    (t) => t.status !== "Done" && t.due_date && new Date(t.due_date + "T00:00:00") < today && t.priority === "Critical"
  );
  if (criticalOverdue.length > 0) {
    return {
      title:          `${criticalOverdue.length} critical overdue task${criticalOverdue.length > 1 ? "s" : ""}`,
      severity:       "critical",
      recommendation: "Block time today to clear at least one. Overdue critical tasks compound into project risk.",
    };
  }

  // Project with no active tasks
  const activeProjects = projects.filter((p) => p.status !== "Archived");
  const stalledProject = activeProjects.find((p) => {
    const tasks = projectTasks.filter((t) => t.project_id === p.id && t.status !== "Done");
    return tasks.length === 0 && (p.priority === "High" || p.priority === "Critical");
  });
  if (stalledProject) {
    return {
      title:          `"${stalledProject.title}" has no open tasks`,
      severity:       "high",
      recommendation: "Add a next action to this project. Projects without tasks stall silently.",
    };
  }

  // Ready content sitting unpublished > 7 days
  const staleReady = contentItems.find((c) => {
    if (c.status !== "Ready") return false;
    return daysBetween(c.updated_at.slice(0, 10), todayStr) > 7;
  });
  if (staleReady) {
    return {
      title:          `Content sitting in "Ready" for 7+ days`,
      severity:       "high",
      recommendation: `Schedule "${staleReady.title}" to publish. Ready content that sits loses relevance and momentum.`,
    };
  }

  // Many high-priority tasks open (overload risk)
  const highOpen = projectTasks.filter(
    (t) => t.status !== "Done" && (t.priority === "Critical" || t.priority === "High")
  ).length;
  if (highOpen > 8) {
    return {
      title:          `${highOpen} high-priority tasks competing for attention`,
      severity:       "medium",
      recommendation: "Too many 'high priority' items dilutes the signal. Archive or downgrade at least 3.",
    };
  }

  return {
    title:          "No acute risks detected",
    severity:       "medium",
    recommendation: "Maintain current trajectory. Review overdue items weekly to stay ahead of risk.",
  };
}

// ── Blocked Items ──────────────────────────────────────────────────────────

function findBlockedItems(input: ChiefInput): BlockedItem[] {
  const { projects, projectTasks, todayStr } = input;
  const blocked: BlockedItem[] = [];

  // Projects with "Paused" status (proxy for blocked — no "Blocked" status in schema)
  projects
    .filter((p) => p.status === "Paused")
    .forEach((p) => {
      blocked.push({
        text:        p.title,
        reason:      "Project is paused — identify what needs to happen to reactivate it.",
        projectName: p.title,
      });
    });

  // Tasks with "blocked" in title/notes or overdue by 14+ days
  projectTasks
    .filter((t) => {
      if (t.status === "Done") return false;
      if (t.title.toLowerCase().includes("blocked")) return true;
      if (t.due_date && daysBetween(t.due_date, todayStr) > 14) return true;
      return false;
    })
    .slice(0, 3)
    .forEach((t) => {
      const proj = projects.find((p) => p.id === t.project_id);
      const isLong = t.due_date && daysBetween(t.due_date, todayStr) > 14;
      blocked.push({
        text:        t.title,
        reason:      isLong ? `Overdue by ${daysBetween(t.due_date!, todayStr)} days` : "Marked as blocked.",
        projectName: proj?.title,
      });
    });

  return blocked.slice(0, 5);
}

// ── Opportunities ──────────────────────────────────────────────────────────

function findOpportunities(input: ChiefInput): Opportunity[] {
  const { contentItems, projects, memoryItems } = input;
  const opportunities: Opportunity[] = [];

  // 1. Ready content without publish date → publish now
  const readyUnscheduled = contentItems.filter(
    (c) => c.status === "Ready" && !c.publish_date
  );
  if (readyUnscheduled.length > 0) {
    opportunities.push({
      title:       `Publish ${readyUnscheduled.length} ready piece${readyUnscheduled.length > 1 ? "s" : ""}`,
      type:        "content",
      description: `${readyUnscheduled.map((c) => `"${c.title}"`).slice(0, 2).join(", ")}${readyUnscheduled.length > 2 ? ` + ${readyUnscheduled.length - 2} more` : ""} ${readyUnscheduled.length > 1 ? "are" : "is"} ready with no publish date.`,
      action:      "Schedule or publish directly — max leverage with minimum effort.",
    });
  }

  // 2. Shipped project without case-study memory
  const shippedProjects = projects.filter((p) => p.status === "Shipped");
  shippedProjects.forEach((p) => {
    const hasCaseStudy = memoryItems.some(
      (m) =>
        m.title.toLowerCase().includes(p.title.toLowerCase().slice(0, 8)) &&
        (m.type === "Note" || m.type === "Project Context")
    );
    if (!hasCaseStudy) {
      opportunities.push({
        title:       `Case study: "${p.title}"`,
        type:        "leverage",
        description: `"${p.title}" shipped but has no documented case study or learning.`,
        action:      "Write a 3-sentence case study and add it as a Memory item or content piece.",
      });
    }
  });

  // 3. High-importance person/meeting memory without linked project
  const relationshipMems = memoryItems.filter(
    (m) =>
      (m.type === "Person" || m.type === "Meeting") &&
      m.importance === "High" &&
      !projects.some((p) => p.title.toLowerCase().includes(m.title.toLowerCase().slice(0, 6)))
  );
  if (relationshipMems.length > 0) {
    const top = relationshipMems[0];
    opportunities.push({
      title:       `Follow up: ${top.title}`,
      type:        "relationship",
      description: `High-importance ${top.type.toLowerCase()} memory with no linked project or follow-through.`,
      action:      "Schedule a follow-up or create a project to capture the opportunity.",
    });
  }

  // 4. Published/Ready Video → repurpose to newsletter/post
  const videoContent = contentItems.find(
    (c) =>
      (c.format === "Video" || c.format === "Short") &&
      (c.status === "Published" || c.status === "Ready") &&
      !contentItems.some(
        (other) =>
          other.id !== c.id &&
          (other.format === "Email" || other.format === "Post") &&
          other.title.toLowerCase().includes(c.title.toLowerCase().slice(0, 8))
      )
  );
  if (videoContent) {
    opportunities.push({
      title:       `Repurpose: "${videoContent.title}"`,
      type:        "repurpose",
      description: `Video content with no matching newsletter or post detected.`,
      action:      "Convert the script or key points into a LinkedIn post or newsletter.",
    });
  }

  // 5. High-priority idea with no publish date
  const unscheduledIdea = contentItems.find(
    (c) =>
      c.status === "Idea" &&
      (c.priority === "High" || c.priority === "Critical") &&
      !c.publish_date
  );
  if (unscheduledIdea) {
    opportunities.push({
      title:       `Schedule: "${unscheduledIdea.title}"`,
      type:        "content",
      description: `High-priority content idea with no publish date has been drifting.`,
      action:      "Set a publish date or move it to Drafting to activate it.",
    });
  }

  return opportunities.slice(0, 3);
}

// ── Recommended Schedule ───────────────────────────────────────────────────

function buildSchedule(input: ChiefInput): ScheduleBlock[] {
  const { focusEngine, habits, habitLog, todayStr } = input;

  const top = focusEngine.topThree;

  // Check how many habits not yet done today
  const doneTodayIds = new Set(habitLog[todayStr] ?? []);
  const pendingHabits = habits.filter((h) => !doneTodayIds.has(h.id));

  const schedule: ScheduleBlock[] = [];

  // Morning: Deep work on #1 priority
  schedule.push({
    time:  "9:00 – 11:00 AM",
    label: top[0] ? `Deep work: ${top[0].text.slice(0, 50)}${top[0].text.length > 50 ? "…" : ""}` : "Deep work block",
    description: top[0]
      ? `Protected deep work on your top priority. Silence notifications. Single task.`
      : `Reserve this block for your highest-priority work. Identify it before sitting down.`,
    focus: "deep-work",
  });

  // Midday: Admin + habits
  const hasPendingHabits = pendingHabits.length > 0;
  schedule.push({
    time:  "11:00 AM – 1:00 PM",
    label: top[1] ? `${top[1].text.slice(0, 40)}${top[1].text.length > 40 ? "…" : ""} + admin` : "Admin + habits",
    description: hasPendingHabits
      ? `Work on priority #2, clear inbox, handle comms. ${pendingHabits.length} habit${pendingHabits.length > 1 ? "s" : ""} still pending — knock them out before noon if possible.`
      : `Work on priority #2, clear inbox, handle comms. Habits complete — keep the streak.`,
    focus: hasPendingHabits ? "habits" : "admin",
  });

  // Afternoon: Content creation or priority #3 + review
  schedule.push({
    time:  "1:00 – 4:00 PM",
    label: top[2] ? `${top[2].text.slice(0, 40)}${top[2].text.length > 40 ? "…" : ""} + review` : "Content creation + review",
    description: `Tackle priority #3 or create content. End with a 15-min review: what shipped, what's moving to tomorrow, and a win worth logging.`,
    focus: "creator",
  });

  return schedule;
}

// ── Reasoning ─────────────────────────────────────────────────────────────

function buildReasoning(
  input: ChiefInput,
  momentum: ScoredMetric,
  alignment: ScoredMetric,
  action: LeverageAction,
  risk: RiskSignal
): string {
  const { focusEngine } = input;

  const lines: string[] = [];

  lines.push(
    `**Momentum (${momentum.score}/100):** ${momentum.explanation}.`
  );
  lines.push(
    `**Alignment (${alignment.score}/100):** ${alignment.explanation}.`
  );
  lines.push(
    `**Top priority selection:** "${action.title}" was chosen because ${action.reason.toLowerCase()}`
  );
  lines.push(
    `**Primary risk:** ${risk.title} — ${risk.recommendation}`
  );
  if (focusEngine.avoidList.length > 0) {
    lines.push(
      `**Avoid today:** ${focusEngine.avoidList.slice(0, 3).join("; ")}.`
    );
  }

  return lines.join("\n\n");
}

// ── Main Export ────────────────────────────────────────────────────────────

export function computeChiefOfStaffBrief(input: ChiefInput): ChiefOfStaffBrief {
  const momentum  = scoreWeeklyMomentum(input);
  const alignment = scoreStrategicAlignment(input);
  const action    = findHighestLeverageAction(input);
  const risk      = findBiggestRisk(input);
  const blocked   = findBlockedItems(input);
  const opps      = findOpportunities(input);
  const schedule  = buildSchedule(input);
  const summary   = buildExecutiveSummary(input, momentum, alignment);
  const reasoning = buildReasoning(input, momentum, alignment, action, risk);

  return {
    generatedAt:           new Date().toISOString(),
    executiveSummary:      summary,
    highestLeverageAction: action,
    biggestRisk:           risk,
    blockedItems:          blocked,
    opportunities:         opps,
    recommendedSchedule:   schedule,
    weeklyMomentum:        momentum,
    strategicAlignment:    alignment,
    reasoning,
  };
}
