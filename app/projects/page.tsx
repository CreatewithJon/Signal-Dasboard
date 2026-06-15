"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Status = "Active" | "Paused" | "Complete" | "Idea";

interface Project {
  id: string;
  title: string;
  status: Status;
  description: string;
  next_action: string;
  url: string;
  last_updated: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { color: string; bg: string; border: string }> = {
  Active: { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  Paused: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  Complete: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  Idea: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
};

const STATUSES: Status[] = ["Active", "Paused", "Complete", "Idea"];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "1",
    title: "digitalwealthtransfer.com",
    status: "Active",
    description: "Media company & marketplace platform",
    next_action: "Commit DWT refactor and deploy",
    url: "https://digitalwealthtransfer.com",
    last_updated: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Sovereign OS",
    status: "Active",
    description: "Personal AI operating system — command center, planner, content, AI",
    next_action: "Complete nav restructure, add Leads + Settings modules",
    url: "",
    last_updated: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Aigentic Systems",
    status: "Active",
    description: "AI automation services business",
    next_action: "Set up lead engine with Alberto",
    url: "",
    last_updated: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Big Money Realty",
    status: "Paused",
    description: "AI-powered real estate platform",
    next_action: "Alberto to run DB schema",
    url: "",
    last_updated: new Date().toISOString(),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function now() {
  return new Date().toISOString();
}

// ── Main Component ────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sovereign_projects");
      if (stored) setProjects(JSON.parse(stored) as Project[]);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function saveProjects(next: Project[]) {
    setProjects(next);
    try {
      localStorage.setItem("sovereign_projects", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function updateProject(id: string, field: keyof Project, value: string) {
    saveProjects(
      projects.map((p) =>
        p.id === id ? { ...p, [field]: value, last_updated: now() } : p
      )
    );
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  function addProject() {
    const newP: Project = {
      id: Date.now().toString(),
      title: "New Project",
      status: "Idea",
      description: "",
      next_action: "",
      url: "",
      last_updated: now(),
    };
    const next = [newP, ...projects];
    saveProjects(next);
    setEditingId(newP.id);
  }

  const filtered =
    filterStatus === "All" ? projects : projects.filter((p) => p.status === filterStatus);

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: projects.filter((p) => p.status === s).length }),
    {} as Record<Status, number>
  );

  if (!loaded) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.05) 55%, transparent 75%)",
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-400/60 mb-4 relative">
          Project Tracker
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-4 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          What&apos;s In Motion.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Active projects, next actions, and where momentum lives.
        </p>

        {/* Status summary pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap mt-8 relative">
          {STATUSES.map((s) => {
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

      {/* ── Controls ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {(["All", ...STATUSES] as (Status | "All")[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filterStatus === s ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                border: filterStatus === s ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.06)",
                color: filterStatus === s ? "rgba(147,197,253,0.9)" : "rgba(255,255,255,0.3)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={addProject}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "rgba(147,197,253,0.9)",
          }}
        >
          <span>+ Add Project</span>
        </button>
      </div>

      {/* ── Project Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {filtered.map((project) => {
          const cfg = STATUS_CONFIG[project.status];
          const isEditing = editingId === project.id;

          return (
            <div
              key={project.id}
              className="rounded-2xl p-5 group relative"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Delete button */}
              <button
                onClick={() => deleteProject(project.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 hover:opacity-100 text-white/40 text-base transition-opacity"
              >
                ×
              </button>

              {/* Status pill */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateProject(project.id, "status", s)}
                      className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full transition-all"
                      style={
                        project.status === s
                          ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                          : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.18)" }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              {isEditing ? (
                <input
                  autoFocus
                  value={project.title}
                  onChange={(e) => updateProject(project.id, "title", e.target.value)}
                  onBlur={() => setEditingId(null)}
                  className="w-full bg-transparent text-sm font-semibold text-white/90 outline-none border-b border-white/10 pb-1 mb-2"
                />
              ) : (
                <button
                  onClick={() => setEditingId(project.id)}
                  className="text-left w-full text-sm font-semibold text-white/85 mb-2 hover:text-white/100 transition-colors"
                >
                  {project.title}
                </button>
              )}

              {/* Description */}
              <textarea
                value={project.description}
                onChange={(e) => updateProject(project.id, "description", e.target.value)}
                rows={2}
                className="w-full bg-transparent text-xs text-white/45 resize-none outline-none leading-relaxed mb-3"
                placeholder="Short description…"
              />

              {/* Next action */}
              <div
                className="rounded-xl px-3 py-2.5 mb-3"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)" }}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-400/50 mb-1">
                  Next Move
                </p>
                <input
                  value={project.next_action}
                  onChange={(e) => updateProject(project.id, "next_action", e.target.value)}
                  className="w-full bg-transparent text-xs text-white/70 outline-none"
                  placeholder="What&apos;s the next action?"
                />
              </div>

              {/* URL + timestamp */}
              <div className="flex items-center justify-between gap-2">
                <input
                  value={project.url}
                  onChange={(e) => updateProject(project.id, "url", e.target.value)}
                  className="flex-1 bg-transparent text-[10px] text-white/20 outline-none"
                  placeholder="URL (optional)"
                />
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400/50 hover:text-blue-400/80 transition-colors"
                  >
                    ↗
                  </a>
                )}
                <span className="text-[10px] text-white/15 shrink-0">
                  {formatDate(project.last_updated)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="col-span-full rounded-2xl p-10 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-sm text-white/20">No projects in this status</p>
          </div>
        )}
      </div>
    </div>
  );
}
