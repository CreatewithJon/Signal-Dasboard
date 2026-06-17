import type { MemoryItem } from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { HabitEntry } from "@/lib/memory/context";

// ── Input ──────────────────────────────────────────────────────────────────

export interface PlannerItem {
  text: string;
  done: boolean;
}

export interface BriefingInput {
  todayStr:     string; // YYYY-MM-DD
  projects:     Project[];
  projectTasks: ProjectTask[];
  memoryItems:  MemoryItem[];
  dailyItems:   PlannerItem[];
  weeklyItems:  PlannerItem[];
  monthlyItems: string[];
  habits:       HabitEntry[];
  habitLog:     Record<string, string[]>;
}

// ── Output ─────────────────────────────────────────────────────────────────

export interface BriefingPriority {
  text:         string;
  source:       "overdue" | "project" | "planner";
  priority?:    string;
  projectName?: string;
}

export interface BriefingOverdueItem {
  text:         string;
  dueDate:      string;
  daysOverdue:  number;
  type:         "task" | "project";
  projectName?: string;
}

export interface BriefingDueTodayItem {
  text:         string;
  type:         "task" | "planner";
  priority?:    string;
  projectName?: string;
}

export interface BriefingProjectSummary {
  id:         string;
  title:      string;
  priority:   string;
  nextAction: string;
  status:     string;
  dueDate:    string;
}

export interface BriefingMemorySnapshot {
  title:      string;
  importance: string;
  type:       string;
}

export interface BriefingHabitItem {
  id:     string;
  name:   string;
  icon:   string;
  done:   boolean;
  streak: number;
}

export interface DailyBriefing {
  date:                string;
  headline:            string;
  topPriorities:       BriefingPriority[];
  overdueItems:        BriefingOverdueItem[];
  dueToday:            BriefingDueTodayItem[];
  highLeverageProjects: BriefingProjectSummary[];
  relevantMemories:    BriefingMemorySnapshot[];
  habitFocus:          BriefingHabitItem[];
  suggestedFocusBlock: string;
  aiPromptContext:     string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High:     3,
  Medium:   2,
  Low:      1,
};

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}

function computeStreak(habitId: string, habitLog: Record<string, string[]>): number {
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday
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

// ── Main function ──────────────────────────────────────────────────────────

export function computeDailyBriefing(input: BriefingInput): DailyBriefing {
  const {
    todayStr,
    projects,
    projectTasks,
    memoryItems,
    dailyItems,
    weeklyItems,
    monthlyItems,
    habits,
    habitLog,
  } = input;

  const activeProjects = projects.filter((p) => p.status === "Active");

  // ── Overdue items ────────────────────────────────────────────────────────

  const overdueItems: BriefingOverdueItem[] = [];

  // Overdue project tasks
  for (const task of projectTasks) {
    if (task.status === "Done" || !task.due_date) continue;
    if (task.due_date >= todayStr) continue;
    const proj = projects.find((p) => p.id === task.project_id);
    overdueItems.push({
      text:        task.title,
      dueDate:     task.due_date,
      daysOverdue: daysBetween(task.due_date, todayStr),
      type:        "task",
      projectName: proj?.title,
    });
  }

  // Overdue active projects
  for (const proj of activeProjects) {
    if (!proj.due_date || proj.due_date >= todayStr) continue;
    overdueItems.push({
      text:        proj.title,
      dueDate:     proj.due_date,
      daysOverdue: daysBetween(proj.due_date, todayStr),
      type:        "project",
    });
  }

  overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);

  // ── Due today ────────────────────────────────────────────────────────────

  const dueToday: BriefingDueTodayItem[] = [];

  for (const task of projectTasks) {
    if (task.status === "Done" || task.due_date !== todayStr) continue;
    const proj = projects.find((p) => p.id === task.project_id);
    dueToday.push({
      text:        task.title,
      type:        "task",
      priority:    task.priority,
      projectName: proj?.title,
    });
  }

  for (const item of dailyItems) {
    if (!item.done) {
      dueToday.push({ text: item.text, type: "planner" });
    }
  }

  // ── High-leverage projects ───────────────────────────────────────────────

  const highLeverageProjects: BriefingProjectSummary[] = activeProjects
    .filter((p) => p.priority === "Critical" || p.priority === "High")
    .sort((a, b) => {
      const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
      if (pd !== 0) return pd;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .slice(0, 3)
    .map((p) => ({
      id:         p.id,
      title:      p.title,
      priority:   p.priority,
      nextAction: p.next_action || "No next action set",
      status:     p.status,
      dueDate:    p.due_date,
    }));

  // ── Relevant memories ────────────────────────────────────────────────────

  const relevantMemories: BriefingMemorySnapshot[] = memoryItems
    .filter((m) => m.importance === "Critical" || m.importance === "High")
    .sort((a, b) => {
      const id = (PRIORITY_ORDER[b.importance] ?? 0) - (PRIORITY_ORDER[a.importance] ?? 0);
      if (id !== 0) return id;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 3)
    .map((m) => ({ title: m.title, importance: m.importance, type: m.type }));

  // ── Habit focus ──────────────────────────────────────────────────────────

  const todayDone = habitLog[todayStr] ?? [];

  const habitFocus: BriefingHabitItem[] = habits.map((h) => ({
    id:     h.id,
    name:   h.name,
    icon:   h.icon,
    done:   todayDone.includes(h.id),
    streak: computeStreak(h.id, habitLog),
  }));

  const habitsDone  = habitFocus.filter((h) => h.done).length;
  const habitsTotal = habitFocus.length;

  // ── Top priorities (max 3) ───────────────────────────────────────────────

  const candidates: BriefingPriority[] = [];

  // Overdue tasks first
  for (const item of overdueItems.slice(0, 3)) {
    candidates.push({
      text:        item.text,
      source:      "overdue",
      projectName: item.projectName,
    });
  }

  // Critical/High project tasks not done
  const openTasks = projectTasks
    .filter((t) => t.status !== "Done" && !overdueItems.some((o) => o.text === t.title))
    .sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0));

  for (const task of openTasks) {
    if (task.priority !== "Critical" && task.priority !== "High") break;
    if (candidates.length >= 5) break;
    const proj = projects.find((p) => p.id === task.project_id);
    candidates.push({
      text:        task.title,
      source:      "project",
      priority:    task.priority,
      projectName: proj?.title,
    });
  }

  // Planner items not done
  for (const item of dailyItems.filter((i) => !i.done)) {
    if (candidates.length >= 5) break;
    candidates.push({ text: item.text, source: "planner" });
  }

  const topPriorities = candidates.slice(0, 3);

  // ── Suggested focus block ────────────────────────────────────────────────

  let suggestedFocusBlock: string;
  if (overdueItems.length > 0) {
    suggestedFocusBlock = `Clear overdue: "${overdueItems[0].text}" — tackle this first, then move forward.`;
  } else if (dueToday.length > 0) {
    suggestedFocusBlock = `Due today: "${dueToday[0].text}" — block 90 minutes of focused time.`;
  } else if (highLeverageProjects.length > 0) {
    const p = highLeverageProjects[0];
    suggestedFocusBlock = `Deep work: ${p.title} — ${p.nextAction}`;
  } else if (dailyItems.filter((i) => !i.done).length > 0) {
    suggestedFocusBlock = `Start your day: "${dailyItems.find((i) => !i.done)!.text}"`;
  } else {
    suggestedFocusBlock = "Review your weekly goals and set tomorrow's top 3 priorities.";
  }

  // ── Headline ─────────────────────────────────────────────────────────────

  const headlineParts: string[] = [];
  if (overdueItems.length > 0)
    headlineParts.push(`${overdueItems.length} overdue`);
  if (dueToday.length > 0)
    headlineParts.push(`${dueToday.length} due today`);
  if (habitsTotal > 0)
    headlineParts.push(`habits ${habitsDone}/${habitsTotal}`);
  if (highLeverageProjects.length > 0 && headlineParts.length === 0)
    headlineParts.push(`${highLeverageProjects.length} active priorities`);

  const headline =
    headlineParts.length > 0
      ? headlineParts.join(" · ")
      : "Clear slate — execute your top priorities.";

  // ── AI prompt context ────────────────────────────────────────────────────

  const ctxLines: string[] = [
    `Daily Briefing — ${todayStr}`,
    "",
  ];

  if (overdueItems.length > 0) {
    ctxLines.push(`OVERDUE (${overdueItems.length}):`);
    for (const o of overdueItems)
      ctxLines.push(`- ${o.text} (${o.daysOverdue}d overdue)${o.projectName ? ` [${o.projectName}]` : ""}`);
    ctxLines.push("");
  }

  if (dueToday.length > 0) {
    ctxLines.push(`DUE TODAY (${dueToday.length}):`);
    for (const d of dueToday)
      ctxLines.push(`- ${d.text}${d.projectName ? ` [${d.projectName}]` : ""}`);
    ctxLines.push("");
  }

  if (topPriorities.length > 0) {
    ctxLines.push("TOP PRIORITIES:");
    topPriorities.forEach((p, i) =>
      ctxLines.push(`${i + 1}. ${p.text}${p.projectName ? ` [${p.projectName}]` : ""}`)
    );
    ctxLines.push("");
  }

  if (highLeverageProjects.length > 0) {
    ctxLines.push("ACTIVE HIGH-PRIORITY PROJECTS:");
    for (const p of highLeverageProjects)
      ctxLines.push(`- ${p.title} (${p.priority}) — Next: ${p.nextAction}`);
    ctxLines.push("");
  }

  if (dailyItems.length > 0) {
    ctxLines.push("TODAY'S PLAN:");
    for (const i of dailyItems)
      ctxLines.push(`- ${i.done ? "[x]" : "[ ]"} ${i.text}`);
    ctxLines.push("");
  }

  if (weeklyItems.length > 0) {
    ctxLines.push("WEEKLY GOALS:");
    for (const i of weeklyItems.filter((i) => !i.done).slice(0, 3))
      ctxLines.push(`- ${i.text}`);
    ctxLines.push("");
  }

  if (monthlyItems.length > 0) {
    ctxLines.push("MONTHLY FOCUS:");
    for (const i of monthlyItems.slice(0, 3)) ctxLines.push(`- ${i}`);
    ctxLines.push("");
  }

  if (habitFocus.length > 0) {
    ctxLines.push(`HABITS (${habitsDone}/${habitsTotal} done today):`);
    for (const h of habitFocus) {
      const streakNote = h.streak > 0 ? ` (${h.streak}d streak)` : "";
      ctxLines.push(`- ${h.done ? "✓" : "○"} ${h.name}${streakNote}`);
    }
    ctxLines.push("");
  }

  if (relevantMemories.length > 0) {
    ctxLines.push("IMPORTANT SAVED NOTES:");
    for (const m of relevantMemories)
      ctxLines.push(`- [${m.importance}] ${m.title}`);
    ctxLines.push("");
  }

  ctxLines.push(`FOCUS SUGGESTION: ${suggestedFocusBlock}`);

  const aiPromptContext = ctxLines.join("\n");

  return {
    date:                 todayStr,
    headline,
    topPriorities,
    overdueItems,
    dueToday,
    highLeverageProjects,
    relevantMemories,
    habitFocus,
    suggestedFocusBlock,
    aiPromptContext,
  };
}
