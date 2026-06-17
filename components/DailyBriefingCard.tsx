"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import type { DailyBriefing, PlannerItem } from "@/lib/briefing/daily";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import { KEYS } from "@/lib/keys";

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const SOURCE_COLORS: Record<string, string> = {
  overdue: "rgba(248,113,113,0.75)",
  project: "rgba(165,180,252,0.6)",
  planner: "rgba(196,181,253,0.6)",
};

export default function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const projects     = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems  = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const habits       = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog     = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});

    const rawDaily   = safeRead<{ items?: Array<{ text: string; done: boolean }> }>(KEYS.PLANNER_DAILY, {});
    const rawWeekly  = safeRead<{ items?: Array<{ text: string; done: boolean }> }>(KEYS.PLANNER_WEEKLY, {});
    const rawMonthly = safeRead<{ items?: string[] }>(KEYS.PLANNER_MONTHLY, {});

    const dailyItems:   PlannerItem[] = Array.isArray(rawDaily.items)   ? rawDaily.items   : [];
    const weeklyItems:  PlannerItem[] = Array.isArray(rawWeekly.items)  ? rawWeekly.items  : [];
    const monthlyItems: string[]      = Array.isArray(rawMonthly.items) ? rawMonthly.items : [];

    setBriefing(
      computeDailyBriefing({
        todayStr, projects, projectTasks, memoryItems,
        dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      })
    );
  }, []);

  if (!briefing) return null;

  const { headline, topPriorities, overdueItems, dueToday, habitFocus } = briefing;
  const overdueCount  = overdueItems.length;
  const habitsDone    = habitFocus.filter((h) => h.done).length;
  const habitsTotal   = habitFocus.length;
  const dueTodayCount = dueToday.length;

  return (
    <div
      className="w-full rounded-xl border p-5 flex flex-col gap-4"
      style={{
        background:   "rgba(255,255,255,0.025)",
        borderColor:  "rgba(139,92,246,0.15)",
        boxShadow:    "0 0 40px rgba(139,92,246,0.05)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3" style={{ color: "rgba(167,139,250,0.8)" }}>
              <path d="M6 1l1.2 3.5L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2L6 1z" />
            </svg>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "rgba(139,92,246,0.7)" }}
          >
            Today&apos;s Briefing
          </span>
        </div>
        <Link
          href="/briefing"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
          style={{ color: "rgba(139,92,246,0.45)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(139,92,246,0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(139,92,246,0.45)")}
        >
          Full Briefing →
        </Link>
      </div>

      {/* Headline */}
      <p className="text-sm font-medium leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>
        {headline}
      </p>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {overdueCount > 0 && (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "rgba(248,113,113,0.8)" }}
          >
            {overdueCount} overdue
          </span>
        )}
        {dueTodayCount > 0 && (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", color: "rgba(251,191,36,0.75)" }}
          >
            {dueTodayCount} due today
          </span>
        )}
        {habitsTotal > 0 && (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: habitsDone === habitsTotal ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
              border:     habitsDone === habitsTotal ? "1px solid rgba(52,211,153,0.2)"  : "1px solid rgba(255,255,255,0.07)",
              color:      habitsDone === habitsTotal ? "rgba(52,211,153,0.8)"             : "rgba(255,255,255,0.3)",
            }}
          >
            {habitsDone}/{habitsTotal} habits
          </span>
        )}
      </div>

      {/* Top 2 priorities */}
      {topPriorities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.2)" }}>
            Top Priorities
          </p>
          {topPriorities.slice(0, 2).map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.7)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-start gap-1.5">
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {p.text}
                </p>
                {p.source === "overdue" && (
                  <span
                    className="text-[8px] font-bold uppercase shrink-0 mt-0.5"
                    style={{ color: SOURCE_COLORS[p.source] }}
                  >
                    !</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href="/briefing"
        className="flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg transition-all"
        style={{
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.18)",
          color: "rgba(167,139,250,0.7)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(139,92,246,0.14)";
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(167,139,250,0.95)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(139,92,246,0.08)";
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(167,139,250,0.7)";
        }}
      >
        <svg viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3">
          <path d="M7 1l1.3 3.9L12.5 7l-4.2 1.3L7 12.5l-1.3-4.2L1.5 7l4.2-1.3L7 1z" />
        </svg>
        Open full briefing + AI plan
      </Link>
    </div>
  );
}
