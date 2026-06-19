"use client";

import { useState, useEffect, useRef } from "react";
import type { MemoryItem, MemoryType, MemoryImportance } from "@/lib/types/memory";
import type { Project } from "@/lib/types/projects";
import {
  saveMemoryItemDual,
  deleteMemoryItemDual,
  getMemoryItems,
} from "@/lib/repositories/memoryRepository";

const PROJECTS_KEY = "sovereign_projects";

type SyncStatus = "saving" | "synced" | "local-only" | null;

// ── Visual configs ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MemoryType, { color: string; bg: string; border: string }> = {
  "Note":            { color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.22)" },
  "Person":          { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.22)" },
  "Project Context": { color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.22)" },
  "Meeting":         { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.22)" },
  "Decision":        { color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.22)" },
  "Idea":            { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.22)" },
  "Resource":        { color: "#22d3ee", bg: "rgba(34,211,238,0.1)",  border: "rgba(34,211,238,0.22)" },
  "Client":          { color: "#fb923c", bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.22)" },
  "Content":         { color: "#c084fc", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.22)" },
};

const IMPORTANCE_CONFIG: Record<MemoryImportance, { color: string; bg: string; border: string }> = {
  Low:      { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)" },
  Medium:   { color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.15)" },
  High:     { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.15)" },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.15)" },
};

const MEMORY_TYPES: MemoryType[] = [
  "Note", "Person", "Project Context", "Meeting", "Decision", "Idea", "Resource", "Client", "Content",
];
const IMPORTANCE_LEVELS: MemoryImportance[] = ["Low", "Medium", "High", "Critical"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId(): string { return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function nowIso(): string { return new Date().toISOString(); }

function autoTitle(content: string): string {
  const first = content.trim().split(/[.!?\n]/)[0].trim();
  if (!first) return "Untitled";
  if (first.length <= 60) return first;
  return first.split(/\s+/).slice(0, 8).join(" ") + "…";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function loadProjects(): Project[] {
  try {
    const r = localStorage.getItem(PROJECTS_KEY);
    const parsed = r ? JSON.parse(r) : [];
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch { return []; }
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, color, bg, border }: { label: string; color: string; bg: string; border?: string }) {
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0"
      style={{ color, background: bg, border: `1px solid ${border ?? bg}` }}
    >
      {label}
    </span>
  );
}

// ── MemoryCard ────────────────────────────────────────────────────────────────

function MemoryCard({
  item, projects, onClick,
}: { item: MemoryItem; projects: Project[]; onClick: () => void }) {
  const typeCfg = TYPE_CONFIG[item.type];
  const impCfg = IMPORTANCE_CONFIG[item.importance];
  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all group"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onClick={onClick}
    >
      {/* Type accent strip */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${typeCfg.color}80, transparent)` }} />

      <div className="p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Pill label={item.type} color={typeCfg.color} bg={typeCfg.bg} border={typeCfg.border} />
          {item.importance !== "Medium" && (
            <Pill label={item.importance} color={impCfg.color} bg={impCfg.bg} border={impCfg.border} />
          )}
          <span className="ml-auto text-[9px] text-white/20 shrink-0">{formatDate(item.updatedAt)}</span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white/85 leading-snug group-hover:text-white/95 transition-colors">
          {item.title}
        </h3>

        {/* Content preview */}
        {item.content && (
          <p className="text-xs text-white/40 leading-relaxed line-clamp-3">{item.content}</p>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(99,102,241,0.08)", color: "rgba(165,180,252,0.6)" }}
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 5 && (
              <span className="text-[9px] text-white/20">+{item.tags.length - 5}</span>
            )}
          </div>
        )}

        {/* Related people */}
        {item.relatedPeople.length > 0 && (
          <p className="text-[9px] text-white/30 leading-snug">
            {item.relatedPeople.slice(0, 3).join(", ")}
            {item.relatedPeople.length > 3 ? ` +${item.relatedPeople.length - 3} more` : ""}
          </p>
        )}

        {/* Related projects */}
        {item.relatedProjectIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.relatedProjectIds.slice(0, 2).map((id) => (
              <span
                key={id}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.08)", color: "rgba(52,211,153,0.6)" }}
              >
                {projectMap.get(id) ?? "Project"}
              </span>
            ))}
            {item.relatedProjectIds.length > 2 && (
              <span className="text-[9px] text-white/20">+{item.relatedProjectIds.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MemoryModal ───────────────────────────────────────────────────────────────

type EmbedState = "idle" | "loading" | "ok" | "error";

function MemoryModal({
  item, projects, onSave, onDelete, onClose, embeddingConfigured,
}: {
  item: MemoryItem;
  projects: Project[];
  onSave: (item: MemoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  embeddingConfigured: boolean;
}) {
  const [draft, setDraft] = useState<MemoryItem>({ ...item });
  const [tagInput, setTagInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [embedState, setEmbedState] = useState<EmbedState>("idle");
  const [embedDims, setEmbedDims] = useState<number | null>(null);

  async function generateEmbedding() {
    if (!embeddingConfigured) return;
    setEmbedState("loading");
    setEmbedDims(null);
    try {
      const { formatMemoryForEmbedding } = await import("@/lib/vector/embedding");
      const text = formatMemoryForEmbedding(draft);
      const res = await fetch("/api/vector/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId: draft.id, text }),
      });
      const data = await res.json() as { status: string; dimensions?: number; error?: string };
      if (data.status === "ok") {
        setEmbedState("ok");
        setEmbedDims(data.dimensions ?? null);
      } else {
        setEmbedState("error");
      }
    } catch {
      setEmbedState("error");
    }
  }

  function update(patch: Partial<MemoryItem>) {
    setDraft((prev) => ({ ...prev, ...patch, updatedAt: nowIso() }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (!t || draft.tags.includes(t)) { setTagInput(""); return; }
    update({ tags: [...draft.tags, t] });
    setTagInput("");
  }

  function removeTag(tag: string) { update({ tags: draft.tags.filter((t) => t !== tag) }); }

  function addPerson() {
    const p = personInput.trim();
    if (!p || draft.relatedPeople.includes(p)) { setPersonInput(""); return; }
    update({ relatedPeople: [...draft.relatedPeople, p] });
    setPersonInput("");
  }

  function removePerson(person: string) {
    update({ relatedPeople: draft.relatedPeople.filter((p) => p !== person) });
  }

  function toggleProject(id: string) {
    const next = draft.relatedProjectIds.includes(id)
      ? draft.relatedProjectIds.filter((x) => x !== id)
      : [...draft.relatedProjectIds, id];
    update({ relatedProjectIds: next });
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const activeProjects = projects.filter((p) => p.status !== "Archived");
  const typeCfg = TYPE_CONFIG[draft.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: "#0d0d14",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          maxHeight: "calc(100vh - 6rem)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-0.5" style={{ color: typeCfg.color }}>
              {draft.type} · {draft.source}
            </p>
            <p className="text-[10px] text-white/25">{formatDate(draft.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {embeddingConfigured && (
              <button
                onClick={generateEmbedding}
                disabled={embedState === "loading"}
                className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: embedState === "ok"
                    ? "rgba(52,211,153,0.08)"
                    : embedState === "error"
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: embedState === "ok"
                    ? "1px solid rgba(52,211,153,0.2)"
                    : embedState === "error"
                    ? "1px solid rgba(239,68,68,0.18)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: embedState === "ok"
                    ? "rgba(52,211,153,0.8)"
                    : embedState === "error"
                    ? "rgba(239,68,68,0.75)"
                    : "rgba(255,255,255,0.3)",
                }}
                title={embedState === "ok" ? `${embedDims}-dim vector generated` : "Generate semantic embedding"}
              >
                {embedState === "loading" && "Embedding…"}
                {embedState === "ok"      && `✓ ${embedDims}d`}
                {embedState === "error"   && "Embed failed"}
                {embedState === "idle"    && "Embed"}
              </button>
            )}
            <button
              onClick={() => onSave(draft)}
              className="text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-all text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Title */}
          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full bg-transparent text-lg font-bold text-white/90 focus:outline-none border-b border-transparent focus:border-white/10 pb-0.5 transition-colors"
            placeholder="Title"
          />

          {/* Content */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Content</label>
            <textarea
              value={draft.content}
              onChange={(e) => update({ content: e.target.value })}
              rows={5}
              className="w-full bg-transparent text-sm text-white/65 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
              placeholder="Notes, context, details, links…"
            />
          </div>

          {/* Type + Importance */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2">Type</label>
              <select
                value={draft.type}
                onChange={(e) => update({ type: e.target.value as MemoryType })}
                className="w-full bg-transparent text-sm text-white/60 focus:outline-none cursor-pointer"
                style={{ colorScheme: "dark" }}
              >
                {MEMORY_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: "#0d0d14" }}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2">Importance</label>
              <div className="flex gap-1.5 flex-wrap">
                {IMPORTANCE_LEVELS.map((imp) => {
                  const cfg = IMPORTANCE_CONFIG[imp];
                  return (
                    <button
                      key={imp}
                      onClick={() => update({ importance: imp })}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                      style={{
                        background: draft.importance === imp ? cfg.bg : "rgba(255,255,255,0.04)",
                        border: draft.importance === imp ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.08)",
                        color: draft.importance === imp ? cfg.color : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {imp}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag (Enter to save)"
                className="flex-1 bg-transparent text-xs text-white/50 placeholder:text-white/15 focus:outline-none border-b pb-0.5"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-30 transition-all"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Related People */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-1.5">Related People</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.relatedPeople.map((person) => (
                <span
                  key={person}
                  className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "rgba(196,181,253,0.8)" }}
                >
                  {person}
                  <button
                    onClick={() => removePerson(person)}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } }}
                placeholder="Name (Enter to add)"
                className="flex-1 bg-transparent text-xs text-white/50 placeholder:text-white/15 focus:outline-none border-b pb-0.5"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={addPerson}
                disabled={!personInput.trim()}
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-30 transition-all"
                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "rgba(196,181,253,0.8)" }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Related Projects */}
          {activeProjects.length > 0 && (
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2">
                Related Projects
              </label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {activeProjects.map((p) => {
                  const checked = draft.relatedProjectIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2.5 cursor-pointer py-1"
                      onClick={() => toggleProject(p.id)}
                    >
                      <div
                        className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: checked ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.04)",
                          border: checked ? "1px solid rgba(99,102,241,0.9)" : "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {checked && (
                          <svg viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" className="w-2 h-2">
                            <path d="M1 4l2 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-xs transition-colors select-none"
                        style={{ color: checked ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}
                      >
                        {p.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="pt-2 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-xs text-white/40 flex-1">Delete this memory item?</p>
                <button
                  onClick={() => { onDelete(item.id); onClose(); }}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)" }}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[10px] font-semibold text-white/20 hover:text-red-400/60 transition-colors"
              >
                Delete memory item
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);
  const [readSource, setReadSource] = useState<"local" | "supabase">("local");
  const [readFallback, setReadFallback] = useState<string | null>(null);
  const [embeddingConfigured, setEmbeddingConfigured] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick capture
  const [captureText, setCaptureText] = useState("");
  const [captureType, setCaptureType] = useState<MemoryType>("Note");
  const [captureImportance, setCaptureImportance] = useState<MemoryImportance>("Medium");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "All">("All");
  const [filterImportance, setFilterImportance] = useState<MemoryImportance | "All">("All");
  const [filterTag, setFilterTag] = useState("All");

  // Modal
  const [editItem, setEditItem] = useState<MemoryItem | null>(null);

  useEffect(() => {
    (async () => {
      const result = await getMemoryItems();
      setItems(result.items);
      setReadSource(result.source);
      if (result.fallback && result.error) setReadFallback(result.error);
      setProjects(loadProjects());
      setLoaded(true);
    })();

    // Check embedding availability without blocking page load
    fetch("/api/vector/status")
      .then((r) => r.json())
      .then((d: { embeddingConfigured?: boolean }) => {
        setEmbeddingConfigured(d.embeddingConfigured ?? false);
      })
      .catch(() => {});
  }, []);

  function showSync(status: SyncStatus) {
    setSyncStatus(status);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setSyncStatus(null), 3000);
  }

  async function capture() {
    if (!captureText.trim()) return;
    const item: MemoryItem = {
      id: newId(),
      title: autoTitle(captureText),
      content: captureText.trim(),
      type: captureType,
      tags: [],
      relatedProjectIds: [],
      relatedPeople: [],
      importance: captureImportance,
      source: "Manual",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setItems((prev) => [item, ...prev]);
    setCaptureText("");
    showSync("saving");
    const result = await saveMemoryItemDual(item);
    showSync(result.supabase === "success" ? "synced" : "local-only");
  }

  async function handleSave(updated: MemoryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditItem(null);
    showSync("saving");
    const result = await saveMemoryItemDual(updated);
    showSync(result.supabase === "success" ? "synced" : "local-only");
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteMemoryItemDual(id);
  }

  // Derived
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();
  const hasFilters =
    filterType !== "All" || filterImportance !== "All" || filterTag !== "All" || searchQuery.trim() !== "";

  const visibleItems = items.filter((item) => {
    if (filterType !== "All" && item.type !== filterType) return false;
    if (filterImportance !== "All" && item.importance !== filterImportance) return false;
    if (filterTag !== "All" && !item.tags.includes(filterTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.content.toLowerCase().includes(q) &&
        !item.tags.some((t) => t.includes(q)) &&
        !item.relatedPeople.some((p) => p.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const highPriorityCount = items.filter(
    (i) => i.importance === "Critical" || i.importance === "High"
  ).length;

  function clearFilters() {
    setSearchQuery("");
    setFilterType("All");
    setFilterImportance("All");
    setFilterTag("All");
  }

  if (!loaded) {
    return <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {editItem && (
        <MemoryModal
          item={editItem}
          projects={projects}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditItem(null)}
          embeddingConfigured={embeddingConfigured}
        />
      )}

      {/* ── Hero ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.03) 55%, transparent 75%)" }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-400/60 mb-4 relative">
          Memory Engine
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-3 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          What do you know?
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Capture context, people, decisions, and ideas. Build the brain behind the OS.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-6 relative">
          {[
            { label: "Captured", value: items.length, color: "rgba(255,255,255,0.5)" },
            { label: "High Priority", value: highPriorityCount, color: "#f59e0b" },
            { label: "Types Used", value: new Set(items.map((i) => i.type)).size, color: "rgba(167,139,250,0.7)" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: stat.value > 0 ? stat.color : "rgba(255,255,255,0.15)" }}>
                {stat.value}
              </p>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Read source / fallback notice ── */}
      {(readSource === "supabase" || readFallback) && (
        <div
          className="rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2"
          style={{
            background: readFallback
              ? "rgba(245,158,11,0.05)"
              : "rgba(52,211,153,0.04)",
            border: readFallback
              ? "1px solid rgba(245,158,11,0.15)"
              : "1px solid rgba(52,211,153,0.12)",
          }}
        >
          <span
            className="text-xs shrink-0"
            style={{ color: readFallback ? "rgba(245,158,11,0.6)" : "rgba(52,211,153,0.6)" }}
          >
            {readFallback ? "⚠" : "✓"}
          </span>
          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
            {readFallback
              ? `Supabase read failed, showing local data — ${readFallback}`
              : "Reading from Supabase. Local data is preserved as fallback."}
          </p>
        </div>
      )}

      {/* ── Quick Capture ── */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400/50 mb-3">
          Quick Capture
        </p>
        <textarea
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) capture(); }}
          placeholder="Drop a thought, paste a note, record a decision… (⌘+Enter to save)"
          rows={3}
          className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed mb-4"
        />
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type selector — first 5 as buttons, rest in a dropdown */}
          <div className="flex gap-1 flex-wrap">
            {MEMORY_TYPES.slice(0, 5).map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setCaptureType(t)}
                  className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: captureType === t ? cfg.bg : "rgba(255,255,255,0.03)",
                    border: captureType === t ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.06)",
                    color: captureType === t ? cfg.color : "rgba(255,255,255,0.3)",
                  }}
                >
                  {t}
                </button>
              );
            })}
            <select
              value={MEMORY_TYPES.slice(5).includes(captureType) ? captureType : ""}
              onChange={(e) => { if (e.target.value) setCaptureType(e.target.value as MemoryType); }}
              className="bg-transparent text-[9px] font-semibold focus:outline-none cursor-pointer appearance-none px-2 py-1 rounded-lg transition-all"
              style={{
                background: MEMORY_TYPES.slice(5).includes(captureType)
                  ? TYPE_CONFIG[captureType].bg
                  : "rgba(255,255,255,0.03)",
                border: MEMORY_TYPES.slice(5).includes(captureType)
                  ? `1px solid ${TYPE_CONFIG[captureType].border}`
                  : "1px solid rgba(255,255,255,0.06)",
                color: MEMORY_TYPES.slice(5).includes(captureType)
                  ? TYPE_CONFIG[captureType].color
                  : "rgba(255,255,255,0.3)",
                colorScheme: "dark",
              }}
            >
              <option value="">More…</option>
              {MEMORY_TYPES.slice(5).map((t) => (
                <option key={t} value={t} style={{ background: "#0d0d14" }}>{t}</option>
              ))}
            </select>
          </div>

          {/* Importance selector */}
          <div className="flex gap-1">
            {IMPORTANCE_LEVELS.map((imp) => {
              const cfg = IMPORTANCE_CONFIG[imp];
              return (
                <button
                  key={imp}
                  onClick={() => setCaptureImportance(imp)}
                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: captureImportance === imp ? cfg.bg : "rgba(255,255,255,0.03)",
                    border: captureImportance === imp ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.06)",
                    color: captureImportance === imp ? cfg.color : "rgba(255,255,255,0.3)",
                  }}
                >
                  {imp}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {syncStatus && (
              <span
                className="text-[9px] font-semibold transition-opacity"
                style={{
                  color: syncStatus === "synced"
                    ? "rgba(52,211,153,0.7)"
                    : syncStatus === "saving"
                    ? "rgba(167,139,250,0.5)"
                    : "rgba(148,163,184,0.5)",
                }}
              >
                {syncStatus === "saving" && "Saving…"}
                {syncStatus === "synced" && "Synced ✓"}
                {syncStatus === "local-only" && "Saved locally"}
              </span>
            )}
            <button
              onClick={capture}
              disabled={!captureText.trim()}
              className="text-xs font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-30"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(167,139,250,0.9)" }}
            >
              Capture
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-2.5 mb-5">
        {/* Search */}
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
            placeholder="Search title, content, tags, people…"
            className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/20 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-white/20 hover:text-white/50 transition-colors text-sm">×</button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MemoryType | "All")}
            className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer transition-all"
            style={{
              background: filterType !== "All" ? TYPE_CONFIG[filterType as MemoryType].bg : "rgba(255,255,255,0.03)",
              border: filterType !== "All" ? `1px solid ${TYPE_CONFIG[filterType as MemoryType].border}` : "1px solid rgba(255,255,255,0.06)",
              color: filterType !== "All" ? TYPE_CONFIG[filterType as MemoryType].color : "rgba(255,255,255,0.3)",
              colorScheme: "dark",
            }}
          >
            <option value="All">All Types</option>
            {MEMORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Importance */}
          <select
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value as MemoryImportance | "All")}
            className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer transition-all"
            style={{
              background: filterImportance !== "All" ? IMPORTANCE_CONFIG[filterImportance as MemoryImportance].bg : "rgba(255,255,255,0.03)",
              border: filterImportance !== "All" ? `1px solid ${IMPORTANCE_CONFIG[filterImportance as MemoryImportance].border}` : "1px solid rgba(255,255,255,0.06)",
              color: filterImportance !== "All" ? IMPORTANCE_CONFIG[filterImportance as MemoryImportance].color : "rgba(255,255,255,0.3)",
              colorScheme: "dark",
            }}
          >
            <option value="All">All Importance</option>
            {IMPORTANCE_LEVELS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>

          {/* Tags */}
          {allTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer transition-all"
              style={{
                background: filterTag !== "All" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                border: filterTag !== "All" ? "1px solid rgba(99,102,241,0.22)" : "1px solid rgba(255,255,255,0.06)",
                color: filterTag !== "All" ? "rgba(165,180,252,0.85)" : "rgba(255,255,255,0.3)",
                colorScheme: "dark",
              }}
            >
              <option value="All">All Tags</option>
              {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
            >
              Clear ×
            </button>
          )}

          {hasFilters && (
            <span className="text-[9px] text-white/20 ml-auto">
              {visibleItems.length} result{visibleItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Memory Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-16">
        {visibleItems.map((item) => (
          <MemoryCard
            key={item.id}
            item={item}
            projects={projects}
            onClick={() => setEditItem(item)}
          />
        ))}

        {visibleItems.length === 0 && (
          <div
            className="col-span-full rounded-2xl p-12 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}
          >
            {hasFilters ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-white/25">No memories match your filters.</p>
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                  style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.8)" }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-white/25">Memory bank is empty.</p>
                <p className="text-xs text-white/15 mt-1">Use Quick Capture above to add your first memory.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
