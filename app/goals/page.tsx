"use client";

/**
 * app/goals/page.tsx
 *
 * Goal Decomposition — Sovereign OS v6.1
 *
 * Expands each strategic objective into milestones, tasks, content,
 * follow-ups, and opportunities. All suggestions are convertible in-page.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeGoalDecomposition } from "@/lib/goalDecomposition/engine";
import type { DecomposedGoal, GoalMilestone, SuggestedTask, SuggestedContent, SuggestedFollowUp, SuggestedOpportunity } from "@/lib/goalDecomposition/engine";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import { createOpportunity } from "@/lib/opportunities/store";
import { getActiveWorkspaceId } from "@/lib/workspaces/activeWorkspace";
import { updatePerson } from "@/lib/relationships/store";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";
import { safeStringArray } from "@/lib/utils/arrays";

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

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-2.5">
      {children}
    </p>
  );
}

const HORIZON_META = {
  "30d": { label: "30 Days", color: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.2)" },
  "60d": { label: "60 Days", color: "rgba(245,158,11,0.85)",  bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
  "90d": { label: "90 Days", color: "rgba(165,180,252,0.85)", bg: "rgba(99,102,241,0.06)",  border: "rgba(99,102,241,0.2)" },
};

type ConversionState = "idle" | "done" | "error";

function ConvertButton({
  label,
  onConvert,
}: {
  label: string;
  onConvert: () => boolean;
}) {
  const [state, setState] = useState<ConversionState>("idle");

  function handleClick() {
    const ok = onConvert();
    setState(ok ? "done" : "error");
    if (ok) setTimeout(() => setState("idle"), 2500);
  }

  if (state === "done") {
    return (
      <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: "rgba(52,211,153,0.85)", background: "rgba(52,211,153,0.08)" }}>
        ✓ Added
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.06)" }}>
        Error
      </span>
    );
  }
  return (
    <button
      onClick={handleClick}
      className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.22)", color: "rgba(165,180,252,0.8)" }}
    >
      {label}
    </button>
  );
}

// ── Milestone Timeline ─────────────────────────────────────────────────────

function MilestoneRow({ ms }: { ms: GoalMilestone }) {
  const meta = HORIZON_META[ms.timeframe];
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span
        className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
        style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
      >
        {meta.label}
      </span>
      <div>
        <p className="text-xs font-semibold text-white/80 leading-snug">{ms.title}</p>
        <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{ms.description}</p>
      </div>
    </div>
  );
}

// ── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  index,
  projects,
}: {
  goal: DecomposedGoal;
  index: number;
  projects: Project[];
}) {
  const [open, setOpen] = useState(index === 0);
  const [taskProjectMap, setTaskProjectMap] = useState<Record<string, string>>({});
  const [savedMemory, setSavedMemory] = useState(false);

  // ── Conversions ──────────────────────────────────────────────────────────

  function addTask(task: SuggestedTask): boolean {
    try {
      const projectId = taskProjectMap[task.id] ?? task.suggestedProjectId;
      if (!projectId) return false;
      const existing = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
      const now = new Date().toISOString();
      const newTask: ProjectTask = {
        id:         crypto.randomUUID(),
        project_id: projectId,
        title:      task.title,
        status:     "Todo",
        priority:   task.priority,
        due_date:   "",
        notes:      task.rationale,
        created_at: now,
        updated_at: now,
      };
      safeWrite(KEYS.PROJECT_TASKS, [...existing, newTask]);
      return true;
    } catch { return false; }
  }

  function addContent(item: SuggestedContent): boolean {
    try {
      const existing = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
      const now = new Date().toISOString();
      const newItem: ContentItem = {
        id:                 crypto.randomUUID(),
        title:              item.title,
        status:             "Idea",
        platforms:          item.platforms,
        priority:           item.priority,
        format:             item.format,
        description:        item.angle,
        notes:              `Suggested by Goal Decomposition for: "${goal.objectiveTitle}"`,
        related_project_id: goal.existingRelatedProjects[0]?.id ?? "",
        publish_date:       "",
        workspace_id:       getActiveWorkspaceId(),
        created_at:         now,
        updated_at:         now,
      };
      safeWrite(KEYS.CONTENT_ITEMS, [...existing, newItem]);
      return true;
    } catch { return false; }
  }

  function scheduleFollowUp(fu: SuggestedFollowUp): boolean {
    try {
      if (fu.personId) {
        updatePerson(fu.personId, {
          next_follow_up_at: fu.followUpDate,
          status: "Follow Up",
        });
        return true;
      }
      // No existing person — save as memory instead
      const existing = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
      const now = new Date().toISOString();
      const mem: MemoryItem = {
        id:                crypto.randomUUID(),
        title:             `Follow up: ${fu.personName}`,
        content:           `${fu.reason}\n\nAction: ${fu.action}\nFollow-up date: ${fu.followUpDate}`,
        type:              "Person",
        tags:              ["follow-up", "goal-decomposition"],
        relatedProjectIds: goal.existingRelatedProjects.map((p) => p.id),
        relatedPeople:     [fu.personName],
        importance:        "High",
        source:            "AI",
        createdAt:         now,
        updatedAt:         now,
      };
      safeWrite(KEYS.MEMORY_ITEMS, [...existing, mem]);
      return true;
    } catch { return false; }
  }

  function trackOpportunity(opp: SuggestedOpportunity): boolean {
    try {
      createOpportunity({
        title:            opp.title,
        description:      opp.description,
        type:             opp.type,
        status:           "Detected",
        suggested_action: opp.suggestedAction,
        related_people:   [],
        related_project_ids: goal.existingRelatedProjects.map((p) => p.id),
        related_memory_ids:  [],
        source:           "detected",
        conversion:       null,
        notes:            `Generated by Goal Decomposition for: "${goal.objectiveTitle}"`,
      });
      return true;
    } catch { return false; }
  }

  function saveToMemory(): void {
    try {
      const existing = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
      const now = new Date().toISOString();
      const lines = [
        `Strategic Objective: ${goal.objectiveTitle}`,
        `Why it matters: ${goal.objectiveWhy}`,
        "",
        "Milestones:",
        ...goal.milestones.map((m) => `  [${m.timeframe}] ${m.title}`),
        "",
        "Suggested Tasks:",
        ...goal.suggestedTasks.slice(0, 4).map((t) => `  • ${t.title}`),
        "",
        "Suggested Content:",
        ...goal.suggestedContent.slice(0, 2).map((c) => `  • ${c.title}`),
        "",
        "Suggested Opportunities:",
        ...goal.suggestedOpportunities.slice(0, 2).map((o) => `  • ${o.title}`),
      ];
      const mem: MemoryItem = {
        id:                crypto.randomUUID(),
        title:             `Goal Plan: ${goal.objectiveTitle}`,
        content:           lines.join("\n"),
        type:              "Project Context",
        tags:              ["goal-decomposition", "strategy"],
        relatedProjectIds: goal.existingRelatedProjects.map((p) => p.id),
        relatedPeople:     [],
        importance:        "High",
        source:            "AI",
        createdAt:         now,
        updatedAt:         now,
      };
      safeWrite(KEYS.MEMORY_ITEMS, [...existing, mem]);
      setSavedMemory(true);
      setTimeout(() => setSavedMemory(false), 3000);
    } catch { /* ignore */ }
  }

  const activeProjects = projects.filter((p) => p.status !== "Archived");

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/[0.01]"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.05)" : "none" }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "rgba(99,102,241,0.1)", color: "rgba(165,180,252,0.7)" }}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-white/85">{goal.objectiveTitle}</p>
          </div>
          <p className="text-[10px] text-white/35 leading-relaxed line-clamp-1">{goal.objectiveWhy}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {goal.existingRelatedProjects.length > 0 && (
            <span className="text-[9px] text-white/25">{goal.existingRelatedProjects[0].title}</span>
          )}
          <span
            className="text-[9px] font-bold tabular-nums px-2 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.08)", color: "rgba(165,180,252,0.6)" }}
          >
            {goal.suggestedTasks.length + goal.suggestedContent.length + goal.suggestedOpportunities.length} actions
          </span>
          <svg
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            className="w-4 h-4 text-white/25 shrink-0 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-white/[0.04]">

          {/* Milestones */}
          <div className="px-5 py-4">
            <SectionLabel>Milestones</SectionLabel>
            <div className="divide-y divide-white/[0.04]">
              {goal.milestones.map((ms) => (
                <MilestoneRow key={ms.id} ms={ms} />
              ))}
            </div>
          </div>

          {/* Suggested Tasks */}
          {goal.suggestedTasks.length > 0 && (
            <div className="px-5 py-4">
              <SectionLabel>Suggested Tasks ({goal.suggestedTasks.length})</SectionLabel>
              <div className="space-y-2.5">
                {goal.suggestedTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/75 leading-snug">{task.title}</p>
                      {/* Project picker */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9px] text-white/25">Project:</span>
                        <select
                          value={taskProjectMap[task.id] ?? task.suggestedProjectId}
                          onChange={(e) => setTaskProjectMap((m) => ({ ...m, [task.id]: e.target.value }))}
                          className="text-[9px] text-white/45 bg-transparent outline-none cursor-pointer"
                          style={{ fontSize: "9px" }}
                        >
                          {task.suggestedProjectId === "" && (
                            <option value="">— pick project —</option>
                          )}
                          {activeProjects.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <ConvertButton label="Add Task" onConvert={() => addTask(task)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Content */}
          {goal.suggestedContent.length > 0 && (
            <div className="px-5 py-4">
              <SectionLabel>Suggested Content ({goal.suggestedContent.length})</SectionLabel>
              <div className="space-y-2.5">
                {goal.suggestedContent.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/75 leading-snug">{item.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {item.format} · {safeStringArray(item.platforms).join(", ")}
                      </p>
                      <p className="text-[9px] text-white/20 mt-0.5 italic leading-relaxed">{item.angle}</p>
                    </div>
                    <ConvertButton label="Add Content" onConvert={() => addContent(item)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Follow-Ups */}
          {goal.suggestedFollowUps.length > 0 && (
            <div className="px-5 py-4">
              <SectionLabel>Suggested Follow-Ups ({goal.suggestedFollowUps.length})</SectionLabel>
              <div className="space-y-2.5">
                {goal.suggestedFollowUps.map((fu) => (
                  <div key={fu.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/75 leading-snug">{fu.personName}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{fu.reason}</p>
                      <p className="text-[9px] text-white/45 mt-0.5">→ {fu.action}</p>
                    </div>
                    <ConvertButton
                      label={fu.personId ? "Schedule" : "Save Note"}
                      onConvert={() => scheduleFollowUp(fu)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Opportunities */}
          {goal.suggestedOpportunities.length > 0 && (
            <div className="px-5 py-4">
              <SectionLabel>Suggested Opportunities ({goal.suggestedOpportunities.length})</SectionLabel>
              <div className="space-y-2.5">
                {goal.suggestedOpportunities.map((opp) => (
                  <div key={opp.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white/75 leading-snug">{opp.title}</p>
                        <span
                          className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: "rgba(245,158,11,0.08)", color: "rgba(245,158,11,0.7)", border: "1px solid rgba(245,158,11,0.18)" }}
                        >
                          {opp.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 leading-relaxed">{opp.description}</p>
                      <p className="text-[9px] text-white/40 mt-0.5">→ {opp.suggestedAction}</p>
                    </div>
                    <ConvertButton label="Track" onConvert={() => trackOpportunity(opp)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Save to Memory */}
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-[9px] text-white/20">Save this goal plan as a memory for AI context</p>
            {savedMemory ? (
              <span className="text-[9px] font-bold" style={{ color: "rgba(52,211,153,0.8)" }}>
                ✓ Saved to memory
              </span>
            ) : (
              <button
                onClick={saveToMemory}
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
              >
                Save to Memory
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals,   setGoals]   = useState<DecomposedGoal[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [totals,  setTotals]  = useState({ tasks: 0, content: 0, followUps: 0, opps: 0 });
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const proj         = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems  = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const contentItems = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const habits       = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog     = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});
    const dailyItems   = safeRead<PlannerItem[]>(KEYS.PLANNER_DAILY, []);
    const weeklyItems  = safeRead<PlannerItem[]>(KEYS.PLANNER_WEEKLY, []);
    const monthlyItems = safeRead<string[]>(KEYS.PLANNER_MONTHLY, []);
    const focusSessions = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);
    const people       = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const opps         = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const visionData   = {
      yr1: safeRead<string[]>(KEYS.PLANNER_1YR, []),
      yr3: safeRead<string[]>(KEYS.PLANNER_3YR, []),
      yr5: safeRead<string[]>(KEYS.PLANNER_5YR, []),
    };

    const focusSessNorm = focusSessions.map((s: FocusSession) => ({
      date:        s.startedAt?.slice(0, 10) ?? todayStr,
      completedAt: s.endedAt,
      abandoned:   s.status === "Abandoned",
    }));

    const graph        = computeKnowledgeGraph({ people, projects: proj, opportunities: opps, contentItems, memoryItems });
    const dailyBriefing = computeDailyBriefing({ todayStr, projects: proj, projectTasks, memoryItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog });
    const focusEngine  = computeFocusEngine({ todayStr, projects: proj, projectTasks, memoryItems, contentItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog, visionData, dailyBriefing });
    const actionResult = computeActionEngine({ graphInsights: graph.insights, opportunities: opps, people, projects: proj, projectTasks, contentItems, todayStr });

    const chiefBrief = computeChiefOfStaffBrief({
      todayStr, projects: proj, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing,
      people, graphInsights: graph.insights,
      topAction: actionResult.actions[0],
      focusSessions: focusSessNorm,
    });

    const strategicPlan = computeStrategicPlan({
      todayStr, visionData, projects: proj, projectTasks, opportunities: opps,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief, actionResult,
    });

    const result = computeGoalDecomposition({
      todayStr,
      strategicPlan,
      projects: proj,
      projectTasks,
      contentItems,
      opportunities: opps,
      people,
      memoryItems,
    });

    setGoals(result.decomposedGoals);
    setTotals({
      tasks:     result.totalSuggestedTasks,
      content:   result.totalSuggestedContent,
      followUps: result.totalSuggestedFollowUps,
      opps:      result.totalSuggestedOpportunities,
    });
    setProjects(proj);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-white/20 text-sm animate-pulse">
        Decomposing goals…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 50% 30%, rgba(139,92,246,0.16) 0%, transparent 70%)" }}
        />
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] relative mb-4" style={{ color: "rgba(139,92,246,0.55)" }}>
          Sovereign OS · Goal Decomposition
        </p>
        <h1
          className="font-bold tracking-tight leading-tight mb-3 relative"
          style={{
            fontSize: "clamp(22px, 4vw, 36px)",
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Goal Decomposition
        </h1>
        <p className="text-sm text-white/25 max-w-md mx-auto leading-relaxed relative">
          Strategic objectives → milestones, tasks, content, follow-ups, and opportunities.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 mt-6 relative flex-wrap">
          {[
            { label: "Objectives",   value: goals.length },
            { label: "Tasks",        value: totals.tasks },
            { label: "Content",      value: totals.content },
            { label: "Follow-ups",   value: totals.followUps },
            { label: "Opportunities", value: totals.opps },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl font-bold text-white/90 tabular-nums">{s.value}</span>
              <span className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <Link
            href="/strategy"
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
          >
            ← Strategy
          </Link>
          <Link
            href="/actions"
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.7)" }}
          >
            View Actions →
          </Link>
        </div>
      </section>

      {/* ── Goals List ────────────────────────────────────────────────── */}
      {goals.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-10 text-center"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-sm text-white/30 mb-3">No strategic objectives to decompose.</p>
          <p className="text-xs text-white/20 leading-relaxed max-w-sm mx-auto">
            Add active projects and set your 1-year vision in{" "}
            <Link href="/planner" className="underline underline-offset-2">
              /planner
            </Link>{" "}
            to generate strategic objectives.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => (
            <GoalCard
              key={goal.objectiveId}
              goal={goal}
              index={i}
              projects={projects}
            />
          ))}
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}
