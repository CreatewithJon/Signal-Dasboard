"use client";

/**
 * app/feedback/page.tsx
 *
 * Feedback Engine — Sovereign OS v8.1
 *
 * Captures, tracks, and acts on friction, bugs, ideas, requests,
 * and insights discovered during real-world usage and beta testing.
 *
 * Sections:
 *  1 — Summary Stats
 *  2 — New / Active Issues
 *  3 — Planned & In Progress
 *  4 — Completed
 *  5 — Insights
 *  6 — AI Analysis
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import {
  loadFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  setFeedbackStatus,
  markFeedbackConverted,
} from "@/lib/feedback/store";
import type {
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackSource,
} from "@/lib/types/feedback";
import type { Workspace } from "@/lib/types/workspace";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";

// ── Helpers ────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const TYPE_COLORS: Record<FeedbackType, string> = {
  Bug:         "rgba(239,68,68,0.8)",
  Feature:     "rgba(99,102,241,0.8)",
  UX:          "rgba(245,158,11,0.8)",
  Performance: "rgba(251,146,60,0.8)",
  Workflow:    "rgba(52,211,153,0.8)",
  Insight:     "rgba(167,139,250,0.8)",
};

const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  Critical: "rgba(239,68,68,0.85)",
  High:     "rgba(245,158,11,0.85)",
  Medium:   "rgba(167,139,250,0.7)",
  Low:      "rgba(255,255,255,0.3)",
};

const STATUS_ORDER: FeedbackStatus[] = [
  "New", "Reviewing", "Planned", "In Progress", "Completed", "Rejected",
];

function typeColor(t: FeedbackType) { return TYPE_COLORS[t] ?? "rgba(255,255,255,0.4)"; }
function priorityColor(p: FeedbackPriority) { return PRIORITY_COLORS[p] ?? PRIORITY_COLORS.Low; }

function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-flex items-center text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md"
      style={{
        color,
        background: bg ?? color.replace("0.8", "0.08").replace("0.85", "0.08").replace("0.7", "0.08"),
        border: `1px solid ${color.replace("0.8", "0.18").replace("0.85", "0.18").replace("0.7", "0.14")}`,
      }}
    >
      {label}
    </span>
  );
}

// ── FeedbackForm ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title:       "",
  description: "",
  type:        "Bug" as FeedbackType,
  priority:    "Medium" as FeedbackPriority,
  source:      "Self" as FeedbackSource,
  workspace_id: undefined as string | undefined,
};

function FeedbackForm({
  workspaces,
  initial,
  onSave,
  onCancel,
}: {
  workspaces: Workspace[];
  initial?: Partial<typeof EMPTY_FORM>;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  }

  const inputCls =
    "w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-white/75 placeholder-white/20 outline-none transition-colors focus:border-white/20";
  const labelCls = "text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-1 block";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
    >
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-[11px] font-bold text-white/75">
          {initial ? "Edit Feedback" : "Capture Feedback"}
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className={labelCls}>Title</label>
          <input
            className={inputCls}
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
            placeholder="What happened or what's needed?"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={inputCls}
            style={{ borderColor: "rgba(255,255,255,0.08)", resize: "vertical", minHeight: 72 }}
            placeholder="Steps to reproduce, context, expected vs actual..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select
              className={inputCls}
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              value={form.type}
              onChange={(e) => set("type", e.target.value as FeedbackType)}
            >
              {(["Bug","Feature","UX","Performance","Workflow","Insight"] as FeedbackType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select
              className={inputCls}
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as FeedbackPriority)}
            >
              {(["Critical","High","Medium","Low"] as FeedbackPriority[]).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Source</label>
            <select
              className={inputCls}
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              value={form.source}
              onChange={(e) => set("source", e.target.value as FeedbackSource)}
            >
              {(["Self","Beta User","Client","Team"] as FeedbackSource[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Workspace</label>
            <select
              className={inputCls}
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              value={form.workspace_id ?? ""}
              onChange={(e) => set("workspace_id", e.target.value || undefined)}
            >
              <option value="">Personal</option>
              {workspaces.filter((w) => w.id !== "personal").map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.85)" }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ── FeedbackRow ────────────────────────────────────────────────────────────

function FeedbackRow({
  item,
  workspaces,
  projects,
  onStatusChange,
  onEdit,
  onDelete,
  onConvert,
}: {
  item: FeedbackItem;
  workspaces: Workspace[];
  projects: Array<{ id: string; name: string }>;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onEdit: (item: FeedbackItem) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string, target: "project" | "task" | "memory") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ws = workspaces.find((w) => w.id === item.workspace_id);
  const proj = projects.find((p) => p.id === item.related_project_id);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        background: expanded ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)",
      }}
    >
      {/* Row header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge label={item.type} color={typeColor(item.type)} />
            <Badge label={item.priority} color={priorityColor(item.priority)} />
            {item.source !== "Self" && (
              <Badge label={item.source} color="rgba(255,255,255,0.3)" />
            )}
            {ws && (
              <span
                className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${ws.color}18`, color: ws.color, border: `1px solid ${ws.color}28` }}
              >
                {ws.name}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-white/75 leading-snug truncate">{item.title}</p>
          {item.description && (
            <p className="text-[10px] text-white/35 mt-0.5 leading-relaxed line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className="text-[8px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
            style={{
              background: item.status === "Completed" ? "rgba(52,211,153,0.08)" : item.status === "New" ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.04)",
              color: item.status === "Completed" ? "rgba(52,211,153,0.7)" : item.status === "New" ? "rgba(165,180,252,0.6)" : "rgba(255,255,255,0.3)",
              border: `1px solid ${item.status === "Completed" ? "rgba(52,211,153,0.15)" : item.status === "New" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {item.status}
          </span>
          <p className="text-[9px] text-white/20">{item.created_at.slice(0, 10)}</p>
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          {item.description && (
            <p className="text-[11px] text-white/50 leading-relaxed pt-3">{item.description}</p>
          )}
          {proj && (
            <p className="text-[9px] text-white/25">Linked project: <span className="text-white/45">{proj.name}</span></p>
          )}
          {item.conversion && (
            <div
              className="px-2.5 py-1.5 rounded-lg text-[9px] text-white/40"
              style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}
            >
              Converted → {item.conversion.target} on {item.conversion.converted_at.slice(0, 10)}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Status change */}
            <select
              className="text-[9px] rounded-lg px-2 py-1.5 outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value as FeedbackStatus)}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Edit */}
            <button
              onClick={() => onEdit(item)}
              className="text-[9px] px-2.5 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
            >
              Edit
            </button>

            {/* Convert actions */}
            {!item.conversion && (
              <>
                <button
                  onClick={() => onConvert(item.id, "project")}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", color: "rgba(165,180,252,0.55)" }}
                >
                  → Project
                </button>
                <button
                  onClick={() => onConvert(item.id, "task")}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.14)", color: "rgba(251,191,36,0.55)" }}
                >
                  → Task
                </button>
                <button
                  onClick={() => onConvert(item.id, "memory")}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.14)", color: "rgba(196,181,253,0.55)" }}
                >
                  → Memory
                </button>
              </>
            )}

            {/* Delete */}
            <button
              onClick={() => onDelete(item.id)}
              className="text-[9px] px-2.5 py-1.5 rounded-lg transition-all ml-auto"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.4)" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SectionHeader ──────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
        {label}
      </p>
      {count > 0 && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ background: `${accent.replace("0.8", "0.1")}`, color: accent, border: `1px solid ${accent.replace("0.8", "0.18")}` }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: `${accent.replace("0.8", "0.08")}` }} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [items,      setItems]      = useState<FeedbackItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [projects,   setProjects]   = useState<Array<{ id: string; name: string }>>([]);
  const [loaded,     setLoaded]     = useState(false);

  // Filters
  const [filterType,     setFilterType]     = useState<FeedbackType | "All">("All");
  const [filterPriority, setFilterPriority] = useState<FeedbackPriority | "All">("All");
  const [filterWs,       setFilterWs]       = useState<string>("all");

  // Form state
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState<FeedbackItem | null>(null);

  // AI state
  const [aiInput,   setAiInput]   = useState("");
  const [aiReply,   setAiReply]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const stored = loadFeedback();
    setItems(stored);

    const storedWs = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const hasPersonal = storedWs.some((w) => w.id === "personal");
    setWorkspaces(hasPersonal ? storedWs : [DEFAULT_WORKSPACE, ...storedWs]);

    const storedProj = safeRead<Array<{ id: string; name: string; status?: string }>>(KEYS.PROJECTS, []);
    setProjects(storedProj.map((p) => ({ id: p.id, name: p.name })));

    setLoaded(true);
  }, []);

  const refresh = useCallback(() => setItems(loadFeedback()), []);

  // Filtered items
  const filtered = items.filter((i) => {
    if (filterType !== "All" && i.type !== filterType) return false;
    if (filterPriority !== "All" && i.priority !== filterPriority) return false;
    if (filterWs !== "all") {
      if (filterWs === "personal" && i.workspace_id && i.workspace_id !== "personal") return false;
      if (filterWs !== "personal" && i.workspace_id !== filterWs) return false;
    }
    return true;
  });

  const newActive    = filtered.filter((i) => i.status === "New" || i.status === "Reviewing");
  const inProgress   = filtered.filter((i) => i.status === "Planned" || i.status === "In Progress");
  const completed    = filtered.filter((i) => i.status === "Completed" || i.status === "Rejected");
  const insights     = filtered.filter((i) => i.type === "Insight");

  // Stats
  const criticalCount = items.filter((i) => i.priority === "Critical" && i.status !== "Completed" && i.status !== "Rejected").length;
  const openCount     = items.filter((i) => i.status === "New" || i.status === "Reviewing").length;
  const bugCount      = items.filter((i) => i.type === "Bug" && i.status !== "Completed" && i.status !== "Rejected").length;
  const featureCount  = items.filter((i) => i.type === "Feature" && i.status !== "Completed" && i.status !== "Rejected").length;

  function handleSave(data: typeof EMPTY_FORM) {
    if (editItem) {
      updateFeedback(editItem.id, data);
      setEditItem(null);
    } else {
      createFeedback({ ...data, status: "New" });
      setShowForm(false);
    }
    refresh();
  }

  function handleStatusChange(id: string, status: FeedbackStatus) {
    setFeedbackStatus(id, status);
    refresh();
  }

  function handleDelete(id: string) {
    deleteFeedback(id);
    refresh();
  }

  function handleConvert(id: string, target: "project" | "task" | "memory") {
    const placeholder = crypto.randomUUID();
    markFeedbackConverted(id, target, placeholder);
    refresh();
  }

  function handleEdit(item: FeedbackItem) {
    setEditItem(item);
    setShowForm(false);
  }

  async function handleAiSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiReply("");
    try {
      const context = items
        .slice(0, 30)
        .map((i) => `[${i.type}][${i.priority}][${i.status}] ${i.title}${i.description ? `: ${i.description}` : ""}`)
        .join("\n");
      const res = await fetch("/api/feedback-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: aiInput.trim(), context }),
      });
      const json = await res.json() as { reply?: string; error?: string };
      setAiReply(json.reply ?? json.error ?? "No response.");
    } catch {
      setAiReply("Error connecting to AI.");
    } finally {
      setAiLoading(false);
    }
  }

  const selectCls =
    "text-[9px] rounded-lg px-2.5 py-1.5 outline-none transition-colors";
  const selectStyle = {
    background: "rgba(255,255,255,0.04)",
    border:     "1px solid rgba(255,255,255,0.08)",
    color:      "rgba(255,255,255,0.45)",
  };

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto pt-10 px-4">
        <div className="animate-pulse rounded-2xl h-40" style={{ background: "rgba(255,255,255,0.02)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-16 px-4 space-y-8">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.3em] mb-1"
            style={{ color: "rgba(167,139,250,0.5)" }}
          >
            Sovereign OS
          </p>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(165deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Feedback Engine
          </h1>
          <p className="text-xs text-white/30 mt-1">Capture, track, and act on friction, bugs, and ideas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-[9px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
          >
            ← Home
          </Link>
          <button
            onClick={() => { setShowForm((s) => !s); setEditItem(null); }}
            className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "rgba(196,181,253,0.8)" }}
          >
            + Add Feedback
          </button>
        </div>
      </div>

      {/* ── Section 1: Summary Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open Issues",  value: openCount,     accent: "rgba(99,102,241,0.8)" },
          { label: "Critical",     value: criticalCount, accent: "rgba(239,68,68,0.8)" },
          { label: "Open Bugs",    value: bugCount,      accent: "rgba(245,158,11,0.8)" },
          { label: "Feature Reqs", value: featureCount,  accent: "rgba(167,139,250,0.8)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-4 py-3"
            style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.018)" }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: stat.accent }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Form ──────────────────────────────────────────── */}
      {showForm && !editItem && (
        <FeedbackForm
          workspaces={workspaces}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editItem && (
        <FeedbackForm
          workspaces={workspaces}
          initial={{
            title:        editItem.title,
            description:  editItem.description,
            type:         editItem.type,
            priority:     editItem.priority,
            source:       editItem.source,
            workspace_id: editItem.workspace_id,
          }}
          onSave={handleSave}
          onCancel={() => setEditItem(null)}
        />
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.1em] font-semibold mr-1">Filter:</p>
        <select className={selectCls} style={selectStyle} value={filterType} onChange={(e) => setFilterType(e.target.value as FeedbackType | "All")}>
          <option value="All">All Types</option>
          {(["Bug","Feature","UX","Performance","Workflow","Insight"] as FeedbackType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className={selectCls} style={selectStyle} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as FeedbackPriority | "All")}>
          <option value="All">All Priorities</option>
          {(["Critical","High","Medium","Low"] as FeedbackPriority[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className={selectCls} style={selectStyle} value={filterWs} onChange={(e) => setFilterWs(e.target.value)}>
          <option value="all">All Workspaces</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* ── Section 2: New / Active Issues ──────────────────────────── */}
      <div>
        <SectionHeader label="New & Active" count={newActive.length} accent="rgba(99,102,241,0.8)" />
        {newActive.length === 0 ? (
          <div
            className="rounded-xl px-5 py-6 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-xs text-white/20">No active issues. Add feedback to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {newActive.map((item) => (
              <FeedbackRow
                key={item.id}
                item={item}
                workspaces={workspaces}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvert={handleConvert}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Planned & In Progress ───────────────────────── */}
      {inProgress.length > 0 && (
        <div>
          <SectionHeader label="Planned & In Progress" count={inProgress.length} accent="rgba(245,158,11,0.8)" />
          <div className="space-y-2">
            {inProgress.map((item) => (
              <FeedbackRow
                key={item.id}
                item={item}
                workspaces={workspaces}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvert={handleConvert}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Insights ─────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <SectionHeader label="Insights" count={insights.length} accent="rgba(167,139,250,0.8)" />
          <div className="space-y-2">
            {insights.map((item) => (
              <FeedbackRow
                key={item.id}
                item={item}
                workspaces={workspaces}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvert={handleConvert}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 5: Completed ─────────────────────────────────────── */}
      {completed.length > 0 && (
        <div>
          <SectionHeader label="Completed & Rejected" count={completed.length} accent="rgba(52,211,153,0.7)" />
          <div className="space-y-2">
            {completed.map((item) => (
              <FeedbackRow
                key={item.id}
                item={item}
                workspaces={workspaces}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvert={handleConvert}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: AI Analysis ─────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(167,139,250,0.12)", background: "rgba(167,139,250,0.025)" }}
      >
        <div
          className="px-5 py-3.5 flex items-center gap-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="rgba(196,181,253,0.8)" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/75">AI Analysis</p>
            <p className="text-[9px] text-white/25">Analyze patterns, prioritize issues, surface next actions</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {aiReply && (
            <div
              className="rounded-xl px-4 py-3 text-xs text-white/60 leading-relaxed"
              style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.08)" }}
            >
              {aiReply}
            </div>
          )}
          <form onSubmit={handleAiSubmit} className="flex gap-2">
            <input
              className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none transition-colors focus:border-white/15"
              style={{ borderColor: "rgba(167,139,250,0.14)" }}
              placeholder={items.length === 0
                ? "Add some feedback first, then ask for analysis..."
                : "What patterns do you see? What should I fix first?"}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={aiLoading || items.length === 0}
            />
            <button
              type="submit"
              disabled={aiLoading || !aiInput.trim() || items.length === 0}
              className="px-4 py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.22)", color: "rgba(196,181,253,0.8)" }}
            >
              {aiLoading ? "..." : "Analyze"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
