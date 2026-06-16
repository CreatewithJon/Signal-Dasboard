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

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return `${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

  // Overdue detection
  const overdueProjects = active.filter(
    (p) => getDueDateState(p.due_date, false) === "overdue"
  );
  const overdueTasks = openTasks.filter(
    (t) => getDueDateState(t.due_date, false) === "overdue"
  );
  const urgentProjects = active.filter(
    (p) => getDueDateState(p.due_date, false) === "urgent"
  );
  const hasUrgency = overdueProjects.length > 0 || overdueTasks.length > 0 || urgentProjects.length > 0;

  // Top active projects by most recently updated
  const topProjects = [...active]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  // Next actions sorted by priority
  const nextActions = active
    .filter((p) => p.next_action)
    .sort((a, b) => {
      const order = ["Critical", "High", "Medium", "Low"];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    })
    .slice(0, 3);

  const totalOpenTasks = openTasks.length;
  const criticalHighTasks = openTasks.filter(
    (t) => t.priority === "Critical" || t.priority === "High"
  ).length;

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-0.5">Projects</p>
          <p className="text-xs text-white/25">Active work and next actions</p>
        </div>
        <Link
          href="/projects"
          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}
        >
          View All →
        </Link>
      </div>

      {/* Overdue alert */}
      {hasUrgency && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[10px] font-semibold"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)", color: "rgba(239,68,68,0.8)" }}
        >
          ⚠
          <span>
            {[
              overdueProjects.length > 0 ? `${overdueProjects.length} project${overdueProjects.length !== 1 ? "s" : ""} overdue` : "",
              overdueTasks.length > 0 ? `${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} overdue` : "",
              urgentProjects.length > 0 && overdueProjects.length === 0 ? `${urgentProjects.length} due soon` : "",
            ].filter(Boolean).join(" · ")}
          </span>
          <Link href="/projects" className="ml-auto underline underline-offset-2 opacity-70 hover:opacity-100">
            Review →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active", value: active.length, color: "#10b981" },
          { label: "Open Tasks", value: totalOpenTasks, color: "#60a5fa" },
          {
            label: overdueProjects.length + overdueTasks.length > 0 ? "Overdue" : "High Priority",
            value: overdueProjects.length + overdueTasks.length > 0
              ? overdueProjects.length + overdueTasks.length
              : criticalHighTasks,
            color: overdueProjects.length + overdueTasks.length > 0 ? "#ef4444" : "#f59e0b",
          },
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2.5">Next Actions</p>
          <div className="flex flex-col gap-1.5">
            {nextActions.length === 0 && <p className="text-xs text-white/15">No active next actions.</p>}
            {nextActions.map((p) => {
              const isOverdue = getDueDateState(p.due_date, false) === "overdue";
              const isUrgent = getDueDateState(p.due_date, false) === "urgent";
              return (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: isOverdue ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: isOverdue ? "1px solid rgba(239,68,68,0.1)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: PRIORITY_DOT[p.priority] ?? "#94a3b8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] text-white/35 truncate">{p.title}</p>
                      {isOverdue && <span className="text-[9px] font-bold shrink-0" style={{ color: "#ef4444" }}>⚠ {formatDueDate(p.due_date)}</span>}
                      {isUrgent && !isOverdue && <span className="text-[9px] font-semibold shrink-0" style={{ color: "rgba(245,158,11,0.7)" }}>{formatDueDate(p.due_date)}</span>}
                    </div>
                    <p className="text-xs text-white/60 leading-snug line-clamp-1">{p.next_action}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Active Projects */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2.5">Active Projects</p>
          <div className="flex flex-col gap-1.5">
            {topProjects.length === 0 && <p className="text-xs text-white/15">No active projects.</p>}
            {topProjects.map((p) => {
              const projectTasks = tasks.filter((t) => t.project_id === p.id);
              const doneTasks = projectTasks.filter((t) => t.status === "Done").length;
              const pct = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : -1;
              const isOverdue = getDueDateState(p.due_date, false) === "overdue";

              return (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: isOverdue ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: isOverdue ? "1px solid rgba(239,68,68,0.1)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: p.priority === "Critical" ? "#ef4444" : p.priority === "High" ? "#f59e0b" : "#60a5fa",
                      boxShadow: p.priority === "Critical" ? "0 0 5px rgba(239,68,68,0.5)" : "none",
                    }}
                  />
                  <span className="text-xs text-white/55 truncate flex-1">{p.title}</span>
                  {pct >= 0 && (
                    <span className="text-[9px] text-white/20 shrink-0">{pct}%</span>
                  )}
                  {isOverdue && (
                    <span className="text-[9px] font-bold shrink-0" style={{ color: "rgba(239,68,68,0.7)" }}>⚠</span>
                  )}
                  {p.priority === "Critical" && !isOverdue && (
                    <span className="text-[9px] font-semibold shrink-0" style={{ color: "rgba(239,68,68,0.6)" }}>Critical</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
