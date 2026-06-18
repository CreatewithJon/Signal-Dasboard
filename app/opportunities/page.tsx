"use client";

/**
 * app/opportunities/page.tsx
 *
 * Opportunity Engine — Sovereign OS v5.1
 *
 * Features:
 *   - Detected (auto-surfaced) + Manual opportunities
 *   - Score 0–100, Type, Status, related context
 *   - Convert to: Project | Content Item | Task | Memory
 *   - AI: "Develop this opportunity"
 *   - Filter by type / status
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import {
  loadOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  setOpportunityStatus,
  markConverted,
} from "@/lib/opportunities/store";
import type {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
} from "@/lib/types/opportunities";
import type { Project } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";

// ── Constants ──────────────────────────────────────────────────────────────

const OPP_TYPES: OpportunityType[] = [
  "Partnership", "Content", "Client", "Product",
  "Event", "Education", "Revenue", "Personal",
];

const OPP_STATUSES: OpportunityStatus[] = [
  "Detected", "Reviewing", "Active", "Converted", "Archived",
];

const TYPE_COLORS: Record<OpportunityType, { color: string; bg: string; border: string }> = {
  Revenue:     { color: "rgba(52,211,153,0.9)",  bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  Client:      { color: "rgba(59,130,246,0.9)",  bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
  Partnership: { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  Product:     { color: "rgba(167,139,250,0.9)", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  Content:     { color: "rgba(251,113,133,0.9)", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.2)" },
  Event:       { color: "rgba(251,191,36,0.9)",  bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
  Education:   { color: "rgba(129,140,248,0.9)", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.2)" },
  Personal:    { color: "rgba(156,163,175,0.8)", bg: "rgba(156,163,175,0.06)", border: "rgba(156,163,175,0.14)" },
};

const STATUS_COLORS: Record<OpportunityStatus, { color: string; bg: string; border: string }> = {
  Detected:  { color: "rgba(245,158,11,0.85)",  bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)"  },
  Reviewing: { color: "rgba(167,139,250,0.85)", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.2)" },
  Active:    { color: "rgba(52,211,153,0.9)",   bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.2)"  },
  Converted: { color: "rgba(59,130,246,0.85)",  bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.15)" },
  Archived:  { color: "rgba(100,116,135,0.7)",  bg: "rgba(100,116,135,0.05)", border: "rgba(100,116,135,0.14)" },
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "rgba(52,211,153,0.85)" :
    score >= 45 ? "rgba(245,158,11,0.8)" :
    "rgba(167,139,250,0.7)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color, minWidth: 22, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

function Badge({
  label,
  color,
  bg,
  border,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

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

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function now(): string { return new Date().toISOString(); }

// ── AI Develop Panel ───────────────────────────────────────────────────────

function AIDevelopPanel({
  opp,
  onClose,
}: {
  opp: Opportunity;
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
    `Opportunity: "${opp.title}"`,
    `Type: ${opp.type}`,
    `Status: ${opp.status}`,
    `Score: ${opp.score}/100`,
    `Description: ${opp.description}`,
    `Suggested action: ${opp.suggested_action}`,
    opp.related_people.length > 0 ? `Related people: ${opp.related_people.join(", ")}` : "",
    opp.notes ? `Notes: ${opp.notes}` : "",
  ].filter(Boolean).join("\n");

  const SUGGESTIONS = [
    "How do I develop this opportunity?",
    "What are the first 3 steps?",
    "What could go wrong?",
    "Who should I involve?",
  ];

  async function send(msg?: string) {
    const message = (msg ?? input).trim();
    if (!message || loading) return;
    const newMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: "85vh",
          background: "#0d0d0f",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <p className="text-xs font-bold text-white/80">Develop Opportunity</p>
            <p className="text-[10px] text-white/30 mt-0.5 line-clamp-1">{opp.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors shrink-0"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
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
                  border: m.role === "user"
                    ? "1px solid rgba(99,102,241,0.2)"
                    : "1px solid rgba(255,255,255,0.07)",
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
            <div className="flex justify-start">
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full animate-bounce"
                      style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && <p className="text-[10px] text-red-400/70">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 pb-4 pt-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about this opportunity…"
              rows={2}
              className="flex-1 rounded-xl px-3 py-2.5 text-[11px] resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)",
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 shrink-0"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "rgba(165,180,252,0.9)",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Convert Modal ──────────────────────────────────────────────────────────

function ConvertModal({
  opp,
  projects,
  onClose,
  onConverted,
}: {
  opp: Opportunity;
  projects: Project[];
  onClose: () => void;
  onConverted: (updated: Opportunity) => void;
}) {
  const [tab, setTab] = useState<"Project" | "ContentItem" | "Task" | "Memory">("Project");
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);

  // Project fields
  const [projTitle,    setProjTitle]    = useState(opp.title);
  const [projDesc,     setProjDesc]     = useState(opp.description);
  const [projPriority, setProjPriority] = useState<"High" | "Medium" | "Low" | "Critical">("High");
  const [projCategory, setProjCategory] = useState("Other");

  // Content fields
  const [contTitle,    setContTitle]    = useState(opp.title);
  const [contDesc,     setContDesc]     = useState(opp.description);
  const [contFormat,   setContFormat]   = useState("Post");
  const [contPriority, setContPriority] = useState<"High" | "Medium" | "Low" | "Critical">("High");

  // Task fields
  const [taskTitle,    setTaskTitle]    = useState(opp.suggested_action || opp.title);
  const [taskProject,  setTaskProject]  = useState(projects[0]?.id ?? "");
  const [taskPriority, setTaskPriority] = useState<"High" | "Medium" | "Low" | "Critical">("High");

  // Memory fields
  const [memTitle,   setMemTitle]   = useState(opp.title);
  const [memContent, setMemContent] = useState(opp.description + (opp.notes ? `\n\n${opp.notes}` : ""));

  function doConvert() {
    setConverting(true);
    const ts = now();
    let targetId = crypto.randomUUID();

    if (tab === "Project") {
      const projects: import("@/lib/types/projects").Project[] = safeRead(KEYS.PROJECTS, []);
      const newProject: import("@/lib/types/projects").Project = {
        id:          targetId,
        title:       projTitle,
        status:      "Active",
        category:    projCategory as import("@/lib/types/projects").ProjectCategory,
        priority:    projPriority,
        description: projDesc,
        objective:   opp.suggested_action,
        next_action: opp.suggested_action,
        due_date:    "",
        links:       [],
        notes:       `Converted from Opportunity: ${opp.id}`,
        created_at:  ts,
        updated_at:  ts,
      };
      safeWrite(KEYS.PROJECTS, [newProject, ...projects]);
    }

    if (tab === "ContentItem") {
      const items: import("@/lib/types/content").ContentItem[] = safeRead(KEYS.CONTENT_ITEMS, []);
      const newItem: import("@/lib/types/content").ContentItem = {
        id:                 targetId,
        title:              contTitle,
        status:             "Idea",
        platforms:          [],
        priority:           contPriority,
        format:             contFormat as import("@/lib/types/content").ContentFormat,
        description:        contDesc,
        notes:              opp.notes,
        related_project_id: "",
        publish_date:       "",
        created_at:         ts,
        updated_at:         ts,
      };
      safeWrite(KEYS.CONTENT_ITEMS, [newItem, ...items]);
    }

    if (tab === "Task") {
      const tasks: import("@/lib/types/projects").ProjectTask[] = safeRead(KEYS.PROJECT_TASKS, []);
      const newTask: import("@/lib/types/projects").ProjectTask = {
        id:         targetId,
        project_id: taskProject,
        title:      taskTitle,
        status:     "Todo",
        priority:   taskPriority,
        due_date:   "",
        notes:      `From opportunity: ${opp.title}`,
        created_at: ts,
        updated_at: ts,
      };
      safeWrite(KEYS.PROJECT_TASKS, [...tasks, newTask]);
    }

    if (tab === "Memory") {
      const items: import("@/lib/types/memory").MemoryItem[] = safeRead(KEYS.MEMORY_ITEMS, []);
      const newMem: import("@/lib/types/memory").MemoryItem = {
        id:                crypto.randomUUID(),
        title:             memTitle,
        content:           memContent,
        type:              "Idea",
        tags:              [opp.type.toLowerCase()],
        relatedProjectIds: opp.related_project_ids,
        relatedPeople:     opp.related_people,
        importance:        "High",
        source:            "Manual",
        createdAt:         ts,
        updatedAt:         ts,
      };
      targetId = newMem.id;
      safeWrite(KEYS.MEMORY_ITEMS, [newMem, ...items]);
    }

    const updated = markConverted(opp.id, tab, targetId);
    setConverting(false);
    setDone(true);
    if (updated) onConverted(updated);
  }

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "Project",     label: "Project"      },
    { key: "ContentItem", label: "Content Item" },
    { key: "Task",        label: "Task"         },
    { key: "Memory",      label: "Memory"       },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 flex items-start justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <p className="text-xs font-bold text-white/80">Convert Opportunity</p>
            <p className="text-[10px] text-white/30 mt-0.5 line-clamp-1">{opp.title}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="px-4 py-6 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-semibold text-white/80">Converted to {tab}</p>
            <p className="text-[10px] text-white/30 mt-1">Opportunity marked as Converted.</p>
            <button
              onClick={onClose}
              className="mt-4 text-[10px] font-semibold px-4 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div
              className="flex"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex-1 py-2.5 text-[10px] font-semibold transition-all"
                  style={{
                    color: tab === t.key ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.25)",
                    borderBottom: tab === t.key ? "2px solid rgba(99,102,241,0.6)" : "2px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="px-4 py-4 space-y-3">
              {tab === "Project" && (
                <>
                  <Field label="Title">
                    <input className={FIELD_CLS} style={FIELD_STYLE} value={projTitle} onChange={(e) => setProjTitle(e.target.value)} />
                  </Field>
                  <Field label="Description">
                    <textarea className={FIELD_CLS} style={FIELD_STYLE} rows={2} value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Priority">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={projPriority} onChange={(e) => setProjPriority(e.target.value as typeof projPriority)}>
                        {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Category">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={projCategory} onChange={(e) => setProjCategory(e.target.value)}>
                        {["Personal", "Client", "Agentic Systems", "DWT", "Sovereign OS", "Crypto Mondays", "UNLV", "Other"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}
              {tab === "ContentItem" && (
                <>
                  <Field label="Title">
                    <input className={FIELD_CLS} style={FIELD_STYLE} value={contTitle} onChange={(e) => setContTitle(e.target.value)} />
                  </Field>
                  <Field label="Description / Hook">
                    <textarea className={FIELD_CLS} style={FIELD_STYLE} rows={2} value={contDesc} onChange={(e) => setContDesc(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Format">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={contFormat} onChange={(e) => setContFormat(e.target.value)}>
                        {["Video", "Short", "Post", "Article", "Email", "Script", "Thread", "Reel", "Episode", "Other"].map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={contPriority} onChange={(e) => setContPriority(e.target.value as typeof contPriority)}>
                        {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}
              {tab === "Task" && (
                <>
                  <Field label="Task title">
                    <input className={FIELD_CLS} style={FIELD_STYLE} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Project">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                        {projects.length === 0
                          ? <option value="">No projects</option>
                          : projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)
                        }
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select className={FIELD_CLS} style={FIELD_STYLE} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}>
                        {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}
              {tab === "Memory" && (
                <>
                  <Field label="Title">
                    <input className={FIELD_CLS} style={FIELD_STYLE} value={memTitle} onChange={(e) => setMemTitle(e.target.value)} />
                  </Field>
                  <Field label="Content">
                    <textarea className={FIELD_CLS} style={FIELD_STYLE} rows={3} value={memContent} onChange={(e) => setMemContent(e.target.value)} />
                  </Field>
                </>
              )}
            </div>

            {/* Actions */}
            <div
              className="px-4 pb-4 flex gap-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <button
                onClick={doConvert}
                disabled={converting}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 mt-3"
                style={{
                  background: "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.22)",
                  color: "rgba(52,211,153,0.9)",
                }}
              >
                {converting ? "Converting…" : `Convert to ${tab === "ContentItem" ? "Content Item" : tab}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const FIELD_CLS = "w-full rounded-xl px-3 py-2 text-[11px] outline-none resize-none";
const FIELD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.75)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

// ── Edit / New opportunity form ────────────────────────────────────────────

function OppForm({
  initial,
  projects,
  memoryItems,
  onSave,
  onCancel,
}: {
  initial: Partial<Opportunity> | null;
  projects: Project[];
  memoryItems: MemoryItem[];
  onSave: (opp: Opportunity) => void;
  onCancel: () => void;
}) {
  const isNew = !initial?.id;
  const [title,       setTitle]       = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type,        setType]        = useState<OpportunityType>(initial?.type ?? "Revenue");
  const [status,      setStatus]      = useState<OpportunityStatus>(initial?.status ?? "Detected");
  const [action,      setAction]      = useState(initial?.suggested_action ?? "");
  const [notes,       setNotes]       = useState(initial?.notes ?? "");
  const [people,      setPeople]      = useState((initial?.related_people ?? []).join(", "));
  const [projIds,     setProjIds]     = useState<string[]>(initial?.related_project_ids ?? []);
  const [memIds,      setMemIds]      = useState<string[]>(initial?.related_memory_ids ?? []);

  function toggleProj(id: string) {
    setProjIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleMem(id: string) {
    setMemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleSave() {
    if (!title.trim()) return;
    const draft = {
      title:               title.trim(),
      description:         description.trim(),
      type,
      status,
      suggested_action:    action.trim(),
      related_people:      people.split(",").map((s) => s.trim()).filter(Boolean),
      related_project_ids: projIds,
      related_memory_ids:  memIds,
      source:              (initial?.source ?? "manual") as "manual" | "detected",
      conversion:          initial?.conversion ?? null,
      notes:               notes.trim(),
    };

    if (isNew) {
      const created = createOpportunity(draft);
      onSave(created);
    } else {
      const updated = updateOpportunity(initial!.id!, draft);
      if (updated) onSave(updated);
    }
  }

  const inputCls = "w-full rounded-xl px-3 py-2 text-[11px] outline-none resize-none";
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.75)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden my-auto"
        style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-xs font-bold text-white/80">
            {isNew ? "New Opportunity" : "Edit Opportunity"}
          </p>
          <button onClick={onCancel} className="text-white/30 hover:text-white/60">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Title *</p>
            <input
              className={inputCls}
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opportunity name"
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Type</p>
              <select className={inputCls} style={inputStyle} value={type} onChange={(e) => setType(e.target.value as OpportunityType)}>
                {OPP_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Status</p>
              <select className={inputCls} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as OpportunityStatus)}>
                {OPP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Description / Angle</p>
            <textarea
              className={inputCls}
              style={inputStyle}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Core insight or angle"
            />
          </div>

          {/* Suggested action */}
          <div>
            <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Suggested Next Action</p>
            <input
              className={inputCls}
              style={inputStyle}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="What's the first move?"
            />
          </div>

          {/* Related people */}
          <div>
            <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Related People (comma-separated)</p>
            <input
              className={inputCls}
              style={inputStyle}
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              placeholder="e.g. John Smith, Maria Lee"
            />
          </div>

          {/* Related projects */}
          {projects.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1.5">Related Projects</p>
              <div className="flex flex-wrap gap-1.5">
                {projects.filter((p) => p.status !== "Archived").map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleProj(p.id)}
                    className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: projIds.includes(p.id) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                      border: projIds.includes(p.id) ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.07)",
                      color: projIds.includes(p.id) ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related memories */}
          {memoryItems.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1.5">Related Memories</p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {memoryItems.slice(0, 30).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMem(m.id)}
                    className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: memIds.includes(m.id) ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                      border: memIds.includes(m.id) ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(255,255,255,0.07)",
                      color: memIds.includes(m.id) ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {m.title.slice(0, 28)}{m.title.length > 28 ? "…" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">Notes</p>
            <textarea
              className={inputCls}
              style={inputStyle}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Research, context, links…"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
            style={{
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.22)",
              color: "rgba(52,211,153,0.9)",
            }}
          >
            {isNew ? "Create Opportunity" : "Save Changes"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[10px] font-semibold"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Opportunity Card ───────────────────────────────────────────────────────

function OppCard({
  opp,
  projects,
  onEdit,
  onDelete,
  onStatusChange,
  onDevelop,
  onConvert,
}: {
  opp: Opportunity;
  projects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: OpportunityStatus) => void;
  onDevelop: () => void;
  onConvert: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc = TYPE_COLORS[opp.type];
  const sc = STATUS_COLORS[opp.status];

  const relProjects = projects.filter((p) => opp.related_project_ids.includes(p.id));

  const NEXT_STATUS: Partial<Record<OpportunityStatus, OpportunityStatus>> = {
    Detected:  "Reviewing",
    Reviewing: "Active",
    Active:    "Converted",
  };
  const nextStatus = NEXT_STATUS[opp.status];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${opp.status === "Archived" ? "rgba(255,255,255,0.04)" : tc.border}`,
        background: opp.status === "Archived" ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.015)",
        opacity: opp.status === "Archived" ? 0.5 : 1,
      }}
    >
      {/* Top row */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-start gap-3">
          {/* Score circle */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{
              background: tc.bg,
              border: `1px solid ${tc.border}`,
              color: tc.color,
            }}
          >
            {opp.score}
          </div>

          {/* Title + badges */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-left w-full"
            >
              <p className="text-xs font-semibold text-white/80 leading-snug hover:text-white/95 transition-colors">
                {opp.title}
              </p>
            </button>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge label={opp.type} {...tc} />
              <Badge label={opp.status} {...sc} />
              {opp.source === "detected" && (
                <Badge label="auto" color="rgba(156,163,175,0.6)" bg="rgba(156,163,175,0.05)" border="rgba(156,163,175,0.12)" />
              )}
            </div>
          </div>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="text-white/20 hover:text-white/50 transition-colors shrink-0"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Score bar */}
        <div className="mt-2.5">
          <ScoreBar score={opp.score} />
        </div>
      </div>

      {/* Collapsed: suggested action */}
      {!expanded && opp.suggested_action && (
        <div
          className="px-4 pb-3"
        >
          <p className="text-[10px] text-white/35 leading-relaxed line-clamp-1">
            → {opp.suggested_action}
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
          {opp.description && (
            <p className="text-[10px] text-white/45 leading-relaxed">{opp.description}</p>
          )}
          {opp.suggested_action && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-0.5">Next action</p>
              <p className="text-[10px] text-white/60">→ {opp.suggested_action}</p>
            </div>
          )}
          {opp.related_people.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-0.5">People</p>
              <p className="text-[10px] text-white/45">{opp.related_people.join(", ")}</p>
            </div>
          )}
          {relProjects.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-0.5">Projects</p>
              <div className="flex flex-wrap gap-1">
                {relProjects.map((p) => (
                  <Link
                    key={p.id}
                    href="/projects"
                    className="text-[9px] px-1.5 py-0.5 rounded-md"
                    style={{
                      background: "rgba(99,102,241,0.07)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      color: "rgba(165,180,252,0.7)",
                    }}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {opp.notes && (
            <div>
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-0.5">Notes</p>
              <p className="text-[10px] text-white/35 leading-relaxed">{opp.notes}</p>
            </div>
          )}
          {opp.conversion && (
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.14)" }}
            >
              <span className="text-[9px] text-blue-400/60">Converted →</span>
              <span className="text-[9px] text-white/45">{opp.conversion.target}</span>
            </div>
          )}
          {opp.score_reasoning && (
            <p className="text-[9px] text-white/20 leading-relaxed">Score: {opp.score_reasoning}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {opp.status !== "Archived" && opp.status !== "Converted" && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          {/* Develop with AI */}
          <button
            onClick={onDevelop}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "rgba(165,180,252,0.7)",
            }}
          >
            ✦ Develop
          </button>

          {/* Convert */}
          <button
            onClick={onConvert}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(52,211,153,0.07)",
              border: "1px solid rgba(52,211,153,0.18)",
              color: "rgba(52,211,153,0.75)",
            }}
          >
            Convert →
          </button>

          {/* Move status */}
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              → {nextStatus}
            </button>
          )}

          {/* Archive */}
          <button
            onClick={() => onStatusChange("Archived")}
            className="text-[9px] text-white/15 hover:text-white/30 transition-colors ml-auto"
          >
            Archive
          </button>
          <button
            onClick={onDelete}
            className="text-[9px] text-red-400/30 hover:text-red-400/60 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
      {(opp.status === "Archived" || opp.status === "Converted") && (
        <div
          className="px-4 py-2 flex gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <button
            onClick={() => onStatusChange("Detected")}
            className="text-[9px] text-white/20 hover:text-white/40 transition-colors"
          >
            Restore
          </button>
          <button
            onClick={onDelete}
            className="text-[9px] text-red-400/20 hover:text-red-400/50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type FilterStatus = OpportunityStatus | "All";
type FilterType   = OpportunityType   | "All";

export default function OpportunitiesPage() {
  const [opps,        setOpps]        = useState<Opportunity[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [memories,    setMemories]    = useState<MemoryItem[]>([]);
  const [loaded,      setLoaded]      = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [filterType,   setFilterType]   = useState<FilterType>("All");
  const [showArchived, setShowArchived] = useState(false);

  const [editingOpp,  setEditingOpp]  = useState<Opportunity | null | "new">(null);
  const [developOpp,  setDevelopOpp]  = useState<Opportunity | null>(null);
  const [convertOpp,  setConvertOpp]  = useState<Opportunity | null>(null);

  // Load
  useEffect(() => {
    setOpps(loadOpportunities());
    setProjects(safeRead<Project[]>(KEYS.PROJECTS, []));
    setMemories(safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []));
    setLoaded(true);
  }, []);

  // Derived
  const filtered = opps.filter((o) => {
    if (!showArchived && o.status === "Archived") return false;
    if (filterStatus !== "All" && o.status !== filterStatus) return false;
    if (filterType   !== "All" && o.type   !== filterType)   return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const counts = {
    detected:  opps.filter((o) => o.status === "Detected").length,
    active:    opps.filter((o) => o.status === "Active").length,
    converted: opps.filter((o) => o.status === "Converted").length,
  };

  // Handlers
  function handleSaved(saved: Opportunity) {
    setOpps((prev) => {
      const idx = prev.findIndex((o) => o.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setEditingOpp(null);
  }

  function handleDelete(id: string) {
    deleteOpportunity(id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
  }

  function handleStatus(id: string, status: OpportunityStatus) {
    const updated = setOpportunityStatus(id, status);
    if (updated) {
      setOpps((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  }

  function handleConverted(updated: Opportunity) {
    setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setConvertOpp(null);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen" style={{ background: "#080808" }}>
        <div className="max-w-2xl mx-auto px-4 pt-16 space-y-4">
          {[120, 120, 120].map((h, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "rgba(255,255,255,0.025)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080808" }}>
      {/* Modals */}
      {editingOpp !== null && (
        <OppForm
          initial={editingOpp === "new" ? null : editingOpp}
          projects={projects}
          memoryItems={memories}
          onSave={handleSaved}
          onCancel={() => setEditingOpp(null)}
        />
      )}
      {developOpp && (
        <AIDevelopPanel opp={developOpp} onClose={() => setDevelopOpp(null)} />
      )}
      {convertOpp && (
        <ConvertModal
          opp={convertOpp}
          projects={projects.filter((p) => p.status !== "Archived")}
          onClose={() => setConvertOpp(null)}
          onConverted={handleConverted}
        />
      )}

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="1.4" className="w-3.5 h-3.5">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Opportunity Engine
            </p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white/85 tracking-tight">Opportunities</h1>
              <p className="text-[10px] text-white/25 mt-1">
                {counts.detected} detected · {counts.active} active · {counts.converted} converted
              </p>
            </div>
            <button
              onClick={() => setEditingOpp("new")}
              className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all shrink-0"
              style={{
                background: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.22)",
                color: "rgba(52,211,153,0.9)",
              }}
            >
              + New
            </button>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {/* Status filter */}
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {(["All", "Detected", "Reviewing", "Active", "Converted"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-[9px] font-semibold px-2.5 py-1.5 transition-all"
                style={{
                  background: filterStatus === s ? "rgba(255,255,255,0.06)" : "transparent",
                  color: filterStatus === s ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-xl px-2.5 py-1.5 text-[9px] font-semibold outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <option value="All">All types</option>
            {OPP_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>

          {/* Archived toggle */}
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-xl transition-all"
            style={{
              background: showArchived ? "rgba(255,255,255,0.06)" : "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              color: showArchived ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
            }}
          >
            Archived
          </button>
        </div>

        {/* ── List ─────────────────────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-sm text-white/30">No opportunities match this filter.</p>
            <button
              onClick={() => setEditingOpp("new")}
              className="mt-4 text-[10px] font-semibold px-4 py-2 rounded-xl"
              style={{
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.18)",
                color: "rgba(52,211,153,0.7)",
              }}
            >
              Add your first opportunity
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((opp) => (
              <OppCard
                key={opp.id}
                opp={opp}
                projects={projects}
                onEdit={() => setEditingOpp(opp)}
                onDelete={() => handleDelete(opp.id)}
                onStatusChange={(status) => handleStatus(opp.id, status)}
                onDevelop={() => setDevelopOpp(opp)}
                onConvert={() => setConvertOpp(opp)}
              />
            ))}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/chief"
            className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
          >
            ← Chief of Staff
          </Link>
          <span className="text-[10px] text-white/10">·</span>
          <p className="text-[10px] text-white/15">Sovereign OS v5.1</p>
        </div>

      </div>
    </div>
  );
}
