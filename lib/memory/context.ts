import type { MemoryItem } from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";

export interface MemoryContextResult {
  items: MemoryItem[];
  contextBlock: string;
}

// ── Context budgeting ──────────────────────────────────────────────────────

const SECTION_CAPS = {
  project: 900,
  memory:  900,
  planner: 700,
  vision:  700,
  habits:  500,
} as const;

const MAX_TOTAL_CHARS = 2000;

/**
 * trimContextSection
 *
 * Trims a context block to maxChars, preserving the section heading and
 * avoiding mid-word cuts. Appends a short notice when trimming occurs.
 */
export function trimContextSection(section: string, maxChars: number): string {
  if (section.length <= maxChars) return section;

  // Split into heading block (## lines and blank lines before body) vs body
  const lines = section.split("\n");
  const headingLines: string[] = [];
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#") || (headingLines.length > 0 && lines[i] === "")) {
      headingLines.push(lines[i]);
      bodyStart = i + 1;
    } else {
      break;
    }
  }

  const heading = headingLines.join("\n");
  const body = lines.slice(bodyStart).join("\n");
  const TRIM_NOTICE = "\n…(trimmed for length.)";
  const budget = maxChars - heading.length - TRIM_NOTICE.length - 1; // -1 for \n separator

  if (budget <= 0) return heading + TRIM_NOTICE;

  let trimmed = body.slice(0, budget);
  // Avoid cutting mid-word — walk back to last space
  if (trimmed.length === budget && body[budget] !== undefined && body[budget] !== " ") {
    const lastSpace = trimmed.lastIndexOf(" ");
    if (lastSpace > budget * 0.75) trimmed = trimmed.slice(0, lastSpace);
  }

  return `${heading}\n${trimmed.trimEnd()}${TRIM_NOTICE}`;
}

export interface CombinedContextResult {
  combined: string;
  sources: string[];
}

interface CombinedContextInput {
  projectBlock?: string;
  memoryBlock:  string;
  plannerBlock: string;
  visionBlock:  string;
  habitBlock?:  string;
  maxTotalChars?: number;
}

/**
 * buildCombinedContext
 *
 * Applies per-section caps, then enforces a total character budget.
 * Priority order: memory > planner > vision > habits.
 * Lower-priority sections are dropped (not trimmed further) when budget runs out.
 */
export function buildCombinedContext(input: CombinedContextInput): CombinedContextResult {
  const {
    projectBlock = "",
    memoryBlock,
    plannerBlock,
    visionBlock,
    habitBlock  = "",
    maxTotalChars = MAX_TOTAL_CHARS,
  } = input;

  // Apply per-section caps first — priority: project > memory > planner > vision > habits
  const sections: Array<{ key: string; label: string; block: string }> = [
    { key: "project", label: "Project", block: projectBlock ? trimContextSection(projectBlock, SECTION_CAPS.project) : "" },
    { key: "memory",  label: "Memory",  block: memoryBlock  ? trimContextSection(memoryBlock,  SECTION_CAPS.memory)  : "" },
    { key: "planner", label: "Planner", block: plannerBlock ? trimContextSection(plannerBlock, SECTION_CAPS.planner) : "" },
    { key: "vision",  label: "Vision",  block: visionBlock  ? trimContextSection(visionBlock,  SECTION_CAPS.vision)  : "" },
    { key: "habits",  label: "Habits",  block: habitBlock   ? trimContextSection(habitBlock,   SECTION_CAPS.habits)  : "" },
  ];

  const parts: string[] = [];
  const sources: string[] = [];
  let remaining = maxTotalChars;

  for (const { label, block } of sections) {
    if (!block) continue;

    if (block.length <= remaining) {
      parts.push(block);
      sources.push(label);
      remaining -= block.length + 2; // +2 for "\n\n" separator
    } else if (remaining > 120) {
      // Trim further to squeeze into remaining budget
      const fitted = trimContextSection(block, remaining - 2);
      parts.push(fitted);
      sources.push(label);
      remaining = 0;
    }
    // No room — skip section entirely
    if (remaining <= 0) break;
  }

  return { combined: parts.join("\n\n"), sources };
}

// ── Planner context ────────────────────────────────────────────────────────

export interface PlannerData {
  daily?: string[];   // incomplete + complete daily items as display strings
  weekly?: string[];
  monthly?: string[];
}

/**
 * Trigger words that signal the user is asking about plans/priorities.
 * When any of these appear in the query, planner context is included.
 */
const PLANNER_TRIGGERS = [
  "today",
  "focus",
  "priorit",      // covers priority / priorities
  "work on",
  "next action",
  "plan my day",
  "plan for",
  "schedule",
  "agenda",
  "weekly",
  "monthly",
  "what should",
  "what to",
];

/**
 * getPlannerContext
 *
 * Returns a formatted planner context block when the query matches
 * planner-relevant trigger words and planner data is non-empty.
 *
 * Returns an empty string when no planner context is relevant.
 */
export function getPlannerContext(
  query: string,
  planner: PlannerData
): string {
  const q = query.toLowerCase();

  const triggered = PLANNER_TRIGGERS.some((t) => q.includes(t));
  if (!triggered) return "";

  const sections: string[] = ["## Relevant Planner Context", ""];

  const hasContent =
    (planner.daily?.length ?? 0) > 0 ||
    (planner.weekly?.length ?? 0) > 0 ||
    (planner.monthly?.length ?? 0) > 0;

  if (!hasContent) return "";

  if (planner.daily && planner.daily.length > 0) {
    sections.push("**Today's Plan:**");
    for (const item of planner.daily) sections.push(`- ${item}`);
    sections.push("");
  }

  if (planner.weekly && planner.weekly.length > 0) {
    sections.push("**Weekly Goals:**");
    for (const item of planner.weekly) sections.push(`- ${item}`);
    sections.push("");
  }

  if (planner.monthly && planner.monthly.length > 0) {
    sections.push("**Monthly Focus:**");
    for (const item of planner.monthly) sections.push(`- ${item}`);
    sections.push("");
  }

  return sections.join("\n").trimEnd();
}

// ── Vision context ─────────────────────────────────────────────────────────

export interface VisionData {
  yr1?: string[];
  yr3?: string[];
  yr5?: string[];
}

/**
 * Trigger words that signal the user is asking about long-term direction.
 * When any of these appear in the query, vision context is included.
 */
const VISION_TRIGGERS = [
  "long term",
  "long-term",
  "vision",
  "goal",
  "goals",
  "direction",
  "roadmap",
  "strategy",
  "1 year",
  "one year",
  "3 year",
  "three year",
  "5 year",
  "five year",
  "future",
  "north star",
  "where am i going",
  "what should i build",
  "where do i want",
  "10 year",
  "ten year",
];

/**
 * getVisionContext
 *
 * Returns a formatted vision context block when the query matches
 * long-term strategy trigger words and vision data is non-empty.
 *
 * Returns an empty string when no vision context is relevant.
 */
export function getVisionContext(
  query: string,
  vision: VisionData
): string {
  const q = query.toLowerCase();

  const triggered = VISION_TRIGGERS.some((t) => q.includes(t));
  if (!triggered) return "";

  const hasContent =
    (vision.yr1?.length ?? 0) > 0 ||
    (vision.yr3?.length ?? 0) > 0 ||
    (vision.yr5?.length ?? 0) > 0;

  if (!hasContent) return "";

  const sections: string[] = ["## Relevant Vision Context", ""];

  if (vision.yr1 && vision.yr1.length > 0) {
    sections.push("**1-Year Vision:**");
    for (const item of vision.yr1) sections.push(`- ${item}`);
    sections.push("");
  }

  if (vision.yr3 && vision.yr3.length > 0) {
    sections.push("**3-Year Vision:**");
    for (const item of vision.yr3) sections.push(`- ${item}`);
    sections.push("");
  }

  if (vision.yr5 && vision.yr5.length > 0) {
    sections.push("**5-Year Vision:**");
    for (const item of vision.yr5) sections.push(`- ${item}`);
    sections.push("");
  }

  return sections.join("\n").trimEnd();
}

// ── Habit context ──────────────────────────────────────────────────────────

export interface HabitEntry {
  id:   string;
  name: string;
  icon: string;
}

const HABIT_TRIGGERS = [
  "habit",
  "habits",
  "streak",
  "consistent",
  "consistency",
  "discipline",
  "routine",
  "routines",
  "daily",
  "momentum",
  "accountability",
];

/**
 * getHabitContext
 *
 * Returns a formatted habit context block when the query matches habit-related
 * trigger words. Includes each habit's current streak and today's completion state.
 *
 * Returns an empty string when no habit context is relevant or habits list is empty.
 */
export function getHabitContext(
  query: string,
  habits: HabitEntry[],
  habitLog: Record<string, string[]>
): string {
  const q = query.toLowerCase();
  const triggered = HABIT_TRIGGERS.some((t) => q.includes(t));
  if (!triggered || habits.length === 0) return "";

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDone = habitLog[todayKey] ?? [];

  // Compute consecutive-day streak for a habit (same logic as HabitPanel)
  function computeStreak(habitId: string): number {
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

  const sections: string[] = ["## Relevant Habit Context", ""];

  sections.push("**Tracked Habits:**");
  for (const habit of habits) {
    const streak = computeStreak(habit.id);
    const streakNote = streak > 0 ? ` — ${streak}d streak 🔥` : "";
    sections.push(`- ${habit.icon} ${habit.name}${streakNote}`);
  }
  sections.push("");

  sections.push("**Today's Status:**");
  for (const habit of habits) {
    const done = todayDone.includes(habit.id);
    sections.push(`- ${done ? "✓" : "○"} ${habit.name}`);
  }

  return sections.join("\n").trimEnd();
}

// ── Project context ────────────────────────────────────────────────────────

/**
 * getProjectContext
 *
 * When the user's query mentions a project by name (or category/alias),
 * returns a structured context block with that project's full details:
 * status, priority, objective, next action, open tasks, overdue tasks,
 * and related memories.
 *
 * Matches the first project whose title words substantially appear in the query.
 * Falls back to category keyword matching when no title matches.
 * Returns empty string when no project can be matched.
 */
export function getProjectContext(
  query: string,
  projects: Project[],
  projectTasks: ProjectTask[],
  memoryItems: MemoryItem[]
): string {
  if (projects.length === 0) return "";

  const q = query.toLowerCase();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Try to match a project by title — all significant words must appear
  let matched: Project | undefined;
  for (const project of projects) {
    const words = project.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const matchCount = words.filter((w) => q.includes(w)).length;
    // Require at least half the title words to match, or full single-word title
    if (matchCount >= Math.max(1, Math.ceil(words.length * 0.5))) {
      matched = project;
      break;
    }
  }

  // Fallback: match by category keywords
  if (!matched) {
    const CATEGORY_ALIASES: Record<string, string[]> = {
      "AI / Automation":  ["ai", "automation", "aigentic"],
      "Bitcoin / Crypto":  ["bitcoin", "btc", "crypto", "sats"],
      "Real Estate":      ["real estate", "realty", "property"],
      "Content / Brand":  ["content", "brand", "youtube", "podcast"],
      "Business Ops":     ["business", "ops", "operations", "admin"],
      "Software":         ["software", "app", "dashboard", "sovereign"],
      "Education":        ["education", "course", "learning", "class", "gh600", "unlv"],
      "Health / Fitness": ["health", "fitness", "workout", "gym"],
    };
    for (const [cat, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (aliases.some((a) => q.includes(a))) {
        matched = projects.find((p) => p.category === cat && p.status === "Active");
        if (matched) break;
      }
    }
  }

  if (!matched) return "";

  const tasks = projectTasks.filter((t) => t.project_id === matched!.id);
  const openTasks = tasks.filter((t) => t.status !== "Done");
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date < todayStr
  );
  const doneTasks = tasks.filter((t) => t.status === "Done");

  // Related memories — exact project id match
  const relatedMemories = memoryItems.filter((m) =>
    m.relatedProjectIds.includes(matched!.id)
  );

  const lines: string[] = [
    `## Project Context: ${matched.title}`,
    "",
    `**Status:** ${matched.status} | **Priority:** ${matched.priority} | **Category:** ${matched.category}`,
  ];

  if (matched.due_date) {
    const overdue = matched.due_date < todayStr;
    lines.push(`**Due:** ${matched.due_date}${overdue ? " ⚠️ OVERDUE" : ""}`);
  }

  if (matched.objective) {
    lines.push("", `**Objective:** ${matched.objective}`);
  }

  if (matched.next_action) {
    lines.push(`**Next Action:** ${matched.next_action}`);
  }

  if (matched.description) {
    lines.push(`**Description:** ${matched.description}`);
  }

  // Task summary
  lines.push("", `**Tasks:** ${doneTasks.length}/${tasks.length} done`);

  if (overdueTasks.length > 0) {
    lines.push("", "**Overdue Tasks:**");
    for (const t of overdueTasks.slice(0, 5)) {
      lines.push(`- ⚠️ [${t.priority}] ${t.title} (due ${t.due_date})`);
    }
  }

  if (openTasks.length > 0) {
    lines.push("", "**Open Tasks:**");
    for (const t of openTasks.filter((t) => !overdueTasks.includes(t)).slice(0, 5)) {
      lines.push(`- [${t.status}] [${t.priority}] ${t.title}`);
    }
  }

  if (matched.notes) {
    lines.push("", `**Notes:** ${matched.notes}`);
  }

  if (relatedMemories.length > 0) {
    lines.push("", "**Related Memories:**");
    for (const m of relatedMemories.slice(0, 3)) {
      lines.push(`- [${m.importance}] ${m.title}`);
    }
  }

  return lines.join("\n");
}

// ── Memory context ─────────────────────────────────────────────────────────

/**
 * getRelevantMemoryContext
 *
 * Finds the top 5 most relevant MemoryItems for a given query using
 * keyword/tag/people matching with an importance boost.
 *
 * No vector embeddings — this is a local-first, keyword-based approach
 * suitable for personal use. Replace scoring with embedding similarity
 * when migrating to Supabase + pgvector.
 */
export function getRelevantMemoryContext(
  query: string,
  memoryItems: MemoryItem[],
  projects: Project[]
): MemoryContextResult {
  const q = query.toLowerCase().trim();
  if (!q || memoryItems.length === 0) return { items: [], contextBlock: "" };

  // Split into meaningful words (skip short stop-words)
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = memoryItems
    .map((item) => {
      let score = 0;

      const searchText = [
        item.title,
        item.content,
        ...item.tags,
        ...item.relatedPeople,
        item.type,
      ]
        .join(" ")
        .toLowerCase();

      // Full phrase match — strongest signal
      if (searchText.includes(q)) score += 10;

      // Individual word matches
      for (const word of words) {
        if (searchText.includes(word)) score += 2;
      }

      // Exact tag match — strong signal
      for (const tag of item.tags) {
        const t = tag.toLowerCase();
        if (q.includes(t) || t.includes(q)) score += 5;
      }

      // People name match
      for (const person of item.relatedPeople) {
        const p = person.toLowerCase();
        if (p.includes(q) || q.includes(p)) score += 4;
      }

      // Importance boost — surface critical context first
      const importanceBoost: Record<string, number> = {
        Critical: 4,
        High: 3,
        Medium: 1,
        Low: 0,
      };
      score += importanceBoost[item.importance] ?? 0;

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ item }) => item);

  if (scored.length === 0) return { items: [], contextBlock: "" };

  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  const contextBlock = [
    "## Relevant Memory Context",
    "",
    ...scored.map((item, i) => {
      const lines: string[] = [
        `### [${i + 1}] [${item.type}] ${item.title}`,
        `Importance: ${item.importance} | Source: ${item.source}`,
        "",
        item.content,
      ];

      if (item.relatedProjectIds.length > 0) {
        const names = item.relatedProjectIds
          .map((id) => projectMap.get(id) ?? id)
          .join(", ");
        lines.push(`Related Projects: ${names}`);
      }

      if (item.relatedPeople.length > 0) {
        lines.push(`People: ${item.relatedPeople.join(", ")}`);
      }

      if (item.tags.length > 0) {
        lines.push(`Tags: ${item.tags.map((t) => `#${t}`).join(" ")}`);
      }

      return lines.filter(Boolean).join("\n");
    }),
  ].join("\n");

  return { items: scored, contextBlock };
}
