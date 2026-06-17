"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ContentItem,
  ContentStatus,
  ContentPlatform,
  ContentPriority,
  ContentFormat,
} from "@/lib/types/content";
import type { Project } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import { KEYS } from "@/lib/keys";

// ── Constants ─────────────────────────────────────────────────────────────

const STATUSES: ContentStatus[] = ["Idea", "Drafting", "Ready", "Published", "Archived"];
const PLATFORMS: ContentPlatform[] = [
  "YouTube", "Instagram", "LinkedIn", "Blog",
  "Podcast", "Newsletter", "Crypto Mondays", "DWT",
];
const PRIORITIES: ContentPriority[] = ["Low", "Medium", "High", "Critical"];
const FORMATS: ContentFormat[] = [
  "Video", "Short", "Post", "Article", "Email",
  "Script", "Thread", "Reel", "Episode", "Other",
];

const STATUS_CFG: Record<ContentStatus, { bg: string; border: string; text: string }> = {
  Idea:      { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.25)", text: "rgba(167,139,250,0.9)" },
  Drafting:  { bg: "rgba(99,102,241,0.1)",   border: "rgba(99,102,241,0.25)", text: "rgba(165,180,252,0.9)" },
  Ready:     { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)", text: "rgba(52,211,153,0.9)"  },
  Published: { bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.25)",  text: "rgba(34,197,94,0.9)"  },
  Archived:  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "rgba(148,163,184,0.6)" },
};

const PRIORITY_CFG: Record<ContentPriority, { dot: string; label: string }> = {
  Critical: { dot: "#ef4444", label: "rgba(239,68,68,0.85)"  },
  High:     { dot: "#f59e0b", label: "rgba(245,158,11,0.85)" },
  Medium:   { dot: "#60a5fa", label: "rgba(99,102,241,0.7)"  },
  Low:      { dot: "#94a3b8", label: "rgba(148,163,184,0.6)" },
};

const PLATFORM_CFG: Record<ContentPlatform, { bg: string; border: string; text: string }> = {
  "YouTube":        { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   text: "rgba(239,68,68,0.85)"   },
  "Instagram":      { bg: "rgba(236,72,153,0.1)",  border: "rgba(236,72,153,0.25)",  text: "rgba(236,72,153,0.85)"  },
  "LinkedIn":       { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)",  text: "rgba(59,130,246,0.85)"  },
  "Blog":           { bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  text: "rgba(52,211,153,0.85)"  },
  "Podcast":        { bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)",  text: "rgba(249,115,22,0.85)"  },
  "Newsletter":     { bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.25)",  text: "rgba(167,139,250,0.85)" },
  "Crypto Mondays": { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  text: "rgba(245,158,11,0.85)"  },
  "DWT":            { bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)",  text: "rgba(165,180,252,0.85)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function newId() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyItem(): ContentItem {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "",
    status: "Idea",
    platforms: [],
    priority: "Medium",
    format: "Post",
    description: "",
    notes: "",
    related_project_id: "",
    publish_date: "",
    created_at: now,
    updated_at: now,
  };
}

function getDueDateState(dateStr: string): "overdue" | "urgent" | "normal" | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "urgent";
  return "normal";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return `${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ContentStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {status}
    </span>
  );
}

function PlatformChip({ platform }: { platform: ContentPlatform }) {
  const c = PLATFORM_CFG[platform];
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {platform}
    </span>
  );
}

// ── AI Panel (inside modal) ───────────────────────────────────────────────

function ContentAIPanel({ item }: { item: ContentItem }) {
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [savedState, setSavedState] = useState<"idle" | "saved" | "duplicate">("idle");
  const [customInput, setCustomInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const run = useCallback(
    async (preset: "outline" | "repurpose" | null, custom?: string) => {
      if (streaming) return;
      const message =
        preset === "outline"
          ? `Generate a content outline for: ${item.title}`
          : preset === "repurpose"
          ? `Create a repurposing plan for: ${item.title}`
          : custom?.trim() ?? "";
      if (!message) return;

      setOutput("");
      setSavedState("idle");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/content-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, contentItem: item, preset }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setOutput("Something went wrong. Try again.");
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setOutput(acc);
        }
        setStreaming(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setOutput("Connection error. Try again.");
        setStreaming(false);
      } finally {
        abortRef.current = null;
      }
    },
    [streaming, item]
  );

  function saveToMemory() {
    if (!output) return;
    try {
      const existing = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
      const isDuplicate = existing.some((m) => m.content.trim() === output.trim());
      if (isDuplicate) { setSavedState("duplicate"); return; }
      const now = new Date().toISOString();
      const newItem: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: `Content AI: ${item.title}`,
        content: output,
        type: "Content",
        importance: "Medium",
        tags: ["ai-response", "content"],
        relatedProjectIds: item.related_project_id ? [item.related_project_id] : [],
        relatedPeople: [],
        source: "AI",
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem(KEYS.MEMORY_ITEMS, JSON.stringify([newItem, ...existing]));
      setSavedState("saved");
    } catch { /* ignore */ }
  }

  const PRESETS = [
    { key: "outline" as const,   label: "Generate Outline",  icon: "◈" },
    { key: "repurpose" as const, label: "Repurpose This",    icon: "↻" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => run(p.key)}
            disabled={streaming}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "rgba(167,139,250,0.9)",
            }}
            onMouseEnter={(e) => !streaming && (e.currentTarget.style.background = "rgba(139,92,246,0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.1)")}
          >
            <span className="text-[11px]">{p.icon}</span>
            {p.label}
          </button>
        ))}
        {streaming && (
          <button
            onClick={stop}
            className="text-xs px-3 py-2 rounded-lg transition-all"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "rgba(248,113,113,0.8)",
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Custom input */}
      <form
        onSubmit={(e) => { e.preventDefault(); run(null, customInput); setCustomInput(""); }}
        className="flex gap-2"
      >
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Ask anything about this content…"
          disabled={streaming}
          className="flex-1 bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.03)",
          }}
        />
        <button
          type="submit"
          disabled={!customInput.trim() || streaming}
          className="text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-30"
          style={{
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "rgba(165,180,252,0.9)",
          }}
        >
          Ask
        </button>
      </form>

      {/* Output */}
      {(output || streaming) && (
        <div
          className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.12)",
            color: "rgba(255,255,255,0.65)",
            minHeight: 80,
          }}
        >
          {output || (
            <span className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
          {streaming && output && (
            <span
              className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-indigo-400/70 animate-pulse"
              style={{ verticalAlign: "text-bottom" }}
            />
          )}
        </div>
      )}

      {/* Save to Memory */}
      {output && !streaming && (
        <div className="flex justify-end">
          {savedState === "saved" ? (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(139,92,246,0.65)" }}>
              ✓ Saved to memory
            </span>
          ) : savedState === "duplicate" ? (
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Already saved</span>
          ) : (
            <button
              onClick={saveToMemory}
              className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.15)",
                color: "rgba(139,92,246,0.55)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                e.currentTarget.style.color = "rgba(167,139,250,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                e.currentTarget.style.color = "rgba(139,92,246,0.55)";
              }}
            >
              🧠 Save to memory
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Content Modal ─────────────────────────────────────────────────────────

function ContentModal({
  item,
  projects,
  onSave,
  onArchive,
  onClose,
}: {
  item: ContentItem;
  projects: Project[];
  onSave: (updated: ContentItem) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ContentItem>({ ...item });
  const [tab, setTab] = useState<"overview" | "ai">("overview");

  function patch(partial: Partial<ContentItem>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function togglePlatform(p: ContentPlatform) {
    setDraft((d) => ({
      ...d,
      platforms: d.platforms.includes(p)
        ? d.platforms.filter((x) => x !== p)
        : [...d.platforms, p],
    }));
  }

  function handleSave() {
    if (!draft.title.trim()) return;
    onSave({ ...draft, updated_at: new Date().toISOString() });
  }

  const dueDateState = getDueDateState(draft.publish_date);
  const dueDateColor =
    dueDateState === "overdue" ? "rgba(239,68,68,0.85)"
    : dueDateState === "urgent" ? "rgba(245,158,11,0.85)"
    : "rgba(255,255,255,0.4)";

  const FIELD_STYLE = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "rgba(255,255,255,0.8)",
  };
  const LABEL_STYLE = { color: "rgba(255,255,255,0.3)" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: "rgba(10,8,22,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 80px rgba(99,102,241,0.12)",
          maxHeight: "90vh",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-start justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex-1 min-w-0 pr-3">
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Content title…"
              className="w-full bg-transparent text-base font-semibold focus:outline-none"
              style={{ color: "rgba(255,255,255,0.88)" }}
            />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={draft.status} />
              {draft.platforms.slice(0, 3).map((p) => (
                <PlatformChip key={p} platform={p} />
              ))}
              {draft.platforms.length > 3 && (
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  +{draft.platforms.length - 3}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sm leading-none shrink-0"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 px-5 pt-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {(["overview", "ai"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-2 rounded-t-md transition-all capitalize"
              style={{
                color: tab === t ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.3)",
                borderBottom: tab === t ? "1px solid rgba(99,102,241,0.6)" : "1px solid transparent",
              }}
            >
              {t === "ai" ? "AI Tools" : t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* Status + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Status</label>
                  <div className="flex flex-wrap gap-1">
                    {STATUSES.map((s) => {
                      const c = STATUS_CFG[s];
                      const active = draft.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => patch({ status: s })}
                          className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                          style={{
                            background: active ? c.bg : "rgba(255,255,255,0.03)",
                            border: active ? `1px solid ${c.border}` : "1px solid rgba(255,255,255,0.07)",
                            color: active ? c.text : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Priority</label>
                  <div className="flex gap-1">
                    {PRIORITIES.map((p) => {
                      const c = PRIORITY_CFG[p];
                      const active = draft.priority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => patch({ priority: p })}
                          className="flex-1 text-[10px] py-1 rounded-md transition-all"
                          style={{
                            background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                            border: active ? `1px solid ${c.dot}44` : "1px solid rgba(255,255,255,0.06)",
                            color: active ? c.label : "rgba(255,255,255,0.2)",
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Platforms */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Platforms</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => {
                    const c = PLATFORM_CFG[p];
                    const active = draft.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                        style={{
                          background: active ? c.bg : "rgba(255,255,255,0.03)",
                          border: active ? `1px solid ${c.border}` : "1px solid rgba(255,255,255,0.07)",
                          color: active ? c.text : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format + Publish date row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Format</label>
                  <select
                    value={draft.format}
                    onChange={(e) => patch({ format: e.target.value as ContentFormat })}
                    className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ ...FIELD_STYLE, appearance: "none" as const }}
                  >
                    {FORMATS.map((f) => <option key={f} value={f} style={{ background: "#0a0816" }}>{f}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Publish Date</label>
                  <input
                    type="date"
                    value={draft.publish_date}
                    onChange={(e) => patch({ publish_date: e.target.value })}
                    className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ ...FIELD_STYLE, color: dueDateColor }}
                  />
                </div>
              </div>

              {/* Description / Hook */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Hook / Angle</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Core idea, hook, or angle…"
                  rows={2}
                  className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
                  style={FIELD_STYLE}
                />
              </div>

              {/* Related Project */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Related Project</label>
                <select
                  value={draft.related_project_id}
                  onChange={(e) => patch({ related_project_id: e.target.value })}
                  className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none"
                  style={{ ...FIELD_STYLE, appearance: "none" as const }}
                >
                  <option value="" style={{ background: "#0a0816" }}>None</option>
                  {projects
                    .filter((p) => p.status !== "Archived")
                    .map((p) => (
                      <option key={p.id} value={p.id} style={{ background: "#0a0816" }}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Notes / Draft */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em]" style={LABEL_STYLE}>Notes / Draft</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="Draft copy, research, outline, links…"
                  rows={4}
                  className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
                  style={FIELD_STYLE}
                />
              </div>
            </div>
          )}

          {tab === "ai" && <ContentAIPanel item={draft} />}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {item.status !== "Archived" && (
            <button
              onClick={() => { onArchive(item.id); onClose(); }}
              className="text-[10px] px-3 py-2 rounded-xl transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Archive
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!draft.title.trim()}
            className="text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-30"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.35)",
              color: "rgba(165,180,252,0.95)",
              boxShadow: "0 0 16px rgba(99,102,241,0.15)",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content Card ──────────────────────────────────────────────────────────

function ContentCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const dueDateState = getDueDateState(item.publish_date);
  const dueDateColor =
    dueDateState === "overdue" ? "rgba(239,68,68,0.85)"
    : dueDateState === "urgent" ? "rgba(245,158,11,0.85)"
    : "rgba(255,255,255,0.25)";
  const pCfg = PRIORITY_CFG[item.priority];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 flex flex-col gap-2.5 transition-all group"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${
          dueDateState === "overdue" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"
        }`,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.025)")
      }
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-sm font-medium leading-snug line-clamp-2 flex-1"
          style={{ color: item.status === "Archived" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)" }}
        >
          {item.title || <span style={{ color: "rgba(255,255,255,0.2)" }}>Untitled</span>}
        </p>
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
          style={{
            background: pCfg.dot,
            boxShadow: item.priority === "Critical" ? `0 0 5px ${pCfg.dot}` : "none",
          }}
        />
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-[11px] leading-relaxed line-clamp-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {item.description}
        </p>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={item.status} />
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {item.format}
        </span>
        {item.platforms.slice(0, 2).map((p) => (
          <PlatformChip key={p} platform={p} />
        ))}
        {item.platforms.length > 2 && (
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            +{item.platforms.length - 2}
          </span>
        )}
      </div>

      {/* Publish date */}
      {item.publish_date && (
        <p className="text-[10px] font-medium" style={{ color: dueDateColor }}>
          {dueDateState === "overdue" ? "⚠ " : ""}{formatDate(item.publish_date)}
        </p>
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

type FilterStatus = ContentStatus | "All";

export default function ContentPipeline() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [filterPlatform, setFilterPlatform] = useState<ContentPlatform | "">("");
  const [filterPriority, setFilterPriority] = useState<ContentPriority | "">("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [openItem, setOpenItem] = useState<ContentItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setItems(safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []));
    setProjects(safeRead<Project[]>(KEYS.PROJECTS, []));
    setMounted(true);
  }, []);

  function save(updated: ContentItem[]) {
    setItems(updated);
    try { localStorage.setItem(KEYS.CONTENT_ITEMS, JSON.stringify(updated)); } catch {}
  }

  function handleSave(updated: ContentItem) {
    if (isNew) {
      save([updated, ...items]);
    } else {
      save(items.map((i) => (i.id === updated.id ? updated : i)));
    }
    setOpenItem(null);
    setIsNew(false);
  }

  function handleArchive(id: string) {
    const now = new Date().toISOString();
    save(items.map((i) => i.id === id ? { ...i, status: "Archived" as ContentStatus, updated_at: now } : i));
  }

  function openNew() {
    setIsNew(true);
    setOpenItem(emptyItem());
  }

  function openEdit(item: ContentItem) {
    setIsNew(false);
    setOpenItem(item);
  }

  // Derived stats
  const nonArchived = items.filter((i) => i.status !== "Archived");
  const statCounts: Record<ContentStatus, number> = {
    Idea: 0, Drafting: 0, Ready: 0, Published: 0, Archived: 0,
  };
  for (const i of items) statCounts[i.status]++;

  const overdueCount = nonArchived.filter(
    (i) => i.status !== "Published" && getDueDateState(i.publish_date) === "overdue"
  ).length;

  // Filter
  const filtered = items.filter((i) => {
    if (!showArchived && i.status === "Archived") return false;
    if (filterStatus !== "All" && i.status !== filterStatus) return false;
    if (filterPlatform && !i.platforms.includes(filterPlatform)) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeFilters =
    (filterStatus !== "All" ? 1 : 0) +
    (filterPlatform ? 1 : 0) +
    (filterPriority ? 1 : 0) +
    (showArchived ? 1 : 0);

  if (!mounted) return null;

  const SELECT_STYLE = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.5)",
    borderRadius: "0.5rem",
    padding: "0.375rem 0.75rem",
    fontSize: "0.75rem",
    appearance: "none" as const,
    outline: "none",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["Idea", "Drafting", "Ready", "Published"] as ContentStatus[]).map((s) => {
          const c = STATUS_CFG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
              className="rounded-xl p-3 text-center transition-all"
              style={{
                background: filterStatus === s ? c.bg : "rgba(255,255,255,0.025)",
                border: filterStatus === s ? `1px solid ${c.border}` : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-2xl font-bold tabular-nums mb-0.5"
                style={{ color: statCounts[s] > 0 ? c.text : "rgba(255,255,255,0.15)" }}
              >
                {statCounts[s]}
              </p>
              <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                {s}
              </p>
            </button>
          );
        })}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)", color: "rgba(239,68,68,0.8)" }}
        >
          ⚠ {overdueCount} piece{overdueCount !== 1 ? "s" : ""} past publish date
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[160px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content…"
            className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
            }}
          />
        </div>

        {/* Platform filter */}
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as ContentPlatform | "")}
          style={SELECT_STYLE}
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p} style={{ background: "#0a0816" }}>{p}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as ContentPriority | "")}
          style={SELECT_STYLE}
        >
          <option value="">All Priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p} style={{ background: "#0a0816" }}>{p}</option>)}
        </select>

        {/* Archived toggle */}
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs px-3 py-2 rounded-xl transition-all"
          style={{
            background: showArchived ? "rgba(148,163,184,0.1)" : "rgba(255,255,255,0.03)",
            border: showArchived ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(255,255,255,0.07)",
            color: showArchived ? "rgba(148,163,184,0.7)" : "rgba(255,255,255,0.25)",
          }}
        >
          Archived
        </button>

        {/* Clear */}
        {activeFilters > 0 && (
          <button
            onClick={() => {
              setFilterStatus("All");
              setFilterPlatform("");
              setFilterPriority("");
              setSearch("");
              setShowArchived(false);
            }}
            className="text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Clear ({activeFilters})
          </button>
        )}

        {/* Add button */}
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ml-auto"
          style={{
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
            color: "rgba(165,180,252,0.9)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
        >
          <span className="text-base leading-none">+</span>
          Add Content
        </button>
      </div>

      {/* Results count */}
      <p className="text-[10px] -mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
        {filtered.length} {filtered.length === 1 ? "item" : "items"}
        {activeFilters > 0 || search ? " (filtered)" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            {items.length === 0
              ? "Your content pipeline is empty."
              : "No content matches these filters."}
          </p>
          {items.length === 0 && (
            <button
              onClick={openNew}
              className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "rgba(165,180,252,0.8)",
              }}
            >
              + Add your first content idea
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <ContentCard key={item.id} item={item} onClick={() => openEdit(item)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {openItem && (
        <ContentModal
          item={openItem}
          projects={projects}
          onSave={handleSave}
          onArchive={handleArchive}
          onClose={() => { setOpenItem(null); setIsNew(false); }}
        />
      )}
    </div>
  );
}
