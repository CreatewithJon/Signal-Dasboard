"use client";

import { useState, useEffect } from "react";

type Platform = "YouTube" | "LinkedIn" | "X" | "Short";
type IdeaStatus = "Raw" | "Developing" | "Ready" | "Published";

interface ContentIdea {
  id: string;
  title: string;
  platform: Platform;
  status: IdeaStatus;
  notes: string;
  created_at: string;
}

const PLATFORM_CONFIG: Record<Platform, { color: string; bg: string; border: string }> = {
  YouTube: { color: "#f87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  LinkedIn: { color: "#60a5fa", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  X:        { color: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
  Short:    { color: "#a78bfa", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
};

const STATUS_CONFIG: Record<IdeaStatus, { color: string }> = {
  Raw:        { color: "rgba(255,255,255,0.25)" },
  Developing: { color: "#fbbf24" },
  Ready:      { color: "#34d399" },
  Published:  { color: "#60a5fa" },
};

const PLATFORMS: Platform[] = ["YouTube", "LinkedIn", "X", "Short"];
const STATUSES: IdeaStatus[] = ["Raw", "Developing", "Ready", "Published"];

const DEFAULT_IDEAS: ContentIdea[] = [
  { id: "1", title: "What AI actually does for a small business owner", platform: "YouTube", status: "Ready", notes: "", created_at: new Date().toISOString() },
  { id: "2", title: "Bitcoin isn't crypto. Here's why that matters.", platform: "LinkedIn", status: "Developing", notes: "", created_at: new Date().toISOString() },
  { id: "3", title: "I built a lead capture system for $0. Here's how.", platform: "YouTube", status: "Raw", notes: "", created_at: new Date().toISOString() },
  { id: "4", title: "The 3 AI tools I use every single day", platform: "Short", status: "Raw", notes: "", created_at: new Date().toISOString() },
  { id: "5", title: "Stop buying courses. Start building systems.", platform: "LinkedIn", status: "Ready", notes: "", created_at: new Date().toISOString() },
];

const LS_KEY = "signal_content_ideas";

function load(): ContentIdea[] {
  if (typeof window === "undefined") return DEFAULT_IDEAS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ContentIdea[]) : DEFAULT_IDEAS;
  } catch {
    return DEFAULT_IDEAS;
  }
}

function save(ideas: ContentIdea[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ideas));
}

export default function IdeasVault() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<Platform | "All">("All");
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | "All">("All");

  useEffect(() => {
    setIdeas(load());
  }, []);

  function update(updated: ContentIdea[]) {
    setIdeas(updated);
    save(updated);
  }

  function addIdea() {
    const newIdea: ContentIdea = {
      id: Date.now().toString(),
      title: "New content idea...",
      platform: "YouTube",
      status: "Raw",
      notes: "",
      created_at: new Date().toISOString(),
    };
    const updated = [newIdea, ...ideas];
    update(updated);
    setEditingId(newIdea.id);
  }

  function removeIdea(id: string) {
    update(ideas.filter((i) => i.id !== id));
  }

  function patchIdea(id: string, patch: Partial<ContentIdea>) {
    update(ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  const filtered = ideas.filter((i) => {
    if (filterPlatform !== "All" && i.platform !== filterPlatform) return false;
    if (filterStatus !== "All" && i.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* Platform filter */}
          <div className="flex gap-1">
            {(["All", ...PLATFORMS] as (Platform | "All")[]).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: filterPlatform === p ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: filterPlatform === p ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  color: filterPlatform === p ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1">
            {(["All", ...STATUSES] as (IdeaStatus | "All")[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: filterStatus === s ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: filterStatus === s ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  color: filterStatus === s ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={addIdea}
          className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#a78bfa",
          }}
        >
          + Add Idea
        </button>
      </div>

      {/* Ideas grid */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-white/20 text-sm">No ideas match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((idea) => {
            const pc = PLATFORM_CONFIG[idea.platform];
            const sc = STATUS_CONFIG[idea.status];
            const isEditing = editingId === idea.id;
            return (
              <div
                key={idea.id}
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                      style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.color }}
                    >
                      {idea.platform}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: sc.color }}
                    >
                      {idea.status}
                    </span>
                  </div>
                  <button
                    onClick={() => removeIdea(idea.id)}
                    className="text-white/15 hover:text-white/40 transition-colors text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* Title */}
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={idea.title}
                    onChange={(e) => patchIdea(idea.id, { title: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    rows={2}
                    className="w-full text-sm font-medium text-white/85 bg-transparent outline-none resize-none leading-snug mb-3"
                    style={{ border: "none", caretColor: "#a78bfa" }}
                  />
                ) : (
                  <p
                    className="text-sm font-medium text-white/85 leading-snug mb-3 cursor-text"
                    onClick={() => setEditingId(idea.id)}
                  >
                    {idea.title}
                  </p>
                )}

                {/* Platform / Status selectors */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <select
                    value={idea.platform}
                    onChange={(e) => patchIdea(idea.id, { platform: e.target.value as Platform })}
                    className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-lg bg-transparent outline-none cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                  >
                    {PLATFORMS.map((p) => <option key={p} value={p} style={{ background: "#0a0a10" }}>{p}</option>)}
                  </select>
                  <select
                    value={idea.status}
                    onChange={(e) => patchIdea(idea.id, { status: e.target.value as IdeaStatus })}
                    className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-lg bg-transparent outline-none cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s} style={{ background: "#0a0a10" }}>{s}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <textarea
                  value={idea.notes}
                  onChange={(e) => patchIdea(idea.id, { notes: e.target.value })}
                  placeholder="Notes, angles, hooks..."
                  rows={2}
                  className="w-full text-xs text-white/35 placeholder-white/15 bg-transparent outline-none resize-none leading-relaxed"
                  style={{ border: "none" }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
