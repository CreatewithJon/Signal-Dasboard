"use client";

/**
 * components/ChiefOfStaffCard.tsx
 *
 * Homepage widget for Chief of Staff Engine — Sovereign OS v5.0
 * Shows: Highest Leverage Action, Biggest Risk, Weekly Momentum score,
 * Strategic Alignment score, and a link to the /chief page.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { ChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";
import type { Person } from "@/lib/types/relationships";
import type { Opportunity } from "@/lib/types/opportunities";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-[11px] font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

const RISK_COLORS: Record<string, string> = {
  critical: "rgba(239,68,68,0.85)",
  high:     "rgba(245,158,11,0.85)",
  medium:   "rgba(167,139,250,0.7)",
};

export default function ChiefOfStaffCard() {
  const [brief,  setBrief]  = useState<ChiefOfStaffBrief | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks  = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const habits        = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog      = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});
    const dailyItems    = safeRead<PlannerItem[]>(KEYS.PLANNER_DAILY, []);
    const weeklyItems   = safeRead<PlannerItem[]>(KEYS.PLANNER_WEEKLY, []);
    const monthlyItems  = safeRead<string[]>(KEYS.PLANNER_MONTHLY, []);
    const focusSessions = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const visionData    = {
      yr1: safeRead<string[]>(KEYS.PLANNER_1YR, []),
      yr3: safeRead<string[]>(KEYS.PLANNER_3YR, []),
      yr5: safeRead<string[]>(KEYS.PLANNER_5YR, []),
    };

    const dailyBriefing = computeDailyBriefing({
      todayStr, projects, projectTasks, memoryItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
    });

    const focusEngine = computeFocusEngine({
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, dailyBriefing,
    });

    const graph = computeKnowledgeGraph({
      people, projects, opportunities, contentItems, memoryItems,
    });

    const result = computeChiefOfStaffBrief({
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing, people,
      graphInsights: graph.insights,
      focusSessions: focusSessions.map((s: FocusSession) => ({
        date:        s.startedAt?.slice(0, 10) ?? todayStr,
        completedAt: s.endedAt,
        abandoned:   s.status === "Abandoned",
      })),
    });

    setBrief(result);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl overflow-hidden animate-pulse"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.012)",
          height: 140,
        }}
      />
    );
  }

  if (!brief) return null;

  const riskColor = RISK_COLORS[brief.biggestRisk.severity] ?? RISK_COLORS.medium;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(99,102,241,0.14)",
        background: "rgba(99,102,241,0.025)",
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
            style={{ background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" fill="rgba(165,180,252,0.85)" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Chief of Staff</p>
            <p className="text-[9px] text-white/25 mt-0.5">Executive brief</p>
          </div>
        </div>
        <Link
          href="/chief"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.18)",
            color: "rgba(165,180,252,0.7)",
          }}
        >
          Full brief →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Highest Leverage Action */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-1">
            Highest Leverage Action
          </p>
          <p className="text-xs font-semibold text-white/80 leading-snug line-clamp-2">
            {brief.highestLeverageAction.title}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5 leading-relaxed line-clamp-2">
            {brief.highestLeverageAction.reason}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

        {/* Biggest Risk */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-1">
            Biggest Risk
          </p>
          <div className="flex items-start gap-2">
            <span
              className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
              style={{
                background: `${riskColor.replace("0.85", "0.08").replace("0.7", "0.08")}`,
                border: `1px solid ${riskColor.replace("0.85", "0.2").replace("0.7", "0.15")}`,
                color: riskColor,
              }}
            >
              {brief.biggestRisk.severity}
            </span>
            <p className="text-[10px] text-white/55 leading-relaxed line-clamp-2">
              {brief.biggestRisk.title}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

        {/* Scores */}
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing score={brief.weeklyMomentum.score} color="rgba(52,211,153,0.85)" />
            <p className="text-[9px] text-white/30">Momentum</p>
          </div>
          <div
            style={{ width: 1, height: 40, background: "rgba(255,255,255,0.05)" }}
          />
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing score={brief.strategicAlignment.score} color="rgba(99,102,241,0.85)" />
            <p className="text-[9px] text-white/30">Alignment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
