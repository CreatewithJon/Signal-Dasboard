"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Project, ProjectTask } from "@/lib/types/projects";

const PROJECTS_KEY = "sovereign_projects";
const TASKS_KEY = "sovereign_project_tasks";

const PRIORITY_DOT: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f59e0b",
  Medium:   "#60a5fa",
  Low:      "#94a3b8",
};

export default function ProjectsWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const rawP = localStorage.getItem(PROJECTS_KEY);
      if (rawP) {
        const parsed = JSON.parse(rawP) as Project[];
        if (Array.isArray(parsed)) setProjects(parsed);
      }
      const rawT = localStorage.getItem(TASKS_KEY);
      if (rawT) {
        const parsed = JSON.parse(rawT) as ProjectTask[];
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const active = projects.filter((p) => p.status === "Active");
  const openTasks = tasks.filter((t) => t.status !== "Done");
  const criticalHighTasks = openTasks.filter(
    (t) => t.priority === "Critical" || t.priority === "High"
  );

  // Top 3 active projects by most recently updated
  const topProjects = [...active]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  // Active projects that have next_action set
  const nextActions = active
    .filter((p) => p.next_action)
    .sort((a, b) => {
      const pa = ["Critical", "High", "Medium", "Low"].indexOf(a.priority);
      const pb = ["Critical", "High", "Medium", "Low"].indexOf(b.priority);
      return pa - pb;
    })
    .slice(0, 3);

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-0.5">
            Projects
          </p>
          <p className="text-xs text-white/25">Active work and next actions</p>
        </div>
        <Link
          href="/projects"
          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "rgba(165,180,252,0.8)",
          }}
        >
          View All →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active", value: active.length, color: "#10b981" },
          { label: "Open Tasks", value: openTasks.length, color: "#60a5fa" },
          { label: "High Priority", value: criticalHighTasks.length, color: "#f59e0b" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p
              className="text-2xl font-bold tracking-tight tabular-nums mb-0.5"
              style={{ color: stat.value > 0 ? stat.color : "rgba(255,255,255,0.2)" }}
            >
              {stat.value}
            </p>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.15em]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Next Actions */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2.5">
            Next Actions
          </p>
          <div className="flex flex-col gap-1.5">
            {nextActions.length === 0 && (
              <p className="text-xs text-white/15">No active next actions.</p>
            )}
            {nextActions.map((p) => (
              <Link
                key={p.id}
                href="/projects"
                className="flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all group"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: PRIORITY_DOT[p.priority] ?? "#94a3b8" }}
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-white/35 mb-0.5 truncate">{p.title}</p>
                  <p className="text-xs text-white/60 leading-snug line-clamp-1">{p.next_action}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2.5">
            Active Projects
          </p>
          <div className="flex flex-col gap-1.5">
            {topProjects.length === 0 && (
              <p className="text-xs text-white/15">No active projects.</p>
            )}
            {topProjects.map((p) => (
              <Link
                key={p.id}
                href="/projects"
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all group"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      p.priority === "Critical" ? "#ef4444" :
                      p.priority === "High" ? "#f59e0b" : "#60a5fa",
                    boxShadow: p.priority === "Critical" ? "0 0 5px rgba(239,68,68,0.6)" : "none",
                  }}
                />
                <span className="text-xs text-white/55 truncate flex-1">{p.title}</span>
                <span className="text-[9px] text-white/15 shrink-0">
                  {p.priority === "Critical" && (
                    <span style={{ color: "rgba(239,68,68,0.6)" }}>Critical</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
