"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  Project,
  ProjectTask,
  ProjectStatus,
  ProjectCategory,
  ProjectPriority,
  TaskStatus,
} from "@/lib/types/projects";
import {
  upsertProjectSupabase,
  upsertProjectTaskSupabase,
  deleteProjectTaskSupabase,
} from "@/lib/repositories/projectRepository";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROJECTS_KEY = "sovereign_projects";
const TASKS_KEY = "sovereign_project_tasks";

const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; border: string }> = {
  Active:   { color: "#10b981", bg: "rgba(16,185,129,0.1)",   border: "rgba(16,185,129,0.22)" },
  Paused:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.22)" },
  Idea:     { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.22)" },
  Shipped:  { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.22)" },
  Archived: { color: "#64748b", bg: "rgba(100,116,135,0.08)", border: "rgba(100,116,135,0.18)" },
};

const PRIORITY_CONFIG: Record<ProjectPriority, { color: string; bg: string; border: string }> = {
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.22)" },
  High:     { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)" },
  Medium:   { color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.18)" },
  Low:      { color: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.14)" },
};

const CATEGORY_CONFIG: Record<ProjectCategory, { color: string; bg: string }> = {
  "Personal":        { color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  "Client":          { color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  "Agentic Systems": { color: "#fb7185", bg: "rgba(251,113,133,0.1)" },
  "DWT":             { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  "Sovereign OS":    { color: "#818cf8", bg: "rgba(129,140,248,0.1)" },
  "Crypto Mondays":  { color: "#fb923c", bg: "rgba(251,146,60,0.1)" },
  "UNLV":            { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  "Other":           { color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

const STATUSES: ProjectStatus[] = ["Active", "Paused", "Idea", "Shipped", "Archived"];
const CATEGORIES: ProjectCategory[] = [
  "Personal", "Client", "Agentic Systems", "DWT", "Sovereign OS", "Crypto Mondays", "UNLV", "Other",
];
const PRIORITIES: ProjectPriority[] = ["Critical", "High", "Medium", "Low"];
const TASK_STATUS_CYCLE: TaskStatus[] = ["Todo", "In Progress", "Done"];

// ── Seed Data ─────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

const SEED_PROJECTS: Project[] = [
  {
    id: "seed_sovereign_os",
    title: "Sovereign OS",
    status: "Active",
    category: "Sovereign OS",
    priority: "High",
    description: "Personal AI operating system — command center, planner, content engine, AI assistant, project management.",
    objective: "Ship full project management dashboard with AI",
    next_action: "Test and iterate on new project features",
    due_date: "",
    links: [],
    notes: "",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "seed_dwt",
    title: "Digital Wealth Transfer",
    status: "Active",
    category: "DWT",
    priority: "High",
    description: "AI-powered marketplace and service platform for Las Vegas businesses.",
    objective: "Grow lead volume via directory and AI systems offer",
    next_action: "Publish next blog post and promote AI systems offer",
    due_date: "",
    links: ["https://digitalwealthtransfer.com"],
    notes: "",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "seed_aigentic",
    title: "Aigentic Systems",
    status: "Active",
    category: "Agentic Systems",
    priority: "Critical",
    description: "AI automation services business for local businesses. Chatbots, funnels, CRM, lead systems.",
    objective: "Close first paid client",
    next_action: "Set up lead engine with Alberto",
    due_date: "",
    links: [],
    notes: "",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "seed_bmr",
    title: "Big Money Realty Lead Engine",
    status: "Paused",
    category: "Client",
    priority: "Medium",
    description: "AI-powered lead engine for Big Money Realty.",
    objective: "Launch MVP lead capture and qualification flow",
    next_action: "Alberto to run DB schema migration",
    due_date: "",
    links: [],
    notes: "",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "seed_cm",
    title: "Crypto Mondays Las Vegas",
    status: "Active",
    category: "Crypto Mondays",
    priority: "Medium",
    description: "Bitcoin and crypto education meetup chapter for Las Vegas.",
    objective: "Host consistent monthly events and grow attendance",
    next_action: "Plan next meetup venue and date",
    due_date: "",
    links: [],
    notes: "Leads from the CM LV website go to the chapter operator (Aigentic Systems).",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "seed_unlv",
    title: "UNLV GH-600 Course",
    status: "Active",
    category: "UNLV",
    priority: "High",
    description: "Graduate health informatics certification and course development at UNLV.",
    objective: "Complete course requirements and lab work",
    next_action: "Review GH-600 lab materials",
    due_date: "",
    links: [],
    notes: "",
    created_at: now(),
    updated_at: now(),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type ParsedTask = { title: string; priority: ProjectPriority };

function newId(prefix = "p"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return `Due in ${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DueDateState = "overdue" | "urgent" | "normal" | null;

function getDueDateState(dateStr: string, isComplete: boolean): DueDateState {
  if (!dateStr || isComplete) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 3) return "urgent";
  return "normal";
}

function isProjectComplete(status: ProjectStatus): boolean {
  return status === "Shipped" || status === "Archived";
}

// Parse numbered/bulleted list lines from AI response into task titles
function parseTasksFromText(text: string): ParsedTask[] {
  const results: ParsedTask[] = [];
  const seen = new Set<string>();

  for (const line of text.split("\n")) {
    const isListItem = /^\s*(\d+[\.\)]|[-*•])\s+/.test(line);
    if (!isListItem) continue;

    const cleaned = line
      .replace(/^\s*\d+[\.\)]\s+/, "")
      .replace(/^\s*[-*•]\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .trim();

    if (!cleaned || cleaned.length < 3) continue;

    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    // Detect urgency keywords to auto-assign priority
    let priority: ProjectPriority = "Medium";
    if (/\b(urgent|critical|immediately|asap|blocker)\b/.test(lower)) priority = "Critical";
    else if (/\b(high priority|important|high-priority)\b/.test(lower)) priority = "High";

    results.push({ title: cleaned, priority });
  }

  return results;
}

function hasListContent(text: string): boolean {
  return /^\s*(\d+[\.\)]|[-*•])\s+.+/m.test(text);
}

// Migrate old-format projects (from previous version of projects page)
function migrateProject(raw: Record<string, unknown>): Project {
  const statusMap: Record<string, ProjectStatus> = {
    Active: "Active", Paused: "Paused", Complete: "Shipped", Idea: "Idea",
  };
  const oldUrl = typeof raw.url === "string" && raw.url ? [raw.url] : [];
  const ts = typeof raw.last_updated === "string" ? raw.last_updated : now();
  return {
    id: String(raw.id ?? newId()),
    title: String(raw.title ?? "Untitled"),
    status: statusMap[String(raw.status)] ?? "Idea",
    category: "Other",
    priority: "Medium",
    description: String(raw.description ?? ""),
    objective: "",
    next_action: String(raw.next_action ?? ""),
    due_date: "",
    links: (raw.links as string[] | undefined) ?? oldUrl,
    notes: "",
    created_at: ts,
    updated_at: ts,
  };
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return SEED_PROJECTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_PROJECTS;
    return parsed.map((p) =>
      "category" in p ? (p as unknown as Project) : migrateProject(p)
    );
  } catch {
    return SEED_PROJECTS;
  }
}

function loadTasks(): ProjectTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectTask[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, color, bg, border }: { label: string; color: string; bg: string; border?: string }) {
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full shrink-0"
      style={{ color, background: bg, border: `1px solid ${border ?? bg}` }}
    >
      {label}
    </span>
  );
}

// ── DueDateBadge ──────────────────────────────────────────────────────────────

function DueDateBadge({ dateStr, isComplete }: { dateStr: string; isComplete: boolean }) {
  const state = getDueDateState(dateStr, isComplete);
  if (!state) return null;
  const label = formatDueDate(dateStr);
  if (state === "overdue") {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
      >
        ⚠ {label}
      </span>
    );
  }
  if (state === "urgent") {
    return <span className="text-[9px] font-semibold shrink-0" style={{ color: "rgba(245,158,11,0.8)" }}>{label}</span>;
  }
  return <span className="text-[9px] text-white/25 shrink-0">{label}</span>;
}

// ── InlineSelect ──────────────────────────────────────────────────────────────

function InlineSelect<T extends string>({
  value, options, onChange, style,
}: { value: T; options: T[]; onChange: (v: T) => void; style?: React.CSSProperties }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-transparent text-[10px] font-semibold uppercase tracking-wider focus:outline-none cursor-pointer appearance-none pr-1"
      style={style}
    >
      {options.map((o) => (
        <option key={o} value={o} style={{ background: "#0d0d14", color: "#fff" }}>{o}</option>
      ))}
    </select>
  );
}

// ── DragHandle ────────────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <div
      className="flex flex-col gap-[3px] shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-25 hover:!opacity-60 transition-opacity select-none"
      style={{ width: 10, paddingTop: 1 }}
    >
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-[3px]">
          {[0, 1].map((col) => (
            <span
              key={col}
              className="w-[3px] h-[3px] rounded-full"
              style={{ background: "rgba(255,255,255,0.5)" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── TaskDueDate ───────────────────────────────────────────────────────────────

function TaskDueDate({ value, onChange, isComplete }: { value: string; onChange: (v: string) => void; isComplete: boolean }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const state = getDueDateState(value, isComplete);

  function openPicker() {
    setEditing(true);
    requestAnimationFrame(() => {
      try { inputRef.current?.showPicker(); } catch {}
      inputRef.current?.focus();
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="bg-transparent text-[9px] focus:outline-none w-24 shrink-0"
        style={{ colorScheme: "dark", color: "rgba(255,255,255,0.4)" }}
      />
    );
  }

  if (!value) {
    return (
      <button
        onClick={openPicker}
        className="text-[9px] text-white/15 hover:text-white/35 transition-colors shrink-0 whitespace-nowrap opacity-0 group-hover:opacity-100"
      >
        Set date
      </button>
    );
  }

  const label = formatDueDate(value);
  const color = state === "overdue" ? "#ef4444" : state === "urgent" ? "rgba(245,158,11,0.8)" : "rgba(255,255,255,0.25)";

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={openPicker}
        className="text-[9px] transition-opacity hover:opacity-80 whitespace-nowrap"
        style={{ color, fontWeight: state === "overdue" || state === "urgent" ? "bold" : "normal" }}
      >
        {state === "overdue" ? `⚠ ${label}` : label}
      </button>
      <button
        onClick={() => onChange("")}
        className="text-white/15 hover:text-white/40 transition-colors text-[10px] leading-none ml-0.5 opacity-0 group-hover:opacity-100"
        title="Clear date"
      >
        ×
      </button>
    </div>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task, onUpdate, onDelete, isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  task: ProjectTask;
  onUpdate: (id: string, field: keyof ProjectTask, value: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: { preventDefault(): void }) => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
}) {
  const done = task.status === "Done";

  return (
    <div
      draggable={!done}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl group transition-opacity"
      style={{
        background: done ? "rgba(16,185,129,0.04)" : isDragOver ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.03)",
        border: done ? "1px solid rgba(16,185,129,0.1)" : isDragOver ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.06)",
        opacity: isDragging ? 0.4 : 1,
        cursor: done ? "default" : "grab",
      }}
    >
      {/* Drag handle */}
      {!done ? <DragHandle /> : <div className="shrink-0" style={{ width: 10 }} />}

      {/* Status cycle */}
      <button
        onClick={() => {
          const idx = TASK_STATUS_CYCLE.indexOf(task.status);
          const next = TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length];
          onUpdate(task.id, "status", next);
        }}
        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
        style={{
          background: done ? "rgba(16,185,129,0.8)" : "transparent",
          border: done ? "1px solid rgba(16,185,129,0.8)" : task.status === "In Progress" ? "1px solid rgba(245,158,11,0.6)" : "1px solid rgba(255,255,255,0.15)",
        }}
        title="Cycle status"
      >
        {done && (
          <svg viewBox="0 0 8 8" fill="none" stroke="black" strokeWidth="1.5" className="w-2 h-2">
            <path d="M1 4l2 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {task.status === "In Progress" && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.8)" }} />
        )}
      </button>

      {/* Title */}
      <input
        value={task.title}
        onChange={(e) => onUpdate(task.id, "title", e.target.value)}
        className="flex-1 bg-transparent text-xs focus:outline-none min-w-0"
        style={{
          color: done ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
          textDecoration: done ? "line-through" : "none",
        }}
        placeholder="Task title"
      />

      {/* Priority */}
      <InlineSelect
        value={task.priority}
        options={PRIORITIES}
        onChange={(v) => onUpdate(task.id, "priority", v)}
        style={{ color: PRIORITY_CONFIG[task.priority].color }}
      />

      {/* Due date */}
      <TaskDueDate
        value={task.due_date}
        onChange={(v) => onUpdate(task.id, "due_date", v)}
        isComplete={done}
      />

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity text-white/40"
      >
        ×
      </button>
    </div>
  );
}

// ── Project AI Panel ──────────────────────────────────────────────────────────

function ProjectAIPanel({
  project,
  existingTaskTitles,
  onImportTasks,
}: {
  project: Project;
  existingTaskTitles: string[];
  onImportTasks: (tasks: ParsedTask[]) => { imported: number; skipped: number };
}) {
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [customQ, setCustomQ] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function buildContext(): string {
    return [
      `Project: ${project.title}`,
      `Status: ${project.status} | Priority: ${project.priority} | Category: ${project.category}`,
      project.description ? `Description: ${project.description}` : "",
      project.objective ? `Current Objective: ${project.objective}` : "",
      project.next_action ? `Next Action: ${project.next_action}` : "",
      project.due_date ? `Due Date: ${project.due_date}` : "",
      project.notes ? `Notes: ${project.notes}` : "",
    ].filter(Boolean).join("\n");
  }

  const runAI = useCallback(
    async (question: string) => {
      if (streaming || !question.trim()) return;
      setResponse("");
      setImportResult(null);
      setStreaming(true);

      const message = `${buildContext()}\n\n${question}`;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/project-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) { setResponse("AI service error. Try again."); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setResponse(acc);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResponse("Connection error. Try again.");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streaming, project]
  );

  function handleImport() {
    if (importing || !response) return;
    setImporting(true);
    setImportResult(null);

    const parsed = parseTasksFromText(response);
    const existingLower = new Set(existingTaskTitles.map((t) => t.toLowerCase().trim()));

    // Filter out titles that already exist
    const deduped = parsed.filter((t) => !existingLower.has(t.title.toLowerCase().trim()));
    const skipped = parsed.length - deduped.length;

    const result = onImportTasks(deduped);
    setImportResult({ imported: result.imported, skipped: result.skipped + skipped });
    setImporting(false);
  }

  const PRESETS = [
    { label: "Summarize", q: "Summarize this project in 2-3 sentences. Then identify the single most important thing to do next." },
    { label: "Next Steps", q: "What are the next 5 concrete, specific steps to move this project forward right now?" },
    { label: "Break Into Tasks", q: "Break this project into 10-15 specific actionable tasks I can assign and track. Use a numbered list." },
    { label: "Today's Focus", q: "Given everything in this project, what is the single best thing to focus on today and why?" },
  ];

  const showImportButton = !streaming && response && hasListContent(response);

  return (
    <div className="flex flex-col gap-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => runAI(p.q)}
            disabled={streaming}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.85)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom question */}
      <form
        onSubmit={(e) => { e.preventDefault(); runAI(customQ); setCustomQ(""); }}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <input
          value={customQ}
          onChange={(e) => setCustomQ(e.target.value)}
          placeholder="Ask anything about this project…"
          disabled={streaming}
          className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!customQ.trim() || streaming}
          className="text-[10px] font-bold px-3 py-1 rounded-lg transition-all disabled:opacity-30"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}
        >
          Ask
        </button>
        {streaming && (
          <button
            type="button"
            onClick={() => { abortRef.current?.abort(); setStreaming(false); }}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "rgba(248,113,113,0.75)" }}
          >
            Stop
          </button>
        )}
      </form>

      {/* Response */}
      {(response || streaming) && (
        <div
          className="rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", color: "rgba(255,255,255,0.65)", minHeight: 60 }}
        >
          {response}
          {streaming && (
            <span
              className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-indigo-400/70 animate-pulse"
              style={{ verticalAlign: "text-bottom" }}
            />
          )}
          {!streaming && !response && (
            <span className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          )}
        </div>
      )}

      {/* Import as Tasks */}
      {showImportButton && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", color: "rgba(52,211,153,0.9)" }}
          >
            {importing ? "Importing…" : "↓ Import as Tasks"}
          </button>

          {importResult !== null && (
            <span
              className="text-[10px] font-semibold"
              style={{
                color: importResult.imported > 0 ? "rgba(52,211,153,0.75)" : "rgba(248,113,113,0.65)",
              }}
            >
              {importResult.imported > 0
                ? `✓ ${importResult.imported} task${importResult.imported !== 1 ? "s" : ""} imported${importResult.skipped > 0 ? ` · ${importResult.skipped} already existed` : ""}`
                : importResult.skipped > 0
                ? `All ${importResult.skipped} tasks already exist in this project.`
                : "No valid tasks found in this response."}
            </span>
          )}
        </div>
      )}

      {!response && !streaming && (
        <p className="text-[10px] text-white/20 text-center pt-2">
          Choose a preset or ask your own question about this project.
        </p>
      )}
    </div>
  );
}

// ── Project Modal ─────────────────────────────────────────────────────────────

type ModalTab = "overview" | "tasks" | "ai";

function ProjectModal({
  project, tasks, onClose, onUpdateProject, onAddTask, onUpdateTask, onDeleteTask, onBatchAddTasks, onReorderTasks,
}: {
  project: Project;
  tasks: ProjectTask[];
  onClose: () => void;
  onUpdateProject: (id: string, patch: Partial<Project>) => void;
  onAddTask: (projectId: string, title: string) => void;
  onUpdateTask: (id: string, field: keyof ProjectTask, value: string) => void;
  onDeleteTask: (id: string) => void;
  onBatchAddTasks: (projectId: string, tasks: ParsedTask[]) => { imported: number; skipped: number };
  onReorderTasks: (projectId: string, orderedIds: string[]) => void;
}) {
  const [tab, setTab] = useState<ModalTab>("overview");
  const [newLink, setNewLink] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const openTasksList = projectTasks.filter((t) => t.status !== "Done");
  const completedTasksList = projectTasks.filter((t) => t.status === "Done");
  const doneTasks = completedTasksList.length;
  const overdueTasks = openTasksList.filter((t) => getDueDateState(t.due_date, false) === "overdue");

  const complete = isProjectComplete(project.status);
  const projectDueDateState = getDueDateState(project.due_date, complete);

  function update(patch: Partial<Project>) { onUpdateProject(project.id, patch); }

  function addLink() {
    const url = newLink.trim();
    if (!url) return;
    update({ links: [...project.links, url] });
    setNewLink("");
  }

  function removeLink(idx: number) { update({ links: project.links.filter((_, i) => i !== idx) }); }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusCfg = STATUS_CONFIG[project.status];
  const priorityCfg = PRIORITY_CONFIG[project.priority];
  const categoryCfg = CATEGORY_CONFIG[project.category];

  const TAB_LABELS: { id: ModalTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    {
      id: "tasks",
      label: `Tasks (${projectTasks.length})${overdueTasks.length > 0 ? " ⚠" : ""}`,
    },
    { id: "ai", label: "AI" },
  ];

  const existingTaskTitles = projectTasks.map((t) => t.title);

  function handleImportTasks(parsed: ParsedTask[]): { imported: number; skipped: number } {
    return onBatchAddTasks(project.id, parsed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", maxHeight: "calc(100vh - 6rem)" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Title + close */}
          <div className="flex items-start gap-3 mb-4">
            <input
              value={project.title}
              onChange={(e) => update({ title: e.target.value })}
              className="flex-1 bg-transparent text-lg font-bold text-white/90 focus:outline-none border-b border-transparent focus:border-white/10 pb-0.5 transition-colors"
              placeholder="Project title"
            />
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-all shrink-0 text-lg"
            >
              ×
            </button>
          </div>

          {/* Overdue alert banner */}
          {(projectDueDateState === "overdue" || overdueTasks.length > 0) && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-[10px] font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.85)" }}
            >
              ⚠
              <span>
                {[
                  projectDueDateState === "overdue" ? "Project past due date" : "",
                  overdueTasks.length > 0 ? `${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""}` : "",
                ].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
              <InlineSelect value={project.status} options={STATUSES} onChange={(v) => update({ status: v })} style={{ color: statusCfg.color }} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: priorityCfg.bg, border: `1px solid ${priorityCfg.border}`, color: priorityCfg.color }}>
              <InlineSelect value={project.priority} options={PRIORITIES} onChange={(v) => update({ priority: v })} style={{ color: priorityCfg.color }} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: categoryCfg.bg, color: categoryCfg.color, border: `1px solid ${categoryCfg.bg}` }}>
              <InlineSelect value={project.category} options={CATEGORIES} onChange={(v) => update({ category: v })} style={{ color: categoryCfg.color }} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TAB_LABELS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: tab === id ? "rgba(99,102,241,0.12)" : "transparent",
                  border: tab === id ? "1px solid rgba(99,102,241,0.22)" : "1px solid transparent",
                  color: tab === id ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.28)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Description</label>
                <textarea value={project.description} onChange={(e) => update({ description: e.target.value })} rows={2} className="w-full bg-transparent text-sm text-white/60 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed" placeholder="What is this project?" />
              </div>

              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-1.5">Current Objective</label>
                <input value={project.objective} onChange={(e) => update({ objective: e.target.value })} className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none" placeholder="What are you trying to achieve right now?" />
              </div>

              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/50 mb-1.5">Next Action</label>
                <input value={project.next_action} onChange={(e) => update({ next_action: e.target.value })} className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none" placeholder="What's the immediate next step?" />
              </div>

              {/* Due Date with urgency */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Target Date</label>
                  <input
                    type="date"
                    value={project.due_date}
                    onChange={(e) => update({ due_date: e.target.value })}
                    className="bg-transparent text-sm text-white/50 focus:outline-none cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                {project.due_date && (
                  <div className="mt-4">
                    <DueDateBadge dateStr={project.due_date} isComplete={complete} />
                  </div>
                )}
              </div>

              {/* Links */}
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Links</label>
                <div className="flex flex-col gap-1.5 mb-2">
                  {project.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-blue-400/60 hover:text-blue-400/90 truncate transition-colors">↗ {link}</a>
                      <button onClick={() => removeLink(idx)} className="text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={newLink} onChange={(e) => setNewLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLink(); }} placeholder="https://..." className="flex-1 bg-transparent text-xs text-white/40 placeholder:text-white/15 focus:outline-none border-b border-white/08 pb-0.5" />
                  <button onClick={addLink} disabled={!newLink.trim()} className="text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-30" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "rgba(147,197,253,0.8)" }}>Add</button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Notes</label>
                <textarea value={project.notes} onChange={(e) => update({ notes: e.target.value })} rows={4} className="w-full bg-transparent text-sm text-white/50 placeholder:text-white/15 focus:outline-none resize-none leading-relaxed" placeholder="Context, decisions, blockers, ideas…" />
              </div>

              <div className="flex items-center gap-4 pt-2 text-[9px] text-white/15">
                <span>Created {formatDate(project.created_at)}</span>
                <span>·</span>
                <span>Updated {formatDate(project.updated_at)}</span>
              </div>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {tab === "tasks" && (
            <div className="flex flex-col gap-3">
              <form
                onSubmit={(e) => { e.preventDefault(); if (newTaskTitle.trim()) { onAddTask(project.id, newTaskTitle.trim()); setNewTaskTitle(""); } }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.09)" }}
              >
                <span className="text-white/20 text-sm">+</span>
                <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a task…" className="flex-1 bg-transparent text-sm text-white/60 placeholder:text-white/20 focus:outline-none" />
                <button type="submit" disabled={!newTaskTitle.trim()} className="text-[10px] font-bold px-3 py-1 rounded-lg transition-all disabled:opacity-30" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "rgba(52,211,153,0.85)" }}>Add</button>
              </form>

              {projectTasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((doneTasks / projectTasks.length) * 100)}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                  </div>
                  <span className="text-[10px] text-white/25 shrink-0">{doneTasks}/{projectTasks.length} done</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {openTasksList.map((task) => (
                  <div key={task.id} className="relative">
                    {dragOverId === task.id && dragId !== task.id && (
                      <div className="absolute -top-px left-0 right-0 h-0.5 rounded-full z-10" style={{ background: "rgba(99,102,241,0.6)" }} />
                    )}
                    <TaskRow
                      task={task}
                      onUpdate={onUpdateTask}
                      onDelete={onDeleteTask}
                      isDragging={dragId === task.id}
                      isDragOver={dragOverId === task.id}
                      onDragStart={() => setDragId(task.id)}
                      onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== task.id) setDragOverId(task.id); }}
                      onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                      onDrop={() => {
                        if (dragId && dragId !== task.id) {
                          const from = openTasksList.findIndex((t) => t.id === dragId);
                          const to = openTasksList.findIndex((t) => t.id === task.id);
                          if (from !== -1 && to !== -1) {
                            const reordered = [...openTasksList];
                            const [moved] = reordered.splice(from, 1);
                            reordered.splice(to, 0, moved);
                            onReorderTasks(project.id, [...reordered, ...completedTasksList].map((t) => t.id));
                          }
                        }
                        setDragId(null);
                        setDragOverId(null);
                      }}
                    />
                  </div>
                ))}
                {completedTasksList.length > 0 && (
                  <>
                    <p className="text-[9px] text-white/15 uppercase tracking-wider mt-2 mb-0.5 pl-1">Completed</p>
                    {completedTasksList.map((task) => (
                      <TaskRow key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
                    ))}
                  </>
                )}
              </div>

              {projectTasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-white/20">No tasks yet.</p>
                  <p className="text-xs text-white/12 mt-1">Add tasks above, or use AI → Break Into Tasks.</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI TAB ── */}
          {tab === "ai" && (
            <ProjectAIPanel
              project={project}
              existingTaskTitles={existingTaskTitles}
              onImportTasks={handleImportTasks}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

interface TaskStats { total: number; done: number }

function ProjectCard({
  project, taskStats, onOpen, onUpdateStatus, onArchive,
}: {
  project: Project;
  taskStats: TaskStats;
  onOpen: () => void;
  onUpdateStatus: (id: string, status: ProjectStatus) => void;
  onArchive: (id: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[project.status];
  const priorityCfg = PRIORITY_CONFIG[project.priority];
  const categoryCfg = CATEGORY_CONFIG[project.category];
  const complete = isProjectComplete(project.status);
  const dueDateState = getDueDateState(project.due_date, complete);

  const taskPct = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;
  const openTasks = taskStats.total - taskStats.done;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 group relative transition-all cursor-pointer"
      style={{
        background: dueDateState === "overdue" ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.025)",
        border: dueDateState === "overdue" ? "1px solid rgba(239,68,68,0.12)" : "1px solid rgba(255,255,255,0.07)",
      }}
      onClick={onOpen}
    >
      {/* Archive button */}
      <button
        onClick={(e) => { e.stopPropagation(); onArchive(project.id); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[9px] font-semibold px-2 py-0.5 rounded-md transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }}
        title="Archive"
      >
        Archive
      </button>

      {/* Top row — category + priority + task count */}
      <div className="flex items-center gap-2 flex-wrap pr-14">
        <Pill label={project.category} color={categoryCfg.color} bg={categoryCfg.bg} border={categoryCfg.bg} />
        <Pill label={project.priority} color={priorityCfg.color} bg={priorityCfg.bg} border={priorityCfg.border} />
        {taskStats.total > 0 && (
          <span className="text-[9px] text-white/20 ml-auto shrink-0">
            {taskStats.done}/{taskStats.total} tasks
          </span>
        )}
      </div>

      {/* Task progress bar */}
      {taskStats.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${taskPct}%`,
                background: taskPct === 100 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, rgba(99,102,241,0.7), rgba(99,102,241,0.9))",
              }}
            />
          </div>
          {openTasks > 0 && (
            <span className="text-[9px] text-white/20 shrink-0">{openTasks} open</span>
          )}
          {taskPct === 100 && (
            <span className="text-[9px] font-bold shrink-0" style={{ color: "rgba(52,211,153,0.7)" }}>Done</span>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: statusCfg.color, boxShadow: project.status === "Active" ? `0 0 5px ${statusCfg.color}80` : "none" }}
          />
          <h3 className="text-sm font-semibold text-white/85 leading-tight">{project.title}</h3>
        </div>
        {project.description && (
          <p className="text-xs leading-relaxed line-clamp-2 pl-3.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Next action */}
      {project.next_action && (
        <div
          className="rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20 mb-0.5">Next</p>
          <p className="text-xs text-white/55 leading-snug">{project.next_action}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idx = STATUSES.indexOf(project.status);
              const next = STATUSES[(idx + 1) % (STATUSES.length - 1)];
              onUpdateStatus(project.id, next);
            }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
            style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
            title="Cycle status"
          >
            {project.status}
          </button>
          {project.due_date && (
            <DueDateBadge dateStr={project.due_date} isComplete={complete} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/15">{formatDate(project.updated_at)}</span>
          <span className="text-[10px] font-bold opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "rgba(165,180,252,0.8)" }}>
            Open →
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Weekly Review Prompt Builder ─────────────────────────────────────────────

function buildWeeklyReviewPrompt(projects: Project[], tasks: ProjectTask[]): string {
  const activeProjects = projects.filter((p) => p.status === "Active");
  const overdueProjList = activeProjects.filter((p) => getDueDateState(p.due_date, false) === "overdue");
  const openTasks = tasks.filter((t) => t.status !== "Done");
  const overdueTaskList = openTasks.filter((t) => getDueDateState(t.due_date, false) === "overdue");
  const completedTaskList = tasks.filter((t) => t.status === "Done");
  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  const projectSummaries = activeProjects.map((p) => {
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    const doneCt = pTasks.filter((t) => t.status === "Done").length;
    return [
      `• ${p.title} [${p.priority}]`,
      p.objective ? `  Objective: ${p.objective}` : "",
      p.next_action ? `  Next Action: ${p.next_action}` : "",
      p.due_date ? `  Due: ${formatDueDate(p.due_date)}` : "",
      pTasks.length > 0 ? `  Tasks: ${doneCt}/${pTasks.length} done` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const overdueLines = [
    ...overdueProjList.map((p) => `• Project: ${p.title} (${formatDueDate(p.due_date)})`),
    ...overdueTaskList.map((t) => `• Task: "${t.title}" [${projectMap.get(t.project_id) ?? "Unknown"}] (${formatDueDate(t.due_date)})`),
  ].join("\n") || "None — all clear.";

  const completedLines = completedTaskList.slice(0, 15)
    .map((t) => `• ${t.title} [${projectMap.get(t.project_id) ?? "?"}]`)
    .join("\n") || "None yet.";

  const criticalLines = openTasks
    .filter((t) => t.priority === "Critical" || t.priority === "High")
    .slice(0, 8)
    .map((t) => `• [${t.priority}] ${t.title} [${projectMap.get(t.project_id) ?? "?"}]`)
    .join("\n") || "None.";

  return `You are a strategic advisor doing a weekly project review. Be direct, specific, and actionable. No generic advice.

## Current Project Data

### Active Projects (${activeProjects.length})
${projectSummaries || "No active projects."}

### Overdue Items
${overdueLines}

### Recent Completed Tasks (${completedTaskList.length} total)
${completedLines}

### High/Critical Priority Open Tasks
${criticalLines}

---

Generate a focused weekly review with these exact sections:

**Overall Status** — 2-3 honest sentences on where things stand.

**What's Working** — 2-3 bullets on wins, momentum, or positive signals.

**Needs Attention** — 2-3 bullets on blockers, overdue items, or stalling areas. Be specific.

**Top 3 Priorities This Week** — numbered list, specific and actionable, tied to actual projects/tasks above.

**Weekly Focus** — one clear sentence: where to put the most energy this week and why.`;
}

// ── Today View ────────────────────────────────────────────────────────────────

function TodayTaskRow({
  task, projectTitle, onToggleDone, onOpenProject,
}: {
  task: ProjectTask;
  projectTitle: string;
  onToggleDone: () => void;
  onOpenProject: () => void;
}) {
  const done = task.status === "Done";
  const state = getDueDateState(task.due_date, done);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: done ? "rgba(16,185,129,0.04)" : state === "overdue" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.025)",
        border: done ? "1px solid rgba(16,185,129,0.1)" : state === "overdue" ? "1px solid rgba(239,68,68,0.1)" : "1px solid rgba(255,255,255,0.06)",
        opacity: done ? 0.55 : 1,
      }}
    >
      <button
        onClick={onToggleDone}
        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
        style={{
          background: done ? "rgba(16,185,129,0.8)" : "transparent",
          border: done ? "1px solid rgba(16,185,129,0.8)" : "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {done && (
          <svg viewBox="0 0 8 8" fill="none" stroke="black" strokeWidth="1.5" className="w-2 h-2">
            <path d="M1 4l2 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{ color: done ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)", textDecoration: done ? "line-through" : "none" }}
        >
          {task.title}
        </p>
        <button
          onClick={onOpenProject}
          className="text-[9px] text-white/25 hover:text-indigo-400/60 transition-colors mt-0.5"
        >
          {projectTitle} →
        </button>
      </div>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_CONFIG[task.priority]?.color ?? "#94a3b8" }} />
      {task.due_date && !done && (
        <span
          className="text-[9px] font-semibold shrink-0 whitespace-nowrap"
          style={{ color: state === "overdue" ? "#ef4444" : state === "urgent" ? "rgba(245,158,11,0.8)" : "rgba(255,255,255,0.25)" }}
        >
          {state === "overdue" ? `⚠ ${formatDueDate(task.due_date)}` : formatDueDate(task.due_date)}
        </span>
      )}
    </div>
  );
}

function TodayView({
  projects, tasks, onUpdateTask, onOpenProject,
}: {
  projects: Project[];
  tasks: ProjectTask[];
  onUpdateTask: (id: string, field: keyof ProjectTask, value: string) => void;
  onOpenProject: (projectId: string) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayMs = new Date(todayStr + "T00:00:00").getTime();

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const overdueTasks = openTasks.filter((t) => getDueDateState(t.due_date, false) === "overdue");
  const dueTodayTasks = openTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date + "T00:00:00").getTime() === todayMs && getDueDateState(t.due_date, false) !== "overdue";
  });
  const urgentTasks = openTasks.filter((t) => {
    if (t.priority !== "Critical" && t.priority !== "High") return false;
    if (getDueDateState(t.due_date, false) === "overdue") return false;
    if (t.due_date && new Date(t.due_date + "T00:00:00").getTime() === todayMs) return false;
    return true;
  });
  const activeNextActions = projects.filter((p) => p.status === "Active" && p.next_action);
  const isEmpty = overdueTasks.length === 0 && dueTodayTasks.length === 0 && urgentTasks.length === 0 && activeNextActions.length === 0;

  function renderTaskList(list: ProjectTask[]) {
    return list.map((task) => {
      const project = projectMap.get(task.project_id);
      return (
        <TodayTaskRow
          key={task.id}
          task={task}
          projectTitle={project?.title ?? "Unknown"}
          onToggleDone={() => onUpdateTask(task.id, "status", task.status === "Done" ? "Todo" : "Done")}
          onOpenProject={() => project && onOpenProject(project.id)}
        />
      );
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {overdueTasks.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: "rgba(239,68,68,0.7)" }}>Overdue</p>
          <div className="flex flex-col gap-1.5">{renderTaskList(overdueTasks)}</div>
        </div>
      )}

      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: "rgba(245,158,11,0.65)" }}>Due Today</p>
        <div className="flex flex-col gap-1.5">
          {dueTodayTasks.length > 0
            ? renderTaskList(dueTodayTasks)
            : <p className="text-xs text-white/20 pl-1">Nothing due today.</p>}
        </div>
      </div>

      {urgentTasks.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: "rgba(96,165,250,0.6)" }}>High Priority</p>
          <div className="flex flex-col gap-1.5">{renderTaskList(urgentTasks)}</div>
        </div>
      )}

      {activeNextActions.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5 text-indigo-400/50">Project Next Actions</p>
          <div className="flex flex-col gap-1.5">
            {activeNextActions.map((p) => (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: PRIORITY_CONFIG[p.priority]?.color ?? "#94a3b8" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/65 leading-snug">{p.next_action}</p>
                  <button onClick={() => onOpenProject(p.id)} className="text-[9px] text-white/25 hover:text-indigo-400/60 transition-colors mt-0.5">
                    {p.title} →
                  </button>
                </div>
                <span className="text-[9px] font-semibold shrink-0 mt-0.5" style={{ color: STATUS_CONFIG[p.status].color }}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3" style={{ opacity: 0.3 }}>✓</p>
          <p className="text-sm text-white/25">All clear. No overdue or high-priority items.</p>
          <p className="text-xs text-white/12 mt-1">Check back tomorrow or review your project tasks.</p>
        </div>
      )}
    </div>
  );
}

// ── Weekly Review Modal ───────────────────────────────────────────────────────

function WeeklyReviewModal({
  projects, tasks, onClose,
}: {
  projects: Project[];
  tasks: ProjectTask[];
  onClose: () => void;
}) {
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setResponse("");

    fetch("/api/project-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: buildWeeklyReviewPrompt(projects, tasks) }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!isMounted || !res.ok || !res.body) {
        if (isMounted) { setResponse("AI service error. Try again."); setStreaming(false); }
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (isMounted) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setResponse(acc);
      }
      if (isMounted) setStreaming(false);
    }).catch((err) => {
      if (!isMounted || (err instanceof Error && err.name === "AbortError")) return;
      setResponse("Connection error. Try again.");
      setStreaming(false);
    });

    return () => { isMounted = false; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runCount]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", maxHeight: "calc(100vh - 5rem)" }}
      >
        <div className="px-6 pt-6 pb-4 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-indigo-400/50 mb-0.5">AI Analysis</p>
            <h2 className="text-base font-bold text-white/85">Weekly Project Review</h2>
          </div>
          <div className="flex items-center gap-2">
            {streaming && <span className="text-[9px] font-semibold text-indigo-400/60 animate-pulse">Generating…</span>}
            {!streaming && response && (
              <button
                onClick={() => setRunCount((c) => c + 1)}
                className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.7)" }}
              >
                Regenerate
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-all text-lg">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {(response || streaming) ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
              {response}
              {streaming && (
                <span className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-indigo-400/70 animate-pulse" style={{ verticalAlign: "text-bottom" }} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <span className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterStatus = ProjectStatus | "All";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | "All">("All");
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | "All">("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"projects" | "today">("projects");
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setProjects(loadProjects());
    setTasks(loadTasks());
    setLoaded(true);
  }, []);

  function saveProjectsState(next: Project[]) { setProjects(next); save(PROJECTS_KEY, next); }
  function saveTasksState(next: ProjectTask[]) { setTasks(next); save(TASKS_KEY, next); }

  function addProject() {
    const p: Project = {
      id: newId("proj"), title: "New Project", status: "Idea", category: "Other", priority: "Medium",
      description: "", objective: "", next_action: "", due_date: "", links: [], notes: "", created_at: now(), updated_at: now(),
    };
    saveProjectsState([p, ...projects]);
    setOpenId(p.id);
    void upsertProjectSupabase(p);
  }

  function updateProject(id: string, patch: Partial<Project>) {
    const next = projects.map((p) => p.id === id ? { ...p, ...patch, updated_at: now() } : p);
    saveProjectsState(next);
    const updated = next.find((p) => p.id === id);
    if (updated) void upsertProjectSupabase(updated);
  }

  function archiveProject(id: string) {
    updateProject(id, { status: "Archived" });
    if (openId === id) setOpenId(null);
  }

  function addTask(projectId: string, title: string, priority: ProjectPriority = "Medium") {
    const t: ProjectTask = {
      id: newId("task"), project_id: projectId, title, status: "Todo", priority,
      due_date: "", notes: "", created_at: now(), updated_at: now(),
    };
    saveTasksState([t, ...tasks]);
    void upsertProjectTaskSupabase(t);
  }

  function batchAddTasks(projectId: string, parsed: ParsedTask[]): { imported: number; skipped: number } {
    if (parsed.length === 0) return { imported: 0, skipped: 0 };

    const newTasks: ProjectTask[] = parsed.map((p) => ({
      id: newId("task"), project_id: projectId, title: p.title, status: "Todo" as TaskStatus,
      priority: p.priority, due_date: "", notes: "", created_at: now(), updated_at: now(),
    }));

    saveTasksState([...newTasks, ...tasks]);
    void Promise.all(newTasks.map((t) => upsertProjectTaskSupabase(t)));
    return { imported: newTasks.length, skipped: 0 };
  }

  function updateTask(id: string, field: keyof ProjectTask, value: string) {
    const next = tasks.map((t) => t.id === id ? { ...t, [field]: value, updated_at: now() } : t);
    saveTasksState(next);
    const updated = next.find((t) => t.id === id);
    if (updated) void upsertProjectTaskSupabase(updated);
  }

  function deleteTask(id: string) {
    saveTasksState(tasks.filter((t) => t.id !== id));
    void deleteProjectTaskSupabase(id);
  }

  function reorderTasks(projectId: string, orderedIds: string[]) {
    const otherTasks = tasks.filter((t) => t.project_id !== projectId);
    const projectTasksMap = new Map(tasks.filter((t) => t.project_id === projectId).map((t) => [t.id, t]));
    const reordered = orderedIds.map((id) => projectTasksMap.get(id)).filter(Boolean) as ProjectTask[];
    saveTasksState([...reordered, ...otherTasks]);
    // No Supabase sync for reorders — schema has no order field
  }

  const activeProjects = projects.filter((p) => p.status !== "Archived");
  const archivedProjects = projects.filter((p) => p.status === "Archived");
  const showArchived = filterStatus === "Archived";

  const hasActiveFilters = filterStatus !== "All" || searchQuery.trim() !== "" || filterCategory !== "All" || filterPriority !== "All" || overdueOnly;

  function clearFilters() {
    setSearchQuery("");
    setFilterCategory("All");
    setFilterPriority("All");
    setOverdueOnly(false);
    setFilterStatus("All");
  }

  const visibleProjects = showArchived
    ? archivedProjects
    : activeProjects.filter((p) => {
        if (filterStatus !== "All" && p.status !== filterStatus) return false;
        if (filterCategory !== "All" && p.category !== filterCategory) return false;
        if (filterPriority !== "All" && p.priority !== filterPriority) return false;
        if (overdueOnly && getDueDateState(p.due_date, isProjectComplete(p.status)) !== "overdue") return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!p.title.toLowerCase().includes(q) &&
              !p.description.toLowerCase().includes(q) &&
              !p.objective.toLowerCase().includes(q) &&
              !p.next_action.toLowerCase().includes(q)) return false;
        }
        return true;
      });

  const openProject = projects.find((p) => p.id === openId) ?? null;

  const counts: Record<ProjectStatus, number> = {
    Active:   activeProjects.filter((p) => p.status === "Active").length,
    Paused:   activeProjects.filter((p) => p.status === "Paused").length,
    Idea:     activeProjects.filter((p) => p.status === "Idea").length,
    Shipped:  activeProjects.filter((p) => p.status === "Shipped").length,
    Archived: archivedProjects.length,
  };

  // Count overdue projects
  const overdueProjects = activeProjects.filter(
    (p) => getDueDateState(p.due_date, isProjectComplete(p.status)) === "overdue"
  );
  const overdueTasks = tasks.filter(
    (t) => t.status !== "Done" && getDueDateState(t.due_date, false) === "overdue"
  );

  function getTaskStats(projectId: string): TaskStats {
    const pts = tasks.filter((t) => t.project_id === projectId);
    return { total: pts.length, done: pts.filter((t) => t.status === "Done").length };
  }

  if (!loaded) {
    return <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">

      {openProject && (
        <ProjectModal
          project={openProject}
          tasks={tasks}
          onClose={() => setOpenId(null)}
          onUpdateProject={updateProject}
          onAddTask={(pid, title) => addTask(pid, title)}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onBatchAddTasks={batchAddTasks}
          onReorderTasks={reorderTasks}
        />
      )}

      {showWeeklyReview && (
        <WeeklyReviewModal
          projects={projects}
          tasks={tasks}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}

      {/* ── Hero ── */}
      <section className="relative py-12 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.04) 55%, transparent 75%)" }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-indigo-400/60 mb-4 relative">Project Management</p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-3 relative"
          style={{ background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          What&apos;s In Motion.
        </h1>
        <p className="text-sm text-white/25 max-w-xs mx-auto leading-relaxed relative">Active projects, next actions, and where momentum lives.</p>

        {/* Overdue alert */}
        {(overdueProjects.length > 0 || overdueTasks.length > 0) && (
          <div className="flex items-center justify-center gap-1.5 mt-5 relative">
            <div
              className="inline-flex items-center gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)" }}
            >
              ⚠ {[
                overdueProjects.length > 0 ? `${overdueProjects.length} project${overdueProjects.length !== 1 ? "s" : ""} overdue` : "",
                overdueTasks.length > 0 ? `${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} overdue` : "",
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap mt-5 relative">
          {(["Active", "Paused", "Idea", "Shipped"] as ProjectStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                <span>{counts[s]}</span>
                <span style={{ opacity: 0.7 }}>{s}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── View Toggle + Actions ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["projects", "today"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: viewMode === mode ? "rgba(99,102,241,0.12)" : "transparent",
                border: viewMode === mode ? "1px solid rgba(99,102,241,0.22)" : "1px solid transparent",
                color: viewMode === mode ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.3)",
              }}
            >
              {mode === "today" ? "Today" : "Projects"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWeeklyReview(true)}
            className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.85)" }}
          >
            ✦ Weekly Review
          </button>
          <button
            onClick={addProject}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}
          >
            + New Project
          </button>
        </div>
      </div>

      {/* ── Filters (projects mode only) ── */}
      {viewMode === "projects" && (
        <div className="flex flex-col gap-2.5 mb-5">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "rgba(255,255,255,0.2)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects…"
              className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/20 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-white/20 hover:text-white/50 transition-colors text-sm">×</button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(["All", "Active", "Paused", "Idea", "Shipped", "Archived"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: filterStatus === s ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                  border: filterStatus === s ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  color: filterStatus === s ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.3)",
                }}
              >
                {s}{s === "Archived" && archivedProjects.length > 0 && <span className="ml-1 opacity-60">({archivedProjects.length})</span>}
              </button>
            ))}

            <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ProjectCategory | "All")}
              className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer transition-all"
              style={{
                background: filterCategory !== "All" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                border: filterCategory !== "All" ? "1px solid rgba(99,102,241,0.22)" : "1px solid rgba(255,255,255,0.06)",
                color: filterCategory !== "All" ? "rgba(165,180,252,0.85)" : "rgba(255,255,255,0.3)",
                colorScheme: "dark",
              }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as ProjectPriority | "All")}
              className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer transition-all"
              style={{
                background: filterPriority !== "All" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                border: filterPriority !== "All" ? "1px solid rgba(99,102,241,0.22)" : "1px solid rgba(255,255,255,0.06)",
                color: filterPriority !== "All" ? "rgba(165,180,252,0.85)" : "rgba(255,255,255,0.3)",
                colorScheme: "dark",
              }}
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: overdueOnly ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
                border: overdueOnly ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(255,255,255,0.06)",
                color: overdueOnly ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.3)",
              }}
            >
              Overdue
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
              >
                Clear ×
              </button>
            )}

            {hasActiveFilters && !showArchived && (
              <span className="text-[9px] text-white/20 ml-auto">{visibleProjects.length} result{visibleProjects.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {viewMode === "today" ? (
        <TodayView
          projects={projects}
          tasks={tasks}
          onUpdateTask={updateTask}
          onOpenProject={(id) => setOpenId(id)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-16">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskStats={getTaskStats(project.id)}
              onOpen={() => setOpenId(project.id)}
              onUpdateStatus={(id, status) => updateProject(id, { status })}
              onArchive={archiveProject}
            />
          ))}
          {visibleProjects.length === 0 && (
            <div className="col-span-full rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
              {showArchived ? (
                <p className="text-sm text-white/20">No archived projects.</p>
              ) : hasActiveFilters ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-white/25">No projects match your filters.</p>
                  <button onClick={clearFilters} className="text-xs font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-white/25">No projects here yet.</p>
                  <button onClick={addProject} className="text-xs font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}>
                    + Add your first project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
