"use client";

/**
 * components/WeeklyReviewCard.tsx
 *
 * Homepage widget for Weekly Review Engine — Sovereign OS v6.2
 * Shows: completed count, slipped count, focus minutes, next week top focus.
 * Links to /review.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeWeeklyReview } from "@/lib/weeklyReview/engine";
import type { WeeklyReview } from "@/lib/weeklyReview/engine";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
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

export default function WeeklyReviewCard() {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

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
    const chiefBrief    = computeChiefOfStaffBrief({
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing, people,
      graphInsights: graph.insights, topAction: actionResult.actions[0],
      focusSessions: focusSessNorm,
    });
    const strategicPlan = computeStrategicPlan({
      todayStr, visionData, projects, projectTasks, opportunities: opps,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief, actionResult,
    });

    const result = computeWeeklyReview({
      todayStr, projects, projectTasks, contentItems,
      opportunities: opps, people, memoryItems,
      focusSessions, habits, habitLog, strategicPlan, actionResult,
    });

    setReview(result);
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

  if (!review) return null;

  const alignColor =
    review.strategicAlignment.score >= 75 ? "rgba(52,211,153,0.8)"  :
    review.strategicAlignment.score >= 45 ? "rgba(245,158,11,0.8)"  :
    "rgba(239,68,68,0.75)";

  const topFocus = review.nextWeekFocus[0];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border:     "1px solid rgba(52,211,153,0.12)",
        background: "rgba(52,211,153,0.012)",
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
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="1.4" className="w-3.5 h-3.5">
              <rect x="2" y="3" width="12" height="10" rx="1.5" />
              <path d="M2 6h12" strokeLinecap="round" />
              <path d="M5 9.5l2 1.5 4-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Weekly Review</p>
            <p className="text-[9px] text-white/25 mt-0.5">{review.weekStart} → {review.weekEnd}</p>
          </div>
        </div>
        <Link
          href="/review"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "rgba(52,211,153,0.7)" }}
        >
          Full review →
        </Link>
      </div>

      {/* Stats row */}
      <div className="px-4 py-3 grid grid-cols-4 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { label: "Done",      value: review.completedWork.length, color: "rgba(52,211,153,0.85)"  },
          { label: "Slipped",   value: review.slippedItems.length,  color: review.slippedItems.length > 0 ? "rgba(245,158,11,0.85)" : "rgba(52,211,153,0.7)" },
          { label: "Focus min", value: review.focusStats.totalMinutes, color: "rgba(99,102,241,0.8)" },
          { label: "Aligned",   value: `${review.strategicAlignment.score}%`, color: alignColor },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[8px] text-white/25 mt-1 uppercase tracking-wide leading-none">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next week focus */}
      {topFocus && (
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/20 mb-1">
            Top focus next week
          </p>
          <p className="text-[10px] text-white/60 leading-snug line-clamp-2">{topFocus.title}</p>
          {topFocus.reason && (
            <p className="text-[9px] text-white/25 mt-0.5 leading-relaxed line-clamp-1">{topFocus.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
