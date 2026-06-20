/**
 * lib/weeklyReview/engine.ts
 *
 * Weekly Review Engine — Sovereign OS v6.2
 *
 * Reviews the current week: completed work, slipped items, wins, blockers,
 * habit consistency, focus stats, strategic alignment, and next-week focus.
 * Pure computation — no AI calls.
 */

import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem } from "@/lib/types/memory";
import type { FocusSession } from "@/lib/types/execution";
import type { HabitEntry } from "@/lib/memory/context";
import type { StrategicPlan } from "@/lib/strategicPlanner/engine";
import type { DecompositionResult } from "@/lib/goalDecomposition/engine";
import type { ActionEngineResult } from "@/lib/actionEngine/engine";

// ── Output Types ────────────────────────────────────────────────────────────

export interface CompletedItem {
  id:           string;
  title:        string;
  type:         "task" | "content" | "opportunity" | "focus";
  projectTitle: string;
  projectId:    string;
  completedAt:  string;
}

export type SlipSeverity = "critical" | "high" | "medium";
export type SlipType     = "task" | "content" | "followup";

export interface SlippedItem {
  id:       string;
  title:    string;
  type:     SlipType;
  dueDate:  string;
  severity: SlipSeverity;
  reason:   string;
}

export type WinType = "task" | "habit" | "content" | "focus" | "relationship" | "opportunity";

export interface Win {
  id:          string;
  title:       string;
  description: string;
  type:        WinType;
}

export interface Blocker {
  id:     string;
  title:  string;
  type:   "project" | "task" | "external";
  detail: string;
}

export interface ReviewFollowUp {
  id:         string;
  personId:   string;
  personName: string;
  dueDate:    string;
  isOverdue:  boolean;
  priority:   string;
}

export interface ContentProgress {
  created:   number;
  movedReady: number;
  published: number;
  items:     { title: string; status: string }[];
}

export interface HabitDayEntry {
  date:      string;
  completed: number;
  total:     number;
}

export interface HabitConsistency {
  score:           number;         // 0–100
  completionByDay: HabitDayEntry[];
  perfectDays:     number;
  bestStreak:      number;
  lowestHabit?:    { name: string; rate: number };
}

export interface FocusStats {
  totalSessions:      number;
  completedSessions:  number;
  abandonedSessions:  number;
  totalMinutes:       number;
  avgSessionMinutes:  number;
  longestSession:     number;
  topProjectTitle:    string;
}

export interface StrategicAlignmentScore {
  score:            number;   // 0–100
  completedAligned: number;
  totalCompleted:   number;
  note:             string;
}

export type RecommendationPriority = "critical" | "high" | "medium";
export type RecommendationSource   = "slipped" | "blocker" | "strategy" | "habit" | "relationship";

export interface Recommendation {
  id:         string;
  title:      string;
  reason:     string;
  priority:   RecommendationPriority;
  source:     RecommendationSource;
  taskTitle?: string;   // pre-filled title for "convert to task"
  projectId?: string;   // pre-filled project for "convert to task"
}

export interface NextWeekFocus {
  id:           string;
  title:        string;
  type:         "task" | "project" | "content" | "relationship" | "habit";
  reason:       string;
  projectId:    string;
  projectTitle: string;
}

export interface WeeklyReview {
  weekStart:          string;   // YYYY-MM-DD Monday
  weekEnd:            string;   // YYYY-MM-DD Sunday
  completedWork:      CompletedItem[];
  slippedItems:       SlippedItem[];
  wins:               Win[];
  blockers:           Blocker[];
  relationshipFollowUps: ReviewFollowUp[];
  contentProgress:    ContentProgress;
  habitConsistency:   HabitConsistency;
  focusStats:         FocusStats;
  strategicAlignment: StrategicAlignmentScore;
  recommendations:    Recommendation[];
  nextWeekFocus:      NextWeekFocus[];
}

// ── Input ───────────────────────────────────────────────────────────────────

export interface WeeklyReviewInput {
  todayStr:          string;
  projects:          Project[];
  projectTasks:      ProjectTask[];
  contentItems:      ContentItem[];
  opportunities:     Opportunity[];
  people:            Person[];
  memoryItems:       MemoryItem[];
  focusSessions:     FocusSession[];
  habits:            HabitEntry[];
  habitLog:          Record<string, string[]>;
  strategicPlan?:    StrategicPlan;
  decomposition?:    DecompositionResult;
  actionResult?:     ActionEngineResult;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

let _idx = 0;
function uid(prefix: string): string {
  return `${prefix}_${_idx++}`;
}

function inWeek(dateStr: string | undefined, weekStart: string, weekEnd: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= weekStart && d <= weekEnd;
}

function getWeekBounds(todayStr: string): { weekStart: string; weekEnd: string } {
  const today = new Date(todayStr + "T00:00:00");
  const day   = today.getDay(); // 0=Sun 1=Mon…6=Sat
  const back  = day === 0 ? 6 : day - 1;
  const mon   = new Date(today);
  mon.setDate(today.getDate() - back);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    weekStart: mon.toISOString().slice(0, 10),
    weekEnd:   sun.toISOString().slice(0, 10),
  };
}

// ── Completed Work ──────────────────────────────────────────────────────────

function findCompletedWork(
  projects:      Project[],
  projectTasks:  ProjectTask[],
  contentItems:  ContentItem[],
  opportunities: Opportunity[],
  focusSessions: FocusSession[],
  weekStart:     string,
  weekEnd:       string
): CompletedItem[] {
  const items: CompletedItem[] = [];

  // Tasks completed this week
  for (const t of projectTasks) {
    if (t.status === "Done" && inWeek(t.updated_at, weekStart, weekEnd)) {
      const proj = projects.find((p) => p.id === t.project_id);
      items.push({
        id:           uid("done_task"),
        title:        t.title,
        type:         "task",
        projectTitle: proj?.title ?? "",
        projectId:    t.project_id,
        completedAt:  t.updated_at,
      });
    }
  }

  // Content published this week
  for (const c of contentItems) {
    if (c.status === "Published" && inWeek(c.updated_at, weekStart, weekEnd)) {
      items.push({
        id:           uid("done_content"),
        title:        c.title,
        type:         "content",
        projectTitle: "",
        projectId:    c.related_project_id,
        completedAt:  c.updated_at,
      });
    }
  }

  // Opportunities converted this week
  for (const o of opportunities) {
    if (o.status === "Converted" && inWeek(o.updated_at, weekStart, weekEnd)) {
      items.push({
        id:           uid("done_opp"),
        title:        `Converted: ${o.title}`,
        type:         "opportunity",
        projectTitle: "",
        projectId:    o.related_project_ids[0] ?? "",
        completedAt:  o.updated_at,
      });
    }
  }

  // Focus sessions completed this week
  for (const s of focusSessions) {
    const d = s.endedAt ?? s.startedAt;
    if (s.status === "Completed" && d && inWeek(d, weekStart, weekEnd)) {
      items.push({
        id:           uid("done_focus"),
        title:        `Focus: ${s.title}`,
        type:         "focus",
        projectTitle: "",
        projectId:    s.projectId ?? "",
        completedAt:  d,
      });
    }
  }

  return items.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

// ── Slipped Items ───────────────────────────────────────────────────────────

function findSlippedItems(
  projectTasks: ProjectTask[],
  contentItems: ContentItem[],
  people:       Person[],
  weekStart:    string,
  weekEnd:      string
): SlippedItem[] {
  const items: SlippedItem[] = [];

  // Tasks due this week, not done
  for (const t of projectTasks) {
    if (t.status !== "Done" && t.due_date && inWeek(t.due_date, weekStart, weekEnd)) {
      items.push({
        id:       uid("slip_task"),
        title:    t.title,
        type:     "task",
        dueDate:  t.due_date,
        severity: t.priority === "Critical" ? "critical" : t.priority === "High" ? "high" : "medium",
        reason:   `Due ${t.due_date}, not completed`,
      });
    }
  }

  // Content with publish_date this week, not published
  for (const c of contentItems) {
    if (c.publish_date && inWeek(c.publish_date, weekStart, weekEnd) && c.status !== "Published") {
      items.push({
        id:       uid("slip_content"),
        title:    c.title,
        type:     "content",
        dueDate:  c.publish_date,
        severity: c.priority === "Critical" ? "critical" : c.priority === "High" ? "high" : "medium",
        reason:   `Planned to publish ${c.publish_date} — currently "${c.status}"`,
      });
    }
  }

  // Follow-ups due this week or earlier, not actioned
  for (const p of people) {
    if (p.status === "Archived" || !p.next_follow_up_at) continue;
    if (p.next_follow_up_at > weekEnd) continue;
    const contacted = p.last_contacted_at?.slice(0, 10) ?? "";
    if (!contacted || contacted < p.next_follow_up_at) {
      items.push({
        id:       uid("slip_fu"),
        title:    `Follow up: ${p.name}`,
        type:     "followup",
        dueDate:  p.next_follow_up_at,
        severity: p.priority === "Critical" ? "critical" : p.priority === "High" ? "high" : "medium",
        reason:   `Follow-up was due ${p.next_follow_up_at} — not yet actioned`,
      });
    }
  }

  const ORDER: Record<SlipSeverity, number> = { critical: 0, high: 1, medium: 2 };
  return items.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ── Wins ────────────────────────────────────────────────────────────────────

function findWins(
  completedWork:     CompletedItem[],
  habitConsistency:  HabitConsistency,
  focusStats:        FocusStats
): Win[] {
  const wins: Win[] = [];

  const tasksDone = completedWork.filter((c) => c.type === "task");
  if (tasksDone.length > 0) {
    wins.push({
      id:          uid("win_tasks"),
      title:       `${tasksDone.length} task${tasksDone.length !== 1 ? "s" : ""} completed`,
      description: tasksDone.slice(0, 2).map((t) => `"${t.title}"`).join(", ") +
                   (tasksDone.length > 2 ? ` + ${tasksDone.length - 2} more` : ""),
      type:        "task",
    });
  }

  const contentPublished = completedWork.filter((c) => c.type === "content");
  if (contentPublished.length > 0) {
    wins.push({
      id:          uid("win_content"),
      title:       `Published ${contentPublished.length} piece${contentPublished.length !== 1 ? "s" : ""}`,
      description: contentPublished[0].title,
      type:        "content",
    });
  }

  if (habitConsistency.score >= 70) {
    wins.push({
      id:          uid("win_habits"),
      title:       `${habitConsistency.score}% habit consistency`,
      description: habitConsistency.perfectDays > 0
        ? `${habitConsistency.perfectDays} perfect day${habitConsistency.perfectDays !== 1 ? "s" : ""} this week`
        : "Strong habit completion rate",
      type:        "habit",
    });
  }

  if (focusStats.completedSessions >= 3) {
    wins.push({
      id:          uid("win_focus"),
      title:       `${focusStats.completedSessions} focus sessions`,
      description: `${focusStats.totalMinutes} total minutes of focused work`,
      type:        "focus",
    });
  }

  const oppsConverted = completedWork.filter((c) => c.type === "opportunity");
  if (oppsConverted.length > 0) {
    wins.push({
      id:          uid("win_opp"),
      title:       `Converted ${oppsConverted.length} opportunit${oppsConverted.length !== 1 ? "ies" : "y"}`,
      description: oppsConverted[0].title,
      type:        "opportunity",
    });
  }

  return wins.slice(0, 5);
}

// ── Blockers ────────────────────────────────────────────────────────────────

function findBlockers(
  projects:     Project[],
  projectTasks: ProjectTask[],
  todayStr:     string
): Blocker[] {
  const items: Blocker[] = [];

  // Paused projects
  for (const p of projects.filter((p) => p.status === "Paused")) {
    items.push({
      id:     uid("blk_paused"),
      title:  p.title,
      type:   "project",
      detail: "Project is paused — identify the blocker and define a next action to reactivate.",
    });
  }

  // Active high-priority projects with no open tasks
  for (const p of projects.filter((p) => p.status === "Active" && (p.priority === "High" || p.priority === "Critical"))) {
    const open = projectTasks.filter((t) => t.project_id === p.id && t.status !== "Done");
    if (open.length === 0) {
      items.push({
        id:     uid("blk_notask"),
        title:  `"${p.title}" — no open tasks`,
        type:   "task",
        detail: "Active high-priority project with no tasks stalls silently. Add a next action.",
      });
    }
  }

  // Tasks overdue >14 days
  const today = new Date(todayStr + "T00:00:00");
  for (const t of projectTasks) {
    if (t.status !== "Done" && t.due_date) {
      const days = Math.floor((today.getTime() - new Date(t.due_date + "T00:00:00").getTime()) / 86_400_000);
      if (days > 14) {
        items.push({
          id:     uid("blk_overdue"),
          title:  t.title,
          type:   "task",
          detail: `Overdue by ${days} days. Complete now, reschedule, or deliberately remove.`,
        });
      }
    }
  }

  return items.slice(0, 5);
}

// ── Relationship Follow-Ups ─────────────────────────────────────────────────

function findRelationshipFollowUps(
  people:    Person[],
  weekEnd:   string,
  todayStr:  string
): ReviewFollowUp[] {
  const fus: ReviewFollowUp[] = [];
  const ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

  for (const p of people) {
    if (p.status === "Archived" || !p.next_follow_up_at) continue;
    if (p.next_follow_up_at > weekEnd) continue;
    fus.push({
      id:         uid("fu"),
      personId:   p.id,
      personName: p.name,
      dueDate:    p.next_follow_up_at,
      isOverdue:  p.next_follow_up_at < todayStr,
      priority:   p.priority,
    });
  }

  return fus
    .sort((a, b) => (ORDER[a.priority] ?? 3) - (ORDER[b.priority] ?? 3))
    .slice(0, 8);
}

// ── Content Progress ────────────────────────────────────────────────────────

function analyzeContentProgress(
  contentItems: ContentItem[],
  weekStart:    string,
  weekEnd:      string
): ContentProgress {
  const created   = contentItems.filter((c) => inWeek(c.created_at, weekStart, weekEnd));
  const movedReady = contentItems.filter((c) => c.status === "Ready" && inWeek(c.updated_at, weekStart, weekEnd));
  const published = contentItems.filter((c) => c.status === "Published" && inWeek(c.updated_at, weekStart, weekEnd));

  // Unique set for display (published first, then ready, then others created)
  const seen  = new Set<string>();
  const items: { title: string; status: string }[] = [];
  for (const c of [...published, ...movedReady, ...created]) {
    if (!seen.has(c.id) && items.length < 5) {
      seen.add(c.id);
      items.push({ title: c.title, status: c.status });
    }
  }

  return {
    created:    created.length,
    movedReady: movedReady.length,
    published:  published.length,
    items,
  };
}

// ── Habit Consistency ───────────────────────────────────────────────────────

function analyzeHabitConsistency(
  habits:    HabitEntry[],
  habitLog:  Record<string, string[]>,
  weekStart: string,
  weekEnd:   string,
  todayStr:  string
): HabitConsistency {
  if (habits.length === 0) {
    return { score: 0, completionByDay: [], perfectDays: 0, bestStreak: 0 };
  }

  const days: HabitDayEntry[] = [];
  const cur = new Date(weekStart + "T00:00:00");
  const end = new Date(weekEnd   + "T00:00:00");

  while (cur <= end) {
    const d    = cur.toISOString().slice(0, 10);
    const done = new Set(habitLog[d] ?? []);
    days.push({ date: d, completed: habits.filter((h) => done.has(h.id)).length, total: habits.length });
    cur.setDate(cur.getDate() + 1);
  }

  const passed = days.filter((d) => d.date <= todayStr);

  const totalPossible = passed.reduce((s, d) => s + d.total, 0);
  const totalDone     = passed.reduce((s, d) => s + d.completed, 0);
  const score         = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const perfectDays   = passed.filter((d) => d.total > 0 && d.completed === d.total).length;

  let streak = 0, bestStreak = 0;
  for (const d of passed) {
    if (d.total > 0 && d.completed === d.total) { streak++; bestStreak = Math.max(bestStreak, streak); }
    else { streak = 0; }
  }

  // Lowest performing habit
  let lowestHabit: { name: string; rate: number } | undefined;
  if (habits.length > 1 && passed.length > 0) {
    let lowestRate = Infinity;
    let lowestName = "";
    for (const h of habits) {
      const done = passed.filter((d) => (habitLog[d.date] ?? []).includes(h.id)).length;
      const rate = done / passed.length;
      if (rate < lowestRate) { lowestRate = rate; lowestName = h.name; }
    }
    if (lowestRate < 1) lowestHabit = { name: lowestName, rate: Math.round(lowestRate * 100) };
  }

  return { score, completionByDay: days, perfectDays, bestStreak, lowestHabit };
}

// ── Focus Stats ─────────────────────────────────────────────────────────────

function analyzeFocusStats(
  focusSessions: FocusSession[],
  projects:      Project[],
  weekStart:     string,
  weekEnd:       string
): FocusStats {
  const weekSessions = focusSessions.filter((s) => {
    const d = (s.endedAt ?? s.startedAt)?.slice(0, 10);
    return d && inWeek(d, weekStart, weekEnd);
  });

  const completed = weekSessions.filter((s) => s.status === "Completed");
  const abandoned = weekSessions.filter((s) => s.status === "Abandoned");

  const totalMinutes = completed.reduce((s, sess) => s + (sess.actualMinutes ?? sess.plannedMinutes), 0);
  const avgMinutes   = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;
  const longest      = completed.reduce((mx, s) => Math.max(mx, s.actualMinutes ?? s.plannedMinutes), 0);

  const projCounts: Record<string, number> = {};
  for (const s of completed) {
    if (s.projectId) projCounts[s.projectId] = (projCounts[s.projectId] ?? 0) + 1;
  }
  const topProjId    = Object.entries(projCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const topProjTitle = projects.find((p) => p.id === topProjId)?.title ?? "";

  return {
    totalSessions:     weekSessions.length,
    completedSessions: completed.length,
    abandonedSessions: abandoned.length,
    totalMinutes,
    avgSessionMinutes: avgMinutes,
    longestSession:    longest,
    topProjectTitle:   topProjTitle,
  };
}

// ── Strategic Alignment ─────────────────────────────────────────────────────

function analyzeStrategicAlignment(
  completedWork: CompletedItem[],
  strategicPlan: StrategicPlan | undefined
): StrategicAlignmentScore {
  const tasksDone = completedWork.filter((c) => c.type === "task");

  if (!strategicPlan || strategicPlan.topObjectives.length === 0) {
    return {
      score:            0,
      completedAligned: 0,
      totalCompleted:   tasksDone.length,
      note:             "No strategic objectives defined. Set your vision in /planner.",
    };
  }

  const alignedProjectIds = new Set(
    strategicPlan.topObjectives.slice(0, 3).flatMap((o) => o.relatedProjects)
  );

  const aligned = tasksDone.filter((c) => c.projectId && alignedProjectIds.has(c.projectId)).length;
  const total   = tasksDone.length;
  const score   = total > 0 ? Math.min(100, Math.round((aligned / total) * 100)) : 50;

  const note =
    score >= 75 ? "Strong alignment — most completed work supports your top objectives." :
    score >= 45 ? "Moderate alignment — some work supports strategy, some is off-path." :
    total === 0  ? "No tasks completed this week. Focus on at least 3 strategic actions." :
    "Low alignment — review tasks against your top strategic objectives.";

  return { score, completedAligned: aligned, totalCompleted: total, note };
}

// ── Recommendations ─────────────────────────────────────────────────────────

function buildRecommendations(
  slippedItems:       SlippedItem[],
  blockers:           Blocker[],
  habitConsistency:   HabitConsistency,
  strategicAlignment: StrategicAlignmentScore,
  people:             Person[],
  actionResult:       ActionEngineResult | undefined,
  projects:           Project[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Critical slipped items
  const criticalSlipped = slippedItems.filter((s) => s.severity === "critical").slice(0, 2);
  for (const s of criticalSlipped) {
    const proj = projects.find((p) => p.title.toLowerCase().includes(s.title.toLowerCase().slice(0, 10)));
    recs.push({
      id:        uid("rec_slip_crit"),
      title:     `Carry forward: "${s.title}"`,
      reason:    `Critical item slipped. ${s.reason}. Don't let it slip a second week.`,
      priority:  "critical",
      source:    "slipped",
      taskTitle: s.title,
      projectId: proj?.id ?? "",
    });
  }

  // High slipped items (summarized)
  const highSlipped = slippedItems.filter((s) => s.severity === "high").slice(0, 2);
  for (const s of highSlipped) {
    recs.push({
      id:        uid("rec_slip_high"),
      title:     `Reschedule or complete: "${s.title}"`,
      reason:    `High-priority item slipped this week. ${s.reason}.`,
      priority:  "high",
      source:    "slipped",
      taskTitle: s.title,
    });
  }

  // Blockers
  for (const b of blockers.slice(0, 2)) {
    recs.push({
      id:       uid("rec_blk"),
      title:    `Unblock: ${b.title}`,
      reason:   b.detail,
      priority: "high",
      source:   "blocker",
    });
  }

  // Low habit consistency
  if (habitConsistency.score < 60 && habitConsistency.lowestHabit) {
    recs.push({
      id:       uid("rec_habit"),
      title:    `Rebuild habit streak: ${habitConsistency.lowestHabit.name}`,
      reason:   `Habit score was ${habitConsistency.score}% — "${habitConsistency.lowestHabit.name}" completed only ${habitConsistency.lowestHabit.rate}% of days. Attach it to a morning anchor.`,
      priority: "medium",
      source:   "habit",
    });
  }

  // Low strategic alignment
  if (strategicAlignment.score < 40 && strategicAlignment.totalCompleted > 0) {
    recs.push({
      id:       uid("rec_align"),
      title:    "Realign next week's tasks to strategic objectives",
      reason:   `Only ${strategicAlignment.completedAligned}/${strategicAlignment.totalCompleted} completed tasks matched top strategic objectives. Review /strategy and pick tasks that move the biggest needle.`,
      priority: "high",
      source:   "strategy",
    });
  }

  // Top action from action engine
  if (actionResult && actionResult.actions[0]) {
    const top = actionResult.actions[0];
    recs.push({
      id:       uid("rec_action"),
      title:    top.title,
      reason:   `Top-scored action from Action Engine (score ${top.score}/100): ${top.reason}`,
      priority: top.priority === "critical" ? "critical" : top.priority === "high" ? "high" : "medium",
      source:   "strategy",
    });
  }

  // Overdue high-priority follow-ups
  const overdueHighFu = people
    .filter((p) => p.status !== "Archived" && (p.priority === "Critical" || p.priority === "High") && p.next_follow_up_at && p.next_follow_up_at < new Date().toISOString().slice(0, 10))
    .slice(0, 1);
  for (const p of overdueHighFu) {
    recs.push({
      id:       uid("rec_fu"),
      title:    `Follow up with ${p.name}`,
      reason:   `High-priority follow-up was due ${p.next_follow_up_at} — still pending.`,
      priority: p.priority === "Critical" ? "critical" : "high",
      source:   "relationship",
    });
  }

  return recs.slice(0, 7);
}

// ── Next Week Focus ─────────────────────────────────────────────────────────

function buildNextWeekFocus(
  slippedItems:  SlippedItem[],
  strategicPlan: StrategicPlan | undefined,
  projects:      Project[],
  projectTasks:  ProjectTask[],
  people:        Person[],
  actionResult:  ActionEngineResult | undefined
): NextWeekFocus[] {
  const focus: NextWeekFocus[] = [];

  // 1. Carry over critical+high slipped tasks
  const slippedTasks = slippedItems.filter((s) => s.type === "task" && (s.severity === "critical" || s.severity === "high")).slice(0, 2);
  for (const s of slippedTasks) {
    const proj = projects.find((p) => projectTasks.find((t) => t.title === s.title && t.project_id === p.id));
    focus.push({
      id:           uid("nwf_slip"),
      title:        s.title,
      type:         "task",
      reason:       `Slipped this week (${s.severity}). Carry it forward.`,
      projectId:    proj?.id ?? "",
      projectTitle: proj?.title ?? "",
    });
  }

  // 2. Top strategic objective next action
  if (strategicPlan && strategicPlan.topObjectives[0]) {
    const top   = strategicPlan.topObjectives[0];
    const proj  = projects.find((p) => top.relatedProjects.includes(p.id) && p.status !== "Archived");
    const task  = proj ? projectTasks.find((t) => t.project_id === proj.id && t.status !== "Done") : undefined;
    focus.push({
      id:           uid("nwf_strategy"),
      title:        task ? task.title : (proj?.next_action || `Advance: ${top.title}`),
      type:         "project",
      reason:       `Supports top strategic objective: "${top.title}"`,
      projectId:    proj?.id ?? "",
      projectTitle: proj?.title ?? "",
    });
  }

  // 3. Action engine top action
  if (actionResult && actionResult.actions[0] && focus.length < 5) {
    const a = actionResult.actions[0];
    focus.push({
      id:           uid("nwf_action"),
      title:        a.title,
      type:         "task",
      reason:       a.reason,
      projectId:    "",
      projectTitle: "",
    });
  }

  // 4. Overdue follow-up
  const overdueHigh = people
    .filter((p) => p.status !== "Archived" && (p.priority === "Critical" || p.priority === "High") && p.next_follow_up_at && p.next_follow_up_at <= new Date().toISOString().slice(0, 10))
    .slice(0, 1);
  for (const p of overdueHigh) {
    focus.push({
      id:           uid("nwf_fu"),
      title:        `Reach out to ${p.name}`,
      type:         "relationship",
      reason:       `Follow-up overdue since ${p.next_follow_up_at}`,
      projectId:    "",
      projectTitle: "",
    });
  }

  // 5. Slipped content
  const slippedContent = slippedItems.filter((s) => s.type === "content").slice(0, 1);
  for (const s of slippedContent) {
    focus.push({
      id:           uid("nwf_content"),
      title:        `Publish: ${s.title}`,
      type:         "content",
      reason:       `Planned to publish ${s.dueDate} — still pending`,
      projectId:    "",
      projectTitle: "",
    });
  }

  return focus.slice(0, 5);
}

// ── Main Export ─────────────────────────────────────────────────────────────

export function computeWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  _idx = 0; // reset ID counter per call
  const { todayStr, projects, projectTasks, contentItems, opportunities, people,
          focusSessions, habits, habitLog, strategicPlan, actionResult } = input;

  const { weekStart, weekEnd } = getWeekBounds(todayStr);

  const completedWork  = findCompletedWork(projects, projectTasks, contentItems, opportunities, focusSessions, weekStart, weekEnd);
  const habitConsistency = analyzeHabitConsistency(habits, habitLog, weekStart, weekEnd, todayStr);
  const focusStats     = analyzeFocusStats(focusSessions, projects, weekStart, weekEnd);

  const slippedItems   = findSlippedItems(projectTasks, contentItems, people, weekStart, weekEnd);
  const wins           = findWins(completedWork, habitConsistency, focusStats);
  const blockers       = findBlockers(projects, projectTasks, todayStr);
  const relationshipFollowUps = findRelationshipFollowUps(people, weekEnd, todayStr);
  const contentProgress = analyzeContentProgress(contentItems, weekStart, weekEnd);
  const strategicAlignment = analyzeStrategicAlignment(completedWork, strategicPlan);
  const recommendations = buildRecommendations(slippedItems, blockers, habitConsistency, strategicAlignment, people, actionResult, projects);
  const nextWeekFocus  = buildNextWeekFocus(slippedItems, strategicPlan, projects, projectTasks, people, actionResult);

  return {
    weekStart,
    weekEnd,
    completedWork,
    slippedItems,
    wins,
    blockers,
    relationshipFollowUps,
    contentProgress,
    habitConsistency,
    focusStats,
    strategicAlignment,
    recommendations,
    nextWeekFocus,
  };
}

// ── Context Builder (for AI "Analyze My Week") ─────────────────────────────

export function buildWeeklyReviewContext(review: WeeklyReview): string {
  const lines: string[] = [];
  lines.push(`Weekly Review: ${review.weekStart} → ${review.weekEnd}`);
  lines.push("");
  lines.push(`COMPLETED (${review.completedWork.length}): ${review.completedWork.slice(0, 4).map((c) => c.title).join("; ")}`);
  lines.push(`SLIPPED (${review.slippedItems.length}): ${review.slippedItems.slice(0, 4).map((s) => `[${s.severity}] ${s.title}`).join("; ")}`);
  lines.push(`WINS: ${review.wins.map((w) => w.title).join("; ")}`);
  lines.push(`BLOCKERS: ${review.blockers.map((b) => b.title).join("; ")}`);
  lines.push(`HABITS: ${review.habitConsistency.score}% (${review.habitConsistency.perfectDays} perfect days)`);
  lines.push(`FOCUS: ${review.focusStats.completedSessions} sessions, ${review.focusStats.totalMinutes} minutes`);
  lines.push(`STRATEGIC ALIGNMENT: ${review.strategicAlignment.score}% — ${review.strategicAlignment.note}`);
  lines.push(`CONTENT: ${review.contentProgress.published} published, ${review.contentProgress.movedReady} moved to Ready`);
  lines.push(`NEXT WEEK FOCUS: ${review.nextWeekFocus.map((f) => f.title).join("; ")}`);
  return lines.join("\n");
}
