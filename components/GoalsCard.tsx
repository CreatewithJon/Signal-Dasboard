"use client";

/**
 * components/GoalsCard.tsx
 *
 * Homepage widget for Goal Decomposition Engine — Sovereign OS v6.1
 * Shows: top objective, next milestone, total suggested actions count.
 * Links to /goals.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeGoalDecomposition } from "@/lib/goalDecomposition/engine";
import type { DecompositionResult } from "@/lib/goalDecomposition/engine";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Person } from "@/lib/types/relationships";
import type { Opportunity } from "@/lib/types/opportunities";
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

const HORIZON_COLORS = {
  "30d": "rgba(52,211,153,0.85)",
  "60d": "rgba(245,158,11,0.85)",
  "90d": "rgba(165,180,252,0.85)",
};

const HORIZON_LABELS = { "30d": "30 Days", "60d": "60 Days", "90d": "90 Days" };

export default function GoalsCard() {
  const [result,  setResult]  = useState<DecompositionResult | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const projects     = safeRead<Project[]>(KEYS.PROJECTS, []);
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

    const graph         = computeKnowledgeGraph({ people, projects, opportunities: opps, contentItems, memoryItems });
    const dailyBriefing = computeDailyBriefing({ todayStr, projects, projectTasks, memoryItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog });
    const focusEngine   = computeFocusEngine({ todayStr, projects, projectTasks, memoryItems, contentItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog, visionData, dailyBriefing });
    const actionResult  = computeActionEngine({ graphInsights: graph.insights, opportunities: opps, people, projects, projectTasks, contentItems, todayStr });

    const chiefBrief = computeChiefOfStaffBrief({
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing,
      people, graphInsights: graph.insights,
      topAction:     actionResult.actions[0],
      focusSessions: focusSessNorm,
    });

    const strategicPlan = computeStrategicPlan({
      todayStr, visionData, projects, projectTasks, opportunities: opps,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief, actionResult,
    });

    const decomp = computeGoalDecomposition({
      todayStr,
      strategicPlan,
      projects,
      projectTasks,
      contentItems,
      opportunities: opps,
      people,
      memoryItems,
    });

    setResult(decomp);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)", height: 130 }}
      />
    );
  }

  if (!result || result.decomposedGoals.length === 0) return null;

  const topGoal = result.decomposedGoals[0];
  const nextMs  = topGoal.milestones[0];
  const totalActions =
    result.totalSuggestedTasks +
    result.totalSuggestedContent +
    result.totalSuggestedOpportunities;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border:     "1px solid rgba(139,92,246,0.14)",
        background: "rgba(139,92,246,0.018)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M3 8h10M8 3v10" stroke="rgba(167,139,250,0.85)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="8" r="6" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Goal Decomposition</p>
            <p className="text-[9px] text-white/25 mt-0.5">Objectives → milestones + actions</p>
          </div>
        </div>
        <Link
          href="/goals"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.7)" }}
        >
          View goals →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Top Objective */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-1">
            Top Objective
          </p>
          <p className="text-xs font-semibold text-white/80 leading-snug line-clamp-2">
            {topGoal.objectiveTitle}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

        {/* Next Milestone */}
        {nextMs && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-1">
              Next Milestone
            </p>
            <div className="flex items-start gap-2">
              <span
                className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{
                  color:       HORIZON_COLORS[nextMs.timeframe],
                  background:  `${HORIZON_COLORS[nextMs.timeframe].replace("0.85", "0.08")}`,
                  border:      `1px solid ${HORIZON_COLORS[nextMs.timeframe].replace("0.85", "0.2")}`,
                }}
              >
                {HORIZON_LABELS[nextMs.timeframe]}
              </span>
              <p className="text-[10px] text-white/55 leading-relaxed line-clamp-2">{nextMs.title}</p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

        {/* Action count */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/35">Suggested actions across {result.decomposedGoals.length} objective{result.decomposedGoals.length !== 1 ? "s" : ""}</p>
          <span
            className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-lg"
            style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.85)" }}
          >
            {totalActions}
          </span>
        </div>
      </div>
    </div>
  );
}
