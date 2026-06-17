import type { MemoryItem } from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem, DailyBriefing } from "@/lib/briefing/daily";

// ── Input ──────────────────────────────────────────────────────────────────

export interface FocusEngineInput {
  todayStr:     string;
  projects:     Project[];
  projectTasks: ProjectTask[];
  memoryItems:  MemoryItem[];
  contentItems: ContentItem[];
  dailyItems:   PlannerItem[];
  weeklyItems:  PlannerItem[];
  monthlyItems: string[];
  habits:       HabitEntry[];
  habitLog:     Record<string, string[]>;
  visionData:   { yr1: string[]; yr3: string[]; yr5: string[] };
  dailyBriefing: DailyBriefing | null;
}

// ── Output ─────────────────────────────────────────────────────────────────

export type FocusSourceType =
  | "overdue-task"
  | "overdue-project"
  | "critical-task"
  | "high-task"
  | "content-deadline"
  | "planner"
  | "project-action";

export interface FocusPriority {
  rank:         number;
  text:         string;
  source:       FocusSourceType;
  projectName?: string;
  priority?:    string;
  daysOverdue?: number;
  dueDate?:     string;
}

export interface WhyItMatters {
  whyNow:          string;
  supportsProject?: string;
  supportsVision?:  string;
  impact:           string;
}

export type FocusBlockType = "deep-work" | "admin" | "creator" | "review" | "recovery";

export interface FocusBlock {
  time:        string;
  label:       string;
  description: string;
  type:        FocusBlockType;
}

export interface FocusEngineResult {
  generatedAt:    string;
  topThree:       FocusPriority[];
  whyItMatters:   WhyItMatters[];
  focusBlocks:    FocusBlock[];
  avoidList:      string[];
  momentumScore:  number;
  alignmentScore: number;
  aiPromptContext: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function computeStreak(habitId: string, habitLog: Record<string, string[]>): number {
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    const key = d.toISOString().slice(0, 10);
    if (habitLog[key]?.includes(habitId)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High:     3,
  Medium:   2,
  Low:      1,
};

// ── Main function ──────────────────────────────────────────────────────────

export function computeFocusEngine(input: FocusEngineInput): FocusEngineResult {
  const {
    todayStr,
    projects,
    projectTasks,
    memoryItems,
    contentItems,
    dailyItems,
    weeklyItems,
    habits,
    habitLog,
    visionData,
  } = input;

  const activeProjects = projects.filter((p) => p.status === "Active");

  // ── Suppress unused warning ────────────────────────────────────────────
  void memoryItems;

  // ── Build ranked candidate list ────────────────────────────────────────

  interface Candidate {
    text:         string;
    source:       FocusSourceType;
    score:        number;
    projectName?: string;
    priority?:    string;
    daysOverdue?: number;
    dueDate?:     string;
  }

  const candidates: Candidate[] = [];

  // 1. Overdue tasks (highest urgency)
  for (const task of projectTasks) {
    if (task.status === "Done" || !task.due_date) continue;
    if (task.due_date >= todayStr) continue;
    const proj = projects.find((p) => p.id === task.project_id);
    const days = daysBetween(task.due_date, todayStr);
    candidates.push({
      text:        task.title,
      source:      "overdue-task",
      score:       100 + days + (PRIORITY_ORDER[task.priority] ?? 0) * 5,
      projectName: proj?.title,
      priority:    task.priority,
      daysOverdue: days,
      dueDate:     task.due_date,
    });
  }

  // 2. Overdue projects
  for (const proj of activeProjects) {
    if (!proj.due_date || proj.due_date >= todayStr) continue;
    const days = daysBetween(proj.due_date, todayStr);
    candidates.push({
      text:        `${proj.title} — ${proj.next_action || "review next steps"}`,
      source:      "overdue-project",
      score:       90 + days + (PRIORITY_ORDER[proj.priority] ?? 0) * 5,
      projectName: proj.title,
      priority:    proj.priority,
      daysOverdue: days,
      dueDate:     proj.due_date,
    });
  }

  // 3. Critical tasks (not overdue)
  const criticalTasks = projectTasks.filter(
    (t) => t.status !== "Done" && t.priority === "Critical" && (!t.due_date || t.due_date >= todayStr)
  );
  for (const task of criticalTasks) {
    const proj = projects.find((p) => p.id === task.project_id);
    // Boost if due soon
    const dueSoon = task.due_date ? daysBetween(todayStr, task.due_date) <= 3 : false;
    candidates.push({
      text:        task.title,
      source:      "critical-task",
      score:       70 + (dueSoon ? 10 : 0),
      projectName: proj?.title,
      priority:    "Critical",
      dueDate:     task.due_date,
    });
  }

  // 4. High-priority tasks (not overdue)
  const highTasks = projectTasks.filter(
    (t) => t.status !== "Done" && t.priority === "High" && (!t.due_date || t.due_date >= todayStr)
  );
  for (const task of highTasks) {
    const proj = projects.find((p) => p.id === task.project_id);
    const dueSoon = task.due_date ? daysBetween(todayStr, task.due_date) <= 3 : false;
    candidates.push({
      text:        task.title,
      source:      "high-task",
      score:       60 + (dueSoon ? 8 : 0),
      projectName: proj?.title,
      priority:    "High",
      dueDate:     task.due_date,
    });
  }

  // 5. Content deadlines (overdue or due within 3 days)
  const urgentContent = contentItems.filter((item) => {
    if (item.status === "Archived" || item.status === "Published") return false;
    if (!item.publish_date) return false;
    const diff = daysBetween(todayStr, item.publish_date);
    return diff <= 3; // includes overdue (negative diff)
  });
  for (const item of urgentContent) {
    const isOverdue = item.publish_date < todayStr;
    const days = isOverdue ? daysBetween(item.publish_date, todayStr) : 0;
    candidates.push({
      text:        `Publish: ${item.title}`,
      source:      "content-deadline",
      score:       65 + (isOverdue ? 10 + days : 0) + (PRIORITY_ORDER[item.priority] ?? 0) * 3,
      priority:    item.priority,
      daysOverdue: isOverdue ? days : undefined,
      dueDate:     item.publish_date,
    });
  }

  // 6. Planner daily items (not done)
  for (const item of dailyItems.filter((i) => !i.done)) {
    candidates.push({
      text:   item.text,
      source: "planner",
      score:  55,
    });
  }

  // 7. High-leverage project next actions (Critical/High active, no overdue project)
  for (const proj of activeProjects) {
    if (!proj.next_action) continue;
    if (proj.priority !== "Critical" && proj.priority !== "High") continue;
    // Only add if no overdue entry already covers this project
    const alreadyAdded = candidates.some((c) => c.projectName === proj.title);
    if (!alreadyAdded) {
      candidates.push({
        text:        proj.next_action,
        source:      "project-action",
        score:       50 + (PRIORITY_ORDER[proj.priority] ?? 0) * 3,
        projectName: proj.title,
        priority:    proj.priority,
      });
    }
  }

  // Sort by score, take top 3, deduplicate by text
  const seen = new Set<string>();
  const topThreeCandidates: Candidate[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    if (seen.has(c.text)) continue;
    seen.add(c.text);
    topThreeCandidates.push(c);
    if (topThreeCandidates.length >= 3) break;
  }

  const topThree: FocusPriority[] = topThreeCandidates.map((c, i) => ({
    rank:        i + 1,
    text:        c.text,
    source:      c.source,
    projectName: c.projectName,
    priority:    c.priority,
    daysOverdue: c.daysOverdue,
    dueDate:     c.dueDate,
  }));

  // ── Why It Matters ─────────────────────────────────────────────────────

  const visionKeywords = [
    ...visionData.yr1,
    ...visionData.yr3,
    ...visionData.yr5,
  ].join(" ").toLowerCase();

  function buildWhyNow(c: Candidate): string {
    if (c.source === "overdue-task" || c.source === "overdue-project") {
      return `This is ${c.daysOverdue} day${c.daysOverdue === 1 ? "" : "s"} overdue — every day delayed compounds the cost.`;
    }
    if (c.source === "critical-task") {
      return `Marked Critical — this is a blocking item that should not sit another day.`;
    }
    if (c.source === "high-task") {
      return c.dueDate
        ? `Due ${c.dueDate} — a high-priority item with a live deadline.`
        : `A high-priority open item — moving it forward unlocks downstream work.`;
    }
    if (c.source === "content-deadline") {
      return c.daysOverdue
        ? `This content is ${c.daysOverdue} day${c.daysOverdue === 1 ? "" : "s"} past its publish date — publish or reschedule.`
        : `Publishing deadline approaching — get this out now to keep the content engine moving.`;
    }
    if (c.source === "planner") {
      return `You planned this for today — honoring your own commitments compounds discipline.`;
    }
    return `Your ${c.priority ?? "active"} project "${c.projectName}" is stalled without this action.`;
  }

  function findVisionMatch(text: string): string | undefined {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (visionKeywords.includes(word)) return word;
    }
    return undefined;
  }

  const IMPACT_MAP: Record<FocusSourceType, string> = {
    "overdue-task":     "Clears a blocker and restores momentum.",
    "overdue-project":  "Gets the project back on track and reduces cognitive debt.",
    "critical-task":    "Unblocks the project and moves you closer to a shipped outcome.",
    "high-task":        "Keeps the project moving and maintains delivery momentum.",
    "content-deadline": "Maintains your publishing cadence and audience trust.",
    "planner":          "Executing your own plan is the foundation of execution identity.",
    "project-action":   "The single highest-leverage move available on this project right now.",
  };

  const whyItMatters: WhyItMatters[] = topThreeCandidates.map((c) => {
    const visionWord = findVisionMatch(c.text);
    return {
      whyNow:          buildWhyNow(c),
      supportsProject: c.projectName,
      supportsVision:  visionWord
        ? `Aligns with your vision — "${visionWord}" appears in your long-term goals.`
        : undefined,
      impact: IMPACT_MAP[c.source],
    };
  });

  // ── Focus Blocks ───────────────────────────────────────────────────────

  const hasContentWork = topThreeCandidates.some(
    (c) => c.source === "content-deadline"
  );
  const overdueTasks = topThreeCandidates.filter(
    (c) => c.source === "overdue-task" || c.source === "overdue-project"
  );

  const focusBlocks: FocusBlock[] = [
    {
      time:        "09:00",
      label:       "Deep Work — Top Priority",
      description: topThree[0]
        ? `Focus block for: ${topThree[0].text}`
        : "Execute your most important work while your mind is fresh.",
      type: "deep-work",
    },
    {
      time:        "10:30",
      label:       "Admin & Communications",
      description: "Clear messages, update project statuses, and respond to anything that needs a quick answer. Keep this to 30 min.",
      type: "admin",
    },
    {
      time:        "11:00",
      label: hasContentWork ? "Creator Block" : "Deep Work — Priority #2",
      description: hasContentWork
        ? "Record, write, or schedule content. One completed piece per session."
        : topThree[1]
          ? `Second priority block: ${topThree[1].text}`
          : "Continue deep work or advance a secondary project.",
      type: hasContentWork ? "creator" : "deep-work",
    },
    {
      time:        "12:00",
      label:       "Recovery",
      description: "Step away. Eat, walk, or decompress. Non-negotiable recovery fuels afternoon output.",
      type: "recovery",
    },
    {
      time:  "13:30",
      label: overdueTasks.length > 0 ? "Clear Overdue Items" : hasContentWork ? "Creator Block #2" : "Deep Work — Priority #3",
      description: overdueTasks.length > 0
        ? `Work through overdue items — start with the oldest. Current target: ${overdueTasks[0].text}`
        : hasContentWork
          ? "Continue content creation or repurpose existing work for another platform."
          : topThree[2]
            ? `Third priority: ${topThree[2].text}`
            : "Review weekly goals and advance any stalled items.",
      type: overdueTasks.length > 0 ? "deep-work" : hasContentWork ? "creator" : "deep-work",
    },
    {
      time:        "15:00",
      label:       "Review & Plan Tomorrow",
      description: "Mark tasks done. Update project statuses. Write tomorrow's top 3 in the planner. End the day with intention.",
      type: "review",
    },
  ];

  // ── Avoid List ─────────────────────────────────────────────────────────

  const avoidList: string[] = [];

  const hasHighPriority = candidates.some(
    (c) => c.source === "overdue-task" || c.source === "overdue-project" || c.source === "critical-task"
  );

  if (hasHighPriority) {
    avoidList.push("Low-priority tasks — don't let them eat time while critical items are open");
  }

  const pausedProjects = projects.filter((p) => p.status === "Paused");
  if (pausedProjects.length > 0) {
    avoidList.push(`Paused project work (${pausedProjects.map((p) => p.title).join(", ")}) — they're paused for a reason`);
  }

  const ideaContent = contentItems.filter(
    (i) => i.status === "Idea" && !i.publish_date
  );
  if (ideaContent.length > 2) {
    avoidList.push("Content ideation spirals — you have enough ideas, focus on executing what's already planned");
  }

  if (weeklyItems.filter((i) => !i.done).length > 0) {
    avoidList.push("Unplanned work not on your weekly goals list — scope creep kills execution momentum");
  }

  avoidList.push("Research rabbit holes unless they directly unblock a top-3 priority");

  // ── Momentum Score (0–100) ─────────────────────────────────────────────

  const todayDone = habitLog[todayStr] ?? [];
  const habitsDone  = habits.filter((h) => todayDone.includes(h.id)).length;
  const habitsTotal = habits.length;
  const habitBonus  = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 40) : 20; // 20 if no habits set

  const doneTasks  = projectTasks.filter((t) => t.status === "Done").length;
  const totalTasks = projectTasks.length;
  const taskScore  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 20) : 10;

  const overdueCount = candidates.filter(
    (c) => c.source === "overdue-task" || c.source === "overdue-project"
  ).length;
  const overduePenalty = Math.min(overdueCount * 7, 35);

  // Also reward habit streaks
  let streakBonus = 0;
  if (habitsTotal > 0) {
    const avgStreak = habits.reduce((sum, h) => sum + computeStreak(h.id, habitLog), 0) / habitsTotal;
    streakBonus = Math.min(Math.round(avgStreak * 2), 15);
  }

  const momentumScore = clamp(40 + habitBonus + taskScore + streakBonus - overduePenalty, 0, 100);

  // ── Alignment Score (0–100) ────────────────────────────────────────────

  let alignmentScore = 0;

  // Has daily plan items
  if (dailyItems.length > 0) alignmentScore += 20;

  // Top priority comes from a high-signal source
  if (
    topThree[0] &&
    (topThree[0].source === "overdue-task" ||
      topThree[0].source === "critical-task" ||
      topThree[0].source === "high-task" ||
      topThree[0].source === "project-action")
  ) {
    alignmentScore += 30;
  }

  // Vision items exist AND top priority keywords overlap
  const hasVision =
    visionData.yr1.length > 0 || visionData.yr3.length > 0 || visionData.yr5.length > 0;
  if (hasVision && topThree[0]) {
    const matchFound = findVisionMatch(topThree[0].text) !== undefined;
    if (matchFound) alignmentScore += 25;
    else alignmentScore += 10; // partial: has vision but no keyword overlap
  }

  // Has incomplete weekly goals
  if (weeklyItems.filter((i) => !i.done).length > 0) alignmentScore += 25;

  alignmentScore = clamp(alignmentScore, 0, 100);

  // ── AI Prompt Context ──────────────────────────────────────────────────

  const ctxLines: string[] = [
    `Focus Engine — ${todayStr}`,
    `Momentum: ${momentumScore}/100 · Alignment: ${alignmentScore}/100`,
    "",
  ];

  if (topThree.length > 0) {
    ctxLines.push("TOP 3 PRIORITIES:");
    for (const p of topThree) {
      const overdueNote = p.daysOverdue ? ` (${p.daysOverdue}d overdue)` : "";
      const projNote    = p.projectName ? ` [${p.projectName}]` : "";
      ctxLines.push(`${p.rank}. ${p.text}${overdueNote}${projNote}`);
    }
    ctxLines.push("");
  }

  if (dailyItems.length > 0) {
    ctxLines.push("TODAY'S PLAN:");
    for (const item of dailyItems)
      ctxLines.push(`- ${item.done ? "[x]" : "[ ]"} ${item.text}`);
    ctxLines.push("");
  }

  if (weeklyItems.filter((i) => !i.done).length > 0) {
    ctxLines.push("OPEN WEEKLY GOALS:");
    for (const item of weeklyItems.filter((i) => !i.done).slice(0, 3))
      ctxLines.push(`- ${item.text}`);
    ctxLines.push("");
  }

  if (habitsTotal > 0) {
    ctxLines.push(`HABITS: ${habitsDone}/${habitsTotal} done today`);
    ctxLines.push("");
  }

  if (avoidList.length > 0) {
    ctxLines.push("AVOID TODAY:");
    for (const item of avoidList) ctxLines.push(`- ${item}`);
    ctxLines.push("");
  }

  const aiPromptContext = ctxLines.join("\n");

  return {
    generatedAt:    todayStr,
    topThree,
    whyItMatters,
    focusBlocks,
    avoidList,
    momentumScore,
    alignmentScore,
    aiPromptContext,
  };
}
