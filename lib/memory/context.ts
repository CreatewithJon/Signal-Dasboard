import type { MemoryItem } from "@/lib/types/memory";
import type { Project } from "@/lib/types/projects";

export interface MemoryContextResult {
  items: MemoryItem[];
  contextBlock: string;
}

// ── Context budgeting ──────────────────────────────────────────────────────

const SECTION_CAPS = {
  memory:  900,
  planner: 700,
  vision:  700,
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
  memoryBlock:  string;
  plannerBlock: string;
  visionBlock:  string;
  maxTotalChars?: number;
}

/**
 * buildCombinedContext
 *
 * Applies per-section caps, then enforces a total character budget.
 * Priority order: memory > planner > vision.
 * Lower-priority sections are dropped (not trimmed further) when budget runs out.
 */
export function buildCombinedContext(input: CombinedContextInput): CombinedContextResult {
  const {
    memoryBlock,
    plannerBlock,
    visionBlock,
    maxTotalChars = MAX_TOTAL_CHARS,
  } = input;

  // Apply per-section caps first
  const sections: Array<{ key: string; label: string; block: string }> = [
    { key: "memory",  label: "Memory",  block: memoryBlock  ? trimContextSection(memoryBlock,  SECTION_CAPS.memory)  : "" },
    { key: "planner", label: "Planner", block: plannerBlock ? trimContextSection(plannerBlock, SECTION_CAPS.planner) : "" },
    { key: "vision",  label: "Vision",  block: visionBlock  ? trimContextSection(visionBlock,  SECTION_CAPS.vision)  : "" },
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
