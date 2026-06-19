import type { MemoryItem } from "@/lib/types/memory";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Person } from "@/lib/types/relationships";
import type { Opportunity } from "@/lib/types/opportunities";

export interface MemoryContextResult {
  items: MemoryItem[];
  contextBlock: string;
}

// ── Context budgeting ──────────────────────────────────────────────────────

const SECTION_CAPS = {
  relationship: 900,
  project:      900,
  content:      800,
  memory:       900,
  planner:      700,
  vision:       700,
  habits:       500,
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
  relationshipBlock?: string;
  projectBlock?:      string;
  contentBlock?:      string;
  memoryBlock:        string;
  plannerBlock:       string;
  visionBlock:        string;
  habitBlock?:        string;
  maxTotalChars?:     number;
}

/**
 * buildCombinedContext
 *
 * Applies per-section caps, then enforces a total character budget.
 * Priority order: relationship > project > content > memory > planner > vision > habits.
 * Lower-priority sections are dropped (not trimmed further) when budget runs out.
 */
export function buildCombinedContext(input: CombinedContextInput): CombinedContextResult {
  const {
    relationshipBlock = "",
    projectBlock      = "",
    contentBlock      = "",
    memoryBlock,
    plannerBlock,
    visionBlock,
    habitBlock        = "",
    maxTotalChars     = MAX_TOTAL_CHARS,
  } = input;

  // Apply per-section caps first — priority: relationship > project > content > memory > planner > vision > habits
  const sections: Array<{ key: string; label: string; block: string }> = [
    { key: "relationship", label: "Relationship", block: relationshipBlock ? trimContextSection(relationshipBlock, SECTION_CAPS.relationship) : "" },
    { key: "project",      label: "Project",      block: projectBlock      ? trimContextSection(projectBlock,      SECTION_CAPS.project)      : "" },
    { key: "content",      label: "Content",      block: contentBlock      ? trimContextSection(contentBlock,      SECTION_CAPS.content)      : "" },
    { key: "memory",       label: "Memory",       block: memoryBlock       ? trimContextSection(memoryBlock,       SECTION_CAPS.memory)       : "" },
    { key: "planner",      label: "Planner",      block: plannerBlock      ? trimContextSection(plannerBlock,      SECTION_CAPS.planner)      : "" },
    { key: "vision",       label: "Vision",       block: visionBlock       ? trimContextSection(visionBlock,       SECTION_CAPS.vision)       : "" },
    { key: "habits",       label: "Habits",       block: habitBlock        ? trimContextSection(habitBlock,        SECTION_CAPS.habits)       : "" },
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

// ── Relationship context ───────────────────────────────────────────────────

/**
 * Trigger words that signal the user is asking about a person or relationship.
 * Also matches directly against person name, organization, email, and tags.
 */
const RELATIONSHIP_TRIGGERS = [
  "person",
  "people",
  "relationship",
  "client",
  "prospect",
  "partner",
  "founder",
  "mentor",
  "educator",
  "contact",
  "follow up",
  "follow-up",
  "followup",
  "meeting",
  "call",
  "email",
  "intro",
  "introduction",
  "referral",
  "reach out",
  "outreach",
  "crm",
];

/**
 * getRelationshipContext
 *
 * Returns a formatted relationship context block for people relevant to the
 * query. Triggers on keyword matches or direct name/org/tag matches.
 * Returns up to 3 people, scored by relevance.
 *
 * Returns empty string when no relationship context is relevant.
 */
export function getRelationshipContext(
  query: string,
  people: Person[],
  projects: Project[],
  opportunities: Opportunity[],
  memoryItems: MemoryItem[]
): string {
  if (people.length === 0) return "";

  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  // Check global triggers first
  const globallyTriggered = RELATIONSHIP_TRIGGERS.some((t) => q.includes(t));

  // Score each person
  const activePeople = people.filter((p) => p.status !== "Archived");

  const scored = activePeople.map((person) => {
    let score = 0;

    // Global trigger — anyone could be relevant
    if (globallyTriggered) score += 2;

    // Name match — split into words, each match boosts score
    const nameLower = person.name.toLowerCase();
    if (q.includes(nameLower)) {
      score += 15; // full name in query
    } else {
      const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 1);
      for (const nw of nameWords) {
        if (q.includes(nw)) score += 6;
      }
    }

    // Organization match
    if (person.organization) {
      const orgLower = person.organization.toLowerCase();
      if (q.includes(orgLower)) score += 8;
      else {
        const orgWords = orgLower.split(/\s+/).filter((w) => w.length > 2);
        for (const ow of orgWords) {
          if (q.includes(ow)) score += 3;
        }
      }
    }

    // Email match
    if (person.email && q.includes(person.email.toLowerCase())) score += 10;

    // Tag match
    for (const tag of person.tags) {
      const tl = tag.toLowerCase();
      if (q.includes(tl) || tl.includes(q.slice(0, 12))) score += 4;
    }

    // Role match
    if (person.role) {
      const rl = person.role.toLowerCase();
      for (const word of words) {
        if (rl.includes(word)) score += 2;
      }
    }

    // Relationship type keyword match (e.g. "client" in query boosts Clients)
    const typeKeywords: Record<string, string[]> = {
      Founder:   ["founder", "founders"],
      Client:    ["client", "clients"],
      Prospect:  ["prospect", "prospects", "lead", "leads"],
      Partner:   ["partner", "partners", "partnership"],
      Mentor:    ["mentor", "mentors", "mentorship"],
      Educator:  ["educator", "educators", "teacher", "professor"],
      Community: ["community", "member"],
    };
    const matchWords = typeKeywords[person.relationship_type] ?? [];
    if (matchWords.some((w) => q.includes(w))) score += 5;

    // Priority boost
    const priorityBoost: Record<string, number> = {
      Critical: 4, High: 3, Medium: 1, Low: 0,
    };
    score += priorityBoost[person.priority] ?? 0;

    // Follow-up due today or overdue — surface urgently
    const todayStr = new Date().toISOString().slice(0, 10);
    if (person.next_follow_up_at && person.next_follow_up_at <= todayStr) {
      score += 3;
    }

    return { person, score };
  });

  const relevant = scored
    .filter(({ score }) => score > 2) // must have more than global trigger alone
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ person }) => person);

  if (relevant.length === 0) return "";

  const projectMap   = new Map(projects.map((p) => [p.id, p.title]));
  const oppMap       = new Map(opportunities.map((o) => [o.id, o.title]));
  const todayStr     = new Date().toISOString().slice(0, 10);

  const lines: string[] = ["## Relevant Relationship Context", ""];

  for (let i = 0; i < relevant.length; i++) {
    const p = relevant[i];
    lines.push(`### [${i + 1}] ${p.name}`);

    const metaParts: string[] = [];
    if (p.role)         metaParts.push(p.role);
    if (p.organization) metaParts.push(p.organization);
    if (metaParts.length > 0) lines.push(metaParts.join(" @ "));

    lines.push(`Type: ${p.relationship_type} | Status: ${p.status} | Priority: ${p.priority}`);

    if (p.last_contacted_at) {
      lines.push(`Last contacted: ${p.last_contacted_at.slice(0, 10)}`);
    }
    if (p.next_follow_up_at) {
      const overdue = p.next_follow_up_at <= todayStr;
      lines.push(`Next follow-up: ${p.next_follow_up_at}${overdue ? " ⚠️ OVERDUE" : ""}`);
    }

    if (p.related_project_ids.length > 0) {
      const projNames = p.related_project_ids
        .map((id) => projectMap.get(id))
        .filter(Boolean)
        .join(", ");
      if (projNames) lines.push(`Related projects: ${projNames}`);
    }

    if (p.related_opportunity_ids.length > 0) {
      const oppNames = p.related_opportunity_ids
        .map((id) => oppMap.get(id))
        .filter(Boolean)
        .join(", ");
      if (oppNames) lines.push(`Related opportunities: ${oppNames}`);
    }

    if (p.related_memory_ids.length > 0) {
      const mems = p.related_memory_ids
        .map((id) => memoryItems.find((m) => m.id === id)?.title)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      if (mems) lines.push(`Related memories: ${mems}`);
    }

    if (p.tags.length > 0) {
      lines.push(`Tags: ${p.tags.map((t) => `#${t}`).join(" ")}`);
    }

    if (p.notes) {
      const notes = p.notes.length > 200 ? p.notes.slice(0, 200) + "…" : p.notes;
      lines.push(`Notes: ${notes}`);
    }

    if (p.email) lines.push(`Email: ${p.email}`);
    if (p.phone) lines.push(`Phone: ${p.phone}`);

    lines.push("");
  }

  return lines.join("\n").trimEnd();
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

// ── Content context ────────────────────────────────────────────────────────

const CONTENT_TRIGGERS = [
  "content",
  "create",
  "creator",
  "post",
  "publish",
  "article",
  "blog",
  "newsletter",
  "podcast",
  "youtube",
  "instagram",
  "linkedin",
  "reel",
  "video",
  "script",
  "caption",
  "crypto mondays",
  "dwt",
  "repurpose",
  "outline",
];

/**
 * getContentContext
 *
 * Returns relevant content pipeline items when the query matches content/
 * creator keywords. Scores items by title/description/platform match,
 * urgency (overdue or due soon), status (Ready boosted), and priority.
 *
 * Returns empty string when no trigger matches or no items exist.
 */
export function getContentContext(
  query: string,
  contentItems: ContentItem[],
  projects: Project[],
  memoryItems: MemoryItem[]
): string {
  const q = query.toLowerCase();
  const triggered = CONTENT_TRIGGERS.some((t) => q.includes(t));
  if (!triggered || contentItems.length === 0) return "";

  const todayStr = new Date().toISOString().slice(0, 10);
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const active = contentItems.filter((i) => i.status !== "Archived");

  const scored = active
    .map((item) => {
      let score = 0;

      const searchText = [
        item.title,
        item.description,
        item.notes,
        item.format,
        ...item.platforms,
      ]
        .join(" ")
        .toLowerCase();

      // Full phrase match
      if (searchText.includes(q)) score += 10;

      // Individual word matches
      for (const word of words) {
        if (searchText.includes(word)) score += 2;
      }

      // Platform keyword in query
      for (const platform of item.platforms) {
        if (q.includes(platform.toLowerCase())) score += 5;
      }

      // Time-sensitive boosts
      if (item.status === "Ready") score += 3;
      if (item.publish_date) {
        if (item.publish_date < todayStr) {
          score += 4; // overdue — surface first
        } else {
          const diff = Math.round(
            (new Date(item.publish_date + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) /
              86400000
          );
          if (diff <= 7) score += 2; // due within a week
        }
      }

      // Priority boost
      const priorityBoost: Record<string, number> = {
        Critical: 4, High: 3, Medium: 1, Low: 0,
      };
      score += priorityBoost[item.priority] ?? 0;

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);

  if (scored.length === 0) return "";

  // Suppress unused-variable warning — memoryItems available for future scoring
  void memoryItems;

  const projectMap = new Map(projects.map((p) => [p.id, p.title]));
  const lines: string[] = ["## Relevant Content Pipeline", ""];

  for (let i = 0; i < scored.length; i++) {
    const item = scored[i];
    const isOverdue = item.publish_date && item.publish_date < todayStr;
    const platformStr = item.platforms.length > 0 ? item.platforms.join(", ") : "No platform";
    const projectName = item.related_project_id
      ? (projectMap.get(item.related_project_id) ?? null)
      : null;

    lines.push(`### [${i + 1}] [${item.status}] ${item.title || "Untitled"}`);
    lines.push(
      `Platform: ${platformStr} · Format: ${item.format} · Priority: ${item.priority}`
    );

    if (item.publish_date) {
      lines.push(
        `Publish: ${item.publish_date}${isOverdue ? " ⚠️ OVERDUE" : ""}`
      );
    }
    if (item.description) lines.push(`Angle: ${item.description}`);
    if (projectName)      lines.push(`Project: ${projectName}`);
    if (item.notes) {
      const notes = item.notes.length > 200
        ? item.notes.slice(0, 200) + "…"
        : item.notes;
      lines.push(`Notes: ${notes}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
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
