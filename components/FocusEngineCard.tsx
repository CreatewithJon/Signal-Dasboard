"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeFocusEngine } from "@/lib/focus/engine";
import type { FocusEngineResult } from "@/lib/focus/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem, DailyBriefing } from "@/lib/briefing/daily";

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

const SOURCE_LABELS: Record<string, string> = {
  "overdue-task":    "Overdue",
  "overdue-project": "Overdue",
  "critical-task":   "Critical",
  "high-task":       "High",
  "content-deadline":"Content",
  "planner":         "Planner",
  "project-action":  "Project",
};

const SOURCE_COLORS: Record<string, string> = {
  "overdue-task":    "rgba(239,68,68,0.9)",
  "overdue-project": "rgba(239,68,68,0.9)",
  "critical-task":   "rgba(245,158,11,0.9)",
  "high-task":       "rgba(167,139,250,0.9)",
  "content-deadline":"rgba(239,68,68,0.85)",
  "planner":         "rgba(167,139,250,0.8)",
  "project-action":  "rgba(52,211,153,0.85)",
};

function MiniScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color, minWidth: 24, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export default function FocusEngineCard() {
  const [result, setResult] = useState<FocusEngineResult | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const projects     = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems  = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const contentItems = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const habits       = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog     = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});
    const dailyBriefing = safeRead<DailyBriefing | null>(KEYS.PLANNER_DAILY + "_briefing_cache", null);

    function parsePlannerItems(key: string): PlannerItem[] {
      const raw = safeRead<unknown>(key, []);
      if (!Array.isArray(raw)) return [];
      return raw.map((x) => {
        if (typeof x === "string") return { text: x, done: false };
        if (typeof x === "object" && x !== null) {
          const o = x as Record<string, unknown>;
          return {
            text: typeof o.text === "string" ? o.text : String(o),
            done: typeof o.done === "boolean" ? o.done : false,
          };
        }
        return { text: String(x), done: false };
      });
    }

    const dailyItems   = parsePlannerItems(KEYS.PLANNER_DAILY);
    const weeklyItems  = parsePlannerItems(KEYS.PLANNER_WEEKLY);
    const monthlyItems = safeRead<string[]>(KEYS.PLANNER_MONTHLY, []);
    const yr1 = safeRead<string[]>(KEYS.PLANNER_1YR, []);
    const yr3 = safeRead<string[]>(KEYS.PLANNER_3YR, []);
    const yr5 = safeRead<string[]>(KEYS.PLANNER_5YR, []);

    setResult(computeFocusEngine({
      todayStr,
      projects,
      projectTasks,
      memoryItems,
      contentItems,
      dailyItems,
      weeklyItems,
      monthlyItems,
      habits,
      habitLog,
      visionData: { yr1, yr3, yr5 },
      dailyBriefing,
    }));
  }, []);

  if (!result) return null;

  const top = result.topThree[0];
  const momentumColor =
    result.momentumScore >= 70
      ? "rgba(52,211,153,0.85)"
      : result.momentumScore >= 45
        ? "rgba(245,158,11,0.85)"
        : "rgba(239,68,68,0.8)";
  const alignmentColor =
    result.alignmentScore >= 70
      ? "rgba(139,92,246,0.9)"
      : result.alignmentScore >= 45
        ? "rgba(99,102,241,0.8)"
        : "rgba(255,255,255,0.3)";

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(139,92,246,0.04)",
        border: "1px solid rgba(139,92,246,0.12)",
        boxShadow: "0 0 32px rgba(139,92,246,0.05)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(139,92,246,0.18)" }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="1.5" className="w-3 h-3">
              <circle cx="10" cy="10" r="8" />
              <circle cx="10" cy="10" r="3.5" />
              <circle cx="10" cy="10" r="1" fill="rgba(167,139,250,0.9)" stroke="none" />
            </svg>
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(139,92,246,0.7)" }}
          >
            Focus Engine
          </span>
        </div>
        <Link
          href="/focus"
          className="text-[10px] font-semibold text-white/25 hover:text-white/55 transition-colors flex items-center gap-1"
        >
          Full view
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-2.5 h-2.5">
            <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Top priority */}
      {top ? (
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[8px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{
                background: `${SOURCE_COLORS[top.source]}18`,
                color: SOURCE_COLORS[top.source] ?? "rgba(255,255,255,0.6)",
                border: `1px solid ${SOURCE_COLORS[top.source] ?? "rgba(255,255,255,0.1)"}30`,
              }}
            >
              #{top.rank} · {SOURCE_LABELS[top.source] ?? top.source}
            </span>
            {top.daysOverdue !== undefined && (
              <span className="text-[8px] text-red-400">{top.daysOverdue}d overdue</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white/85 leading-snug">{top.text}</p>
          {top.projectName && (
            <p className="text-[10px] text-white/30 mt-1">{top.projectName}</p>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-4 mb-4 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-xs text-white/30">No priority tasks detected</p>
        </div>
      )}

      {/* Priority count row */}
      {result.topThree.length > 1 && (
        <div className="flex gap-2 mb-4">
          {result.topThree.slice(1).map((p, i) => (
            <div
              key={i}
              className="flex-1 rounded-lg p-2.5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[8px] font-bold text-white/25 mb-0.5">#{p.rank}</p>
              <p className="text-[10px] text-white/55 leading-snug line-clamp-2">{p.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scores */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25 w-16 shrink-0">
            Momentum
          </span>
          <MiniScoreBar value={result.momentumScore} color={momentumColor} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25 w-16 shrink-0">
            Alignment
          </span>
          <MiniScoreBar value={result.alignmentScore} color={alignmentColor} />
        </div>
      </div>
    </div>
  );
}
