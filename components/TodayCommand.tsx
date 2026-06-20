"use client";

/**
 * components/TodayCommand.tsx
 *
 * "Today's Command" Hero — Sovereign OS v6.3
 *
 * Compact executive summary at the top of the Command Center.
 * Shows: highest leverage action, biggest risk, top strategic objective,
 * active/last focus session, and a primary CTA.
 * All data computed deterministically from localStorage — no AI calls.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { getActiveWorkspaceId } from "@/lib/workspaces/activeWorkspace";
import type { Workspace } from "@/lib/types/workspace";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { ChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const RISK_COLOR: Record<string, string> = {
  critical: "rgba(239,68,68,0.85)",
  high:     "rgba(245,158,11,0.85)",
  medium:   "rgba(167,139,250,0.7)",
};

interface CommandData {
  brief:         ChiefOfStaffBrief;
  topObjective:  string;
  activeSession: FocusSession | null;
  todayStr:      string;
}

export default function TodayCommand() {
  const [data,      setData]      = useState<CommandData | null>(null);
  const [loaded,    setLoaded]    = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Resolve active workspace for the header label
    const activeWsId = getActiveWorkspaceId();
    const allWorkspaces = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const activeWs = activeWsId === "all"
      ? { ...DEFAULT_WORKSPACE, id: "all", name: "All Workspaces", color: "#64748b" }
      : (allWorkspaces.find((w) => w.id === activeWsId) ?? DEFAULT_WORKSPACE);
    setWorkspace(activeWs);

    const todayStr     = new Date().toISOString().slice(0, 10);
    const projects     = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const contentItems = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const opps         = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const people       = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const memoryItems  = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const focusSessions = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);
    const habits       = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog     = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});
    const dailyItems   = safeRead<PlannerItem[]>(KEYS.PLANNER_DAILY, []);
    const weeklyItems  = safeRead<PlannerItem[]>(KEYS.PLANNER_WEEKLY, []);
    const monthlyItems = safeRead<string[]>(KEYS.PLANNER_MONTHLY, []);
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

    const graph         = computeKnowledgeGraph({ people, projects, opportunities: opps, contentItems, memoryItems });
    const dailyBriefing = computeDailyBriefing({ todayStr, projects, projectTasks, memoryItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog });
    const focusEngine   = computeFocusEngine({ todayStr, projects, projectTasks, memoryItems, contentItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog, visionData, dailyBriefing });
    const actionResult  = computeActionEngine({ graphInsights: graph.insights, opportunities: opps, people, projects, projectTasks, contentItems, todayStr });

    const brief = computeChiefOfStaffBrief({
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing, people,
      graphInsights: graph.insights, topAction: actionResult.actions[0],
      focusSessions: focusSessNorm,
    });

    const strategic = computeStrategicPlan({
      todayStr, visionData, projects, projectTasks, opportunities: opps,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief: brief, actionResult,
    });

    // Find active focus session (Active status or most recent today)
    const activeSession =
      focusSessions.find((s) => s.status === "Active") ??
      focusSessions
        .filter((s) => s.startedAt?.slice(0, 10) === todayStr)
        .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0] ??
      null;

    setData({
      brief,
      topObjective: strategic.topObjectives[0]?.title ?? "",
      activeSession,
      todayStr,
    });
    setLoaded(true);
  }, []);

  // Format date: "Thursday, June 19"
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (!loaded) {
    return (
      <div
        className="rounded-2xl animate-pulse mb-8"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)", height: 200 }}
      />
    );
  }

  if (!data) return null;

  const { brief, topObjective, activeSession } = data;
  const riskColor = RISK_COLOR[brief.biggestRisk.severity] ?? RISK_COLOR.medium;
  const momentumColor =
    brief.weeklyMomentum.score >= 70 ? "rgba(52,211,153,0.85)" :
    brief.weeklyMomentum.score >= 45 ? "rgba(245,158,11,0.85)" :
    "rgba(239,68,68,0.75)";

  const hasActive = activeSession?.status === "Active";

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{
        background: "rgba(255,255,255,0.012)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Header bar */}
      <div
        className="px-5 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "rgba(52,211,153,0.85)", boxShadow: "0 0 6px rgba(52,211,153,0.5)" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Command Center
          </span>
          {workspace && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: `${workspace.color}18`,
                color: `${workspace.color}cc`,
                border: `1px solid ${workspace.color}28`,
              }}
            >
              {workspace.name}
            </span>
          )}
          <span className="text-[9px] text-white/20">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
            style={{ background: `${momentumColor.replace("0.85", "0.08").replace("0.75", "0.08")}`, color: momentumColor }}
          >
            Momentum {brief.weeklyMomentum.score}/100
          </span>
        </div>
      </div>

      {/* 2×2 command grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.05]">

        {/* Cell 1 — Highest Leverage Action */}
        <div className="px-4 py-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(99,102,241,0.6)" }}>
            ⚡ Top Action
          </p>
          <p className="text-xs font-semibold text-white/82 leading-snug line-clamp-2">
            {brief.highestLeverageAction.title}
          </p>
          {brief.highestLeverageAction.relatedProject && (
            <p className="text-[9px] text-white/25 mt-1">{brief.highestLeverageAction.relatedProject}</p>
          )}
        </div>

        {/* Cell 2 — Biggest Risk */}
        <div className="px-4 py-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: riskColor.replace("0.85", "0.6").replace("0.7", "0.55") }}>
            ⚠ Risk
          </p>
          <div className="flex items-start gap-2">
            <span
              className="text-[7px] font-bold uppercase tracking-wide px-1 py-0.5 rounded shrink-0 mt-0.5"
              style={{ color: riskColor, background: riskColor.replace("0.85", "0.08").replace("0.7", "0.08") }}
            >
              {brief.biggestRisk.severity}
            </span>
            <p className="text-xs text-white/60 leading-snug line-clamp-2">
              {brief.biggestRisk.title}
            </p>
          </div>
        </div>

        {/* Cell 3 — Top Strategic Objective */}
        <div className="px-4 py-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(245,158,11,0.55)" }}>
            🎯 Top Objective
          </p>
          {topObjective ? (
            <p className="text-xs font-semibold text-white/75 leading-snug line-clamp-2">
              {topObjective}
            </p>
          ) : (
            <p className="text-[10px] text-white/25 leading-relaxed">
              No objectives set —{" "}
              <Link href="/planner" className="underline underline-offset-2">set your vision</Link>
            </p>
          )}
        </div>

        {/* Cell 4 — Focus Session */}
        <div className="px-4 py-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(52,211,153,0.55)" }}>
            ⏱ Focus
          </p>
          {hasActive ? (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
                <p className="text-[10px] font-bold text-white/75">Session active</p>
              </div>
              <p className="text-[9px] text-white/35 line-clamp-1">{activeSession?.title ?? ""}</p>
            </div>
          ) : activeSession ? (
            <div>
              <p className="text-[10px] text-white/50">Last: {activeSession.title}</p>
              <p className="text-[9px] text-white/25 mt-0.5">
                {activeSession.actualMinutes ?? activeSession.plannedMinutes ?? 0} min · {activeSession.status}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-white/25 leading-relaxed">No sessions today</p>
          )}
        </div>
      </div>

      {/* CTA row */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.008)" }}
      >
        <p className="text-[9px] text-white/20 hidden sm:block">
          {brief.executiveSummary.slice(0, 90)}{brief.executiveSummary.length > 90 ? "…" : ""}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/review"
            className="text-[9px] font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
          >
            Review Week
          </Link>
          <Link
            href={hasActive ? "/focus" : "/daily"}
            className="text-[9px] font-bold px-3.5 py-1.5 rounded-xl transition-all"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}
          >
            {hasActive ? "Continue Focus →" : "Start Day →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
