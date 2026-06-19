"use client";

/**
 * app/actions/page.tsx
 *
 * Action Engine — Sovereign OS v5.5
 *
 * 4 sections: Urgent · Strategic · Relationship · Content
 * Each action: priority badge, source badge, title, reason, impact/effort,
 * due date, "Develop Plan" (AI modal), "→ Task" (project picker), "→ Opp", "Save"
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import type { Action, ActionEngineResult, ActionPriority, ActionSourceType } from "@/lib/actionEngine/engine";
import type { Person } from "@/lib/types/relationships";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { Opportunity } from "@/lib/types/opportunities";
import type { ContentItem } from "@/lib/types/content";
import type { MemoryItem } from "@/lib/types/memory";

// ── Helpers ────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Design tokens ──────────────────────────────────────────────────────────

const PRIORITY_META: Record<ActionPriority, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "rgba(239,68,68,0.9)",    bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)",   label: "Critical" },
  high:     { color: "rgba(245,158,11,0.9)",   bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)", label: "High"     },
  medium:   { color: "rgba(167,139,250,0.8)",  bg: "rgba(99,102,241,0.05)",  border: "rgba(99,102,241,0.15)", label: "Medium"   },
  low:      { color: "rgba(255,255,255,0.3)",  bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", label: "Low"      },
};

const SOURCE_META: Record<ActionSourceType, { label: string; color: string }> = {
  graph_insight: { label: "Graph",         color: "rgba(99,102,241,0.7)"  },
  opportunity:   { label: "Opportunity",   color: "rgba(245,158,11,0.7)"  },
  relationship:  { label: "Relationship",  color: "rgba(52,211,153,0.7)"  },
  project:       { label: "Project",       color: "rgba(99,102,241,0.7)"  },
  content:       { label: "Content",       color: "rgba(239,68,68,0.7)"   },
  risk:          { label: "Risk",          color: "rgba(239,68,68,0.85)"  },
};

// ── Develop Plan Modal ─────────────────────────────────────────────────────

function DevelopPlanModal({
  action,
  onClose,
}: {
  action: Action;
  onClose: () => void;
}) {
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const context = [
    `Action Engine Recommendation — ${action.priority.toUpperCase()} priority`,
    `Title: ${action.title}`,
    `Description: ${action.description}`,
    `Reason: ${action.reason}`,
    `Source: ${action.sourceType}`,
    `Estimated Impact: ${action.estimatedImpact}`,
    `Estimated Effort: ${action.estimatedEffort}`,
    `Suggested Due Date: ${action.suggestedDueDate}`,
    `Score: ${action.score}/100`,
  ].join("\n");

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context }),
      });
      const data: { reply?: string; error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const SUGGESTIONS = [
    "Build a step-by-step plan",
    "What's the fastest path forward?",
    "What could go wrong here?",
    "Break this into 3 tasks",
  ];

  const pm = PRIORITY_META[action.priority];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: "rgba(8,8,14,0.98)",
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "0 0 80px rgba(99,102,241,0.12)",
          maxHeight: "82vh",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: pm.bg, border: `1px solid ${pm.border}`, color: pm.color }}
              >
                {pm.label}
              </span>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(99,102,241,0.6)" }}>
                Develop Action Plan
              </p>
            </div>
            <p className="text-xs font-semibold text-white/80 leading-snug">{action.title}</p>
            <p className="text-[10px] text-white/35 mt-1 leading-relaxed">{action.reason}</p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors text-base shrink-0 mt-0.5">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-xl px-3 py-2"
                style={{
                  background: m.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  className="text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: m.role === "user" ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.65)" }}
                >
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-1 items-center py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {error && <p className="text-[10px] text-red-400/70">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about this action…"
              rows={2}
              className="flex-1 rounded-xl px-3 py-2.5 text-[11px] resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 shrink-0"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "rgba(165,180,252,0.9)",
              }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Convert to Task Modal ──────────────────────────────────────────────────

function TaskModal({
  action,
  projects,
  onClose,
  onSaved,
}: {
  action: Action;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeProjects = projects.filter((p) => p.status === "Active" || p.status === "Idea");
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id ?? "");
  const [title, setTitle] = useState(action.title);

  function save() {
    if (!selectedProjectId) return;
    const now = new Date().toISOString();
    const newTask: ProjectTask = {
      id:          uid(),
      project_id:  selectedProjectId,
      title:       title.trim() || action.title,
      status:      "Todo",
      priority:    action.priority === "critical" ? "Critical" : action.priority === "high" ? "High" : action.priority === "medium" ? "Medium" : "Low",
      due_date:    action.suggestedDueDate,
      notes:       action.reason,
      created_at:  now,
      updated_at:  now,
    };
    const existing = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    safeWrite(KEYS.PROJECT_TASKS, [...existing, newTask]);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl"
        style={{
          background: "rgba(8,8,14,0.98)",
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "0 0 60px rgba(99,102,241,0.1)",
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(99,102,241,0.6)" }}>
              Convert to Task
            </p>
            <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors text-sm">✕</button>
          </div>
          <p className="text-xs font-semibold text-white/70 mt-1 leading-snug">{action.title}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Task title */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1.5 block" style={{ color: "rgba(255,255,255,0.2)" }}>
              Task title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[11px] outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)",
              }}
            />
          </div>

          {/* Project selector */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1.5 block" style={{ color: "rgba(255,255,255,0.2)" }}>
              Project
            </label>
            {activeProjects.length === 0 ? (
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                No active projects found. <Link href="/projects" className="underline" style={{ color: "rgba(165,180,252,0.6)" }}>Create one →</Link>
              </p>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-[11px] outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#0a0a0f" }}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            <span>Due: {action.suggestedDueDate}</span>
            <span>Priority: {action.priority}</span>
          </div>

          <button
            onClick={save}
            disabled={!selectedProjectId}
            className="w-full py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
            style={{
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "rgba(165,180,252,0.9)",
            }}
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Card ────────────────────────────────────────────────────────────

type ActionCardState = {
  plan: boolean;
  task: boolean;
  savedOpp: boolean;
  savedMemory: boolean;
};

function ActionCard({
  action,
  projects,
}: {
  action: Action;
  projects: Project[];
}) {
  const [modal, setModal] = useState<ActionCardState>({ plan: false, task: false, savedOpp: false, savedMemory: false });

  const pm = PRIORITY_META[action.priority];
  const sm = SOURCE_META[action.sourceType];

  function convertToOpp() {
    const now = new Date().toISOString();
    const newOpp: Opportunity = {
      id:               uid(),
      title:            action.title,
      description:      action.description,
      type:             "Revenue",
      status:           "Reviewing",
      score:            action.score,
      score_reasoning:  action.reason,
      suggested_action: action.description,
      related_people:   [],
      related_project_ids: [],
      related_memory_ids:  [],
      source:           "manual",
      conversion:       null,
      notes:            `Converted from Action Engine. Impact: ${action.estimatedImpact}. Effort: ${action.estimatedEffort}.`,
      created_at:       now,
      updated_at:       now,
    };
    const existing = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    safeWrite(KEYS.OPPORTUNITIES, [...existing, newOpp]);
    setModal((s) => ({ ...s, savedOpp: true }));
  }

  function saveToMemory() {
    const now = new Date().toISOString();
    const newMemory: MemoryItem = {
      id:                uid(),
      title:             action.title,
      content:           `${action.description}\n\nReason: ${action.reason}\n\nImpact: ${action.estimatedImpact} · Effort: ${action.estimatedEffort} · Score: ${action.score}/100`,
      type:              "Decision",
      tags:              [action.sourceType, action.priority, "action-engine"],
      relatedProjectIds: [],
      relatedPeople:     [],
      importance:        action.priority === "critical" ? "Critical" : action.priority === "high" ? "High" : action.priority === "medium" ? "Medium" : "Low",
      source:            "AI",
      createdAt:         now,
      updatedAt:         now,
    };
    const existing = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    safeWrite(KEYS.MEMORY_ITEMS, [...existing, newMemory]);
    setModal((s) => ({ ...s, savedMemory: true }));
  }

  return (
    <>
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.015)",
          border: `1px solid ${pm.border}`,
        }}
      >
        {/* Top row: badges + score */}
        <div className="flex items-start gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <span
              className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: pm.bg, border: `1px solid ${pm.border}`, color: pm.color }}
            >
              {pm.label}
            </span>
            <span
              className="text-[8px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: sm.color }}
            >
              {sm.label}
            </span>
          </div>
          <span
            className="text-[10px] font-bold tabular-nums shrink-0"
            style={{ color: pm.color }}
          >
            {action.score}
          </span>
        </div>

        {/* Title */}
        <p className="text-xs font-semibold text-white/80 leading-snug mb-1">
          {action.title}
        </p>

        {/* Description */}
        <p className="text-[10px] text-white/40 leading-relaxed mb-1.5">
          {action.description}
        </p>

        {/* Reason */}
        <p className="text-[10px] leading-relaxed mb-3" style={{ color: pm.color, opacity: 0.7 }}>
          {action.reason}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.2)" }}>Impact</span>
            <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{action.estimatedImpact}</span>
          </div>
          <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.2)" }}>Effort</span>
            <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{action.estimatedEffort}</span>
          </div>
          <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.2)" }}>Due</span>
            <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{action.suggestedDueDate}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Develop Plan */}
          <button
            onClick={() => setModal((s) => ({ ...s, plan: true }))}
            className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "rgba(165,180,252,0.8)",
            }}
          >
            Develop Plan
          </button>

          {/* → Task */}
          <button
            onClick={() => setModal((s) => ({ ...s, task: true }))}
            className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            → Task
          </button>

          {/* → Opp */}
          <button
            onClick={convertToOpp}
            disabled={modal.savedOpp}
            className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: modal.savedOpp ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${modal.savedOpp ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.09)"}`,
              color: modal.savedOpp ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.45)",
            }}
          >
            {modal.savedOpp ? "Saved as Opp" : "→ Opp"}
          </button>

          {/* Save to Memory */}
          <button
            onClick={saveToMemory}
            disabled={modal.savedMemory}
            className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: modal.savedMemory ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${modal.savedMemory ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.09)"}`,
              color: modal.savedMemory ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.45)",
            }}
          >
            {modal.savedMemory ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Develop Plan Modal */}
      {modal.plan && (
        <DevelopPlanModal
          action={action}
          onClose={() => setModal((s) => ({ ...s, plan: false }))}
        />
      )}

      {/* Convert to Task Modal */}
      {modal.task && (
        <TaskModal
          action={action}
          projects={projects}
          onClose={() => setModal((s) => ({ ...s, task: false }))}
          onSaved={() => {}}
        />
      )}
    </>
  );
}

// ── Section component ──────────────────────────────────────────────────────

function ActionSection({
  label,
  actions,
  projects,
  emptyText,
}: {
  label: string;
  actions: Action[];
  projects: Project[];
  emptyText: string;
}) {
  if (actions.length === 0) {
    return (
      <section>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
          {label}
        </p>
        <div
          className="rounded-2xl px-4 py-5 text-center"
          style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{emptyText}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
        {label} · {actions.length}
      </p>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} projects={projects} />
        ))}
      </div>
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const [result,  setResult]  = useState<ActionEngineResult | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const todayStr      = new Date().toISOString().slice(0, 10);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const projectsData  = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks  = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);

    const graph = computeKnowledgeGraph({ people, projects: projectsData, opportunities, contentItems, memoryItems });

    const actionResult = computeActionEngine({
      graphInsights: graph.insights,
      opportunities,
      people,
      projects: projectsData,
      projectTasks,
      contentItems,
      todayStr,
    });

    setResult(actionResult);
    setProjects(projectsData);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-16 space-y-4">
        {[140, 180, 140, 120].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse"
            style={{ height: h, background: "rgba(255,255,255,0.025)" }} />
        ))}
      </div>
    );
  }

  if (!result) return null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const totalActions = result.actions.length;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">

      {/* Hero */}
      <div className="pt-10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.3" className="w-3.5 h-3.5">
              <path d="M8 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.25)" }}>
            Action Engine
          </p>
        </div>
        <h1 className="text-2xl font-bold text-white/85 tracking-tight leading-tight">
          Recommended Actions
        </h1>
        <p className="text-[10px] text-white/25 mt-1">
          Generated at {formatTime(result.generatedAt)} · deterministic · {totalActions} action{totalActions !== 1 ? "s" : ""} surfaced
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { label: "Urgent",       count: result.urgentActions.length,       color: "rgba(239,68,68,0.7)"   },
          { label: "Strategic",    count: result.strategicActions.length,    color: "rgba(99,102,241,0.7)"  },
          { label: "Relationship", count: result.relationshipActions.length, color: "rgba(52,211,153,0.7)"  },
          { label: "Content",      count: result.contentActions.length,      color: "rgba(239,68,68,0.7)"   },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
            style={{
              background: count > 0 ? `${color.replace("0.7", "0.07")}` : "rgba(255,255,255,0.03)",
              border: `1px solid ${count > 0 ? color.replace("0.7", "0.18") : "rgba(255,255,255,0.07)"}`,
              color: count > 0 ? color : "rgba(255,255,255,0.2)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: count > 0 ? color : "rgba(255,255,255,0.15)" }} />
            {count} {label}
          </div>
        ))}
      </div>

      <div className="space-y-8">

        {/* Urgent */}
        <ActionSection
          label="Urgent"
          actions={result.urgentActions}
          projects={projects}
          emptyText="No critical or urgent actions detected. Momentum is strong."
        />

        {/* Strategic */}
        <ActionSection
          label="Strategic"
          actions={result.strategicActions}
          projects={projects}
          emptyText="No strategic actions detected. Add opportunities and projects to surface them."
        />

        {/* Relationship */}
        <ActionSection
          label="Relationship"
          actions={result.relationshipActions}
          projects={projects}
          emptyText="No relationship actions needed right now. Follow-ups are on track."
        />

        {/* Content */}
        <ActionSection
          label="Content"
          actions={result.contentActions}
          projects={projects}
          emptyText="No content actions detected. Your pipeline looks current."
        />

        {/* Empty state — no actions at all */}
        {totalActions === 0 && (
          <div className="text-center py-16">
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth="1.4" className="w-6 h-6">
                <path d="M10 2l2 5.5h5.5l-4.5 3.5 1.5 5.5L10 13l-4.5 3.5 1.5-5.5L2.5 7.5H8L10 2z" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-white/30 font-medium">No actions detected yet</p>
            <p className="text-[11px] text-white/15 mt-1 max-w-xs mx-auto">
              Add people, projects, opportunities, and content — then the Action Engine will surface what to focus on.
            </p>
            <div className="flex justify-center gap-3 mt-5 flex-wrap">
              {[
                { href: "/projects",      label: "Projects"      },
                { href: "/relationships", label: "Relationships" },
                { href: "/opportunities", label: "Opportunities" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    color: "rgba(251,191,36,0.65)",
                  }}
                >
                  {label} →
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="text-[9px] text-white/12 text-center leading-relaxed pb-2">
          Actions computed from your local data · Sovereign OS v5.5 · Scored by impact × urgency × effort
        </p>

      </div>
    </div>
  );
}
