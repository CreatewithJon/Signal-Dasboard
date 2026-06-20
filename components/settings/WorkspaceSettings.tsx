"use client";

/**
 * components/settings/WorkspaceSettings.tsx — Sovereign OS v6.7
 *
 * Settings panel for managing workspaces.
 * Create, edit, archive workspaces.
 * No data filtering is active yet — this is metadata-only.
 */

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";
import {
  DEFAULT_WORKSPACE,
  WORKSPACE_COLORS,
  WORKSPACE_TYPE_LABELS,
} from "@/lib/types/workspace";
import type { Workspace, WorkspaceType } from "@/lib/types/workspace";
import type { Project } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Person } from "@/lib/types/relationships";
import type { Opportunity } from "@/lib/types/opportunities";

interface WsCounts {
  projects:      number;
  memories:      number;
  content:       number;
  relationships: number;
  opportunities: number;
}

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
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

const EMPTY_FORM = {
  name:        "",
  type:        "Company" as WorkspaceType,
  description: "",
  color:       "#6366f1",
};

// ── sub-components ─────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: WorkspaceType }) {
  const colors: Record<WorkspaceType, string> = {
    Personal:  "rgba(139,92,246,0.15)",
    Company:   "rgba(99,102,241,0.15)",
    Project:   "rgba(59,130,246,0.15)",
    Client:    "rgba(245,158,11,0.15)",
    Community: "rgba(16,185,129,0.15)",
    Education: "rgba(244,63,94,0.15)",
  };
  const text: Record<WorkspaceType, string> = {
    Personal:  "rgba(196,181,253,0.8)",
    Company:   "rgba(165,180,252,0.8)",
    Project:   "rgba(147,197,253,0.8)",
    Client:    "rgba(253,230,138,0.8)",
    Community: "rgba(110,231,183,0.8)",
    Education: "rgba(253,164,175,0.8)",
  };
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
      style={{ background: colors[type], color: text[type] }}
    >
      {type}
    </span>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function WorkspaceSettings() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saved,      setSaved]      = useState(false);
  const [counts,     setCounts]     = useState<Record<string, WsCounts>>({});

  useEffect(() => {
    const stored = safeRead<Workspace[]>(KEYS.WORKSPACES, []);
    const hasPersonal = stored.some((w) => w.id === "personal");
    const all = hasPersonal ? stored : [DEFAULT_WORKSPACE, ...stored];
    if (!hasPersonal) safeWrite(KEYS.WORKSPACES, all);
    setWorkspaces(all);

    // Compute per-workspace counts
    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const memories      = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const content       = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const relationships = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);

    function countFor<T extends { workspace_id?: string }>(items: T[], wsId: string): number {
      if (wsId === "personal") return items.filter((i) => !i.workspace_id || i.workspace_id === "personal").length;
      return items.filter((i) => i.workspace_id === wsId).length;
    }

    const computed: Record<string, WsCounts> = {};
    for (const ws of all) {
      computed[ws.id] = {
        projects:      countFor(projects,      ws.id),
        memories:      countFor(memories,      ws.id),
        content:       countFor(content,       ws.id),
        relationships: countFor(relationships, ws.id),
        opportunities: countFor(opportunities, ws.id),
      };
    }
    setCounts(computed);
  }, []);

  function persist(updated: Workspace[]) {
    setWorkspaces(updated);
    safeWrite(KEYS.WORKSPACES, updated);
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(ws: Workspace) {
    setEditId(ws.id);
    setForm({ name: ws.name, type: ws.type, description: ws.description, color: ws.color });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  }

  function saveForm() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    if (editId) {
      persist(workspaces.map((w) =>
        w.id === editId ? { ...w, ...form, updated_at: now } : w
      ));
    } else {
      const newWs: Workspace = {
        id:          `ws-${Date.now()}`,
        name:        form.name.trim(),
        type:        form.type,
        description: form.description.trim(),
        color:       form.color,
        archived:    false,
        created_at:  now,
        updated_at:  now,
      };
      persist([...workspaces, newWs]);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    cancelForm();
  }

  function archive(id: string) {
    if (id === "personal") return; // never archive Personal
    const now = new Date().toISOString();
    persist(workspaces.map((w) => w.id === id ? { ...w, archived: true, updated_at: now } : w));
  }

  function unarchive(id: string) {
    const now = new Date().toISOString();
    persist(workspaces.map((w) => w.id === id ? { ...w, archived: false, updated_at: now } : w));
  }

  const active   = workspaces.filter((w) => !w.archived);
  const archived = workspaces.filter((w) => w.archived);

  return (
    <div className="space-y-4">

      {/* Info banner */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)" }}
      >
        <p className="text-[10px] text-white/40 leading-relaxed">
          <span className="font-semibold text-indigo-400/70">Workspaces</span> let you organize Sovereign OS across multiple contexts — Personal, business brands, client engagements, and communities.
          {" "}<span className="text-white/25">New items are stamped to the active workspace. Use the sidebar switcher to scope your view. Counts below show P = Projects · M = Memory · C = Content · R = Relationships · $ = Opportunities.</span>
        </p>
      </div>

      {/* Active workspaces list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {active.map((ws, i) => (
          <div
            key={ws.id}
            className="px-4 py-3.5 flex items-center gap-3"
            style={{ borderBottom: i < active.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
          >
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: ws.color, boxShadow: `0 0 8px ${ws.color}60` }}
            />
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-white/70 truncate">{ws.name}</p>
                <TypeBadge type={ws.type} />
                {ws.id === "personal" && (
                  <span className="text-[8px] text-white/20 font-medium">Default</span>
                )}
              </div>
              {ws.description && (
                <p className="text-[10px] text-white/25 mt-0.5 truncate">{ws.description}</p>
              )}
              {counts[ws.id] && (
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  {(
                    [
                      ["P", counts[ws.id].projects],
                      ["M", counts[ws.id].memories],
                      ["C", counts[ws.id].content],
                      ["R", counts[ws.id].relationships],
                      ["$", counts[ws.id].opportunities],
                    ] as [string, number][]
                  ).map(([label, count]) => (
                    <span key={label} className="text-[8px] tabular-nums" style={{ color: count > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)" }}>
                      {label} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEdit(ws)}
                className="text-[9px] px-2 py-1 rounded-lg transition-all text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
              >
                Edit
              </button>
              {ws.id !== "personal" && (
                <button
                  onClick={() => archive(ws.id)}
                  className="text-[9px] px-2 py-1 rounded-lg transition-all text-white/20 hover:text-white/45 hover:bg-white/[0.04]"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        ))}

        {active.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-white/25">No active workspaces</p>
          </div>
        )}
      </div>

      {/* Create button */}
      {!showForm && (
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", color: "rgba(165,180,252,0.7)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Add Workspace
        </button>
      )}

      {saved && (
        <p className="text-[9px] text-emerald-400/70 px-1">Saved ✓</p>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(99,102,241,0.6)" }}>
            {editId ? "Edit Workspace" : "New Workspace"}
          </p>

          {/* Name */}
          <div>
            <label className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-1.5 block">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Agentic Systems"
              className="w-full rounded-xl px-3 py-2.5 text-xs text-white/75 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-indigo-500/40"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-1.5 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as WorkspaceType }))}
              className="w-full rounded-xl px-3 py-2.5 text-xs text-white/70 outline-none focus:ring-1 focus:ring-indigo-500/40"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {Object.entries(WORKSPACE_TYPE_LABELS).filter(([key]) => key !== "Personal").map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description of this context"
              className="w-full rounded-xl px-3 py-2.5 text-xs text-white/75 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-indigo-500/40"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-1.5 block">Accent Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  title={c.label}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c.value,
                    outline: form.color === c.value ? `2px solid ${c.value}` : "2px solid transparent",
                    outlineOffset: "2px",
                    opacity: form.color === c.value ? 1 : 0.45,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveForm}
              disabled={!form.name.trim()}
              className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgba(165,180,252,0.9)" }}
            >
              {editId ? "Save Changes" : "Create Workspace"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Archived workspaces */}
      {archived.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/15 mb-2 px-1">Archived</p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            {archived.map((ws, i) => (
              <div
                key={ws.id}
                className="px-4 py-3 flex items-center gap-3 opacity-40"
                style={{ borderBottom: i < archived.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ws.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50 truncate">{ws.name}</p>
                  <p className="text-[9px] text-white/20">{ws.type}</p>
                </div>
                <button
                  onClick={() => unarchive(ws.id)}
                  className="text-[9px] px-2 py-1 rounded-lg transition-all text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
