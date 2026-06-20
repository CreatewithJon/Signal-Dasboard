"use client";

/**
 * app/daily/page.tsx — Daily Operating Rhythm
 * Sovereign OS v6.6
 *
 * A structured daily workflow: Morning Brief → Start Day → Midday Check-In → End of Day → Weekly link.
 * State persists to localStorage, resets each new calendar day.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeFocusEngine } from "@/lib/focus/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem, MemoryType } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";

// ── helpers ──────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

// ── state types ──────────────────────────────────────────────────────────────

interface Checklist {
  reviewedBrief: boolean;
  setThreePriorities: boolean;
  reviewedCalendar: boolean;
  clearMind: boolean;
}

interface MiddayState {
  completedThisMorning: string;
  blocked: string;
  notes: string;
  done: boolean;
}

interface EndOfDayState {
  completedToday: string;
  slippedItems: string;
  tomorrowItems: string;
  savedToMemory: boolean;
  done: boolean;
}

interface DailyRhythmState {
  date: string;
  checklist: Checklist;
  priorities: [string, string, string];
  checklistDone: boolean;
  midday: MiddayState;
  endOfDay: EndOfDayState;
}

interface MorningBrief {
  topAction: string;
  topActionProject: string;
  biggestRisk: string;
  riskSeverity: string;
  topObjective: string;
  executiveSummary: string;
}

// ── sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  label,
  accent = "rgba(255,255,255,0.07)",
  done,
  children,
}: {
  label: string;
  accent?: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: done ? "rgba(255,255,255,0.012)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${done ? "rgba(255,255,255,0.05)" : accent}`,
        opacity: done ? 0.65 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <div className="flex items-center gap-2">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.25em]"
          style={{ color: done ? "rgba(255,255,255,0.2)" : accent }}
        >
          {label}
        </p>
        {done && (
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.7)", border: "1px solid rgba(52,211,153,0.15)" }}
          >
            Complete
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all disabled:opacity-30"
      style={{
        background: "rgba(99,102,241,0.15)",
        border: "1px solid rgba(99,102,241,0.3)",
        color: "rgba(165,180,252,0.9)",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all disabled:opacity-30"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.45)",
      }}
    >
      {children}
    </button>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl px-3 py-2.5 text-xs text-white/75 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-indigo-500/40"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    />
  );
}

function CheckItem({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all"
        style={{
          background: checked ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${checked ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.12)"}`,
        }}
      >
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" stroke="rgba(52,211,153,0.9)" strokeWidth="2" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span
        className="text-xs transition-all"
        style={{ color: checked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.65)", textDecoration: checked ? "line-through" : "none" }}
      >
        {label}
      </span>
    </label>
  );
}

// ── main component ───────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function makeDefault(): DailyRhythmState {
  return {
    date: TODAY,
    checklist: { reviewedBrief: false, setThreePriorities: false, reviewedCalendar: false, clearMind: false },
    priorities: ["", "", ""],
    checklistDone: false,
    midday: { completedThisMorning: "", blocked: "", notes: "", done: false },
    endOfDay: { completedToday: "", slippedItems: "", tomorrowItems: "", savedToMemory: false, done: false },
  };
}

export default function DailyPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [state, setState] = useState<DailyRhythmState | null>(null);
  const [saved, setSaved] = useState<"midday" | "eod" | null>(null);

  // Load + reset state on mount
  useEffect(() => {
    const stored = safeRead<DailyRhythmState>(KEYS.DAILY_RHYTHM, makeDefault());
    setState(stored.date === TODAY ? stored : makeDefault());
  }, []);

  // Persist on every state change
  useEffect(() => {
    if (state) safeWrite(KEYS.DAILY_RHYTHM, state);
  }, [state]);

  // Compute morning brief
  useEffect(() => {
    const todayStr     = TODAY;
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

    const focusSessNorm = focusSessions.map((s) => ({
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
      visionData, focusEngine, dailyBriefing, people,
      graphInsights: graph.insights, topAction: actionResult.actions[0],
      focusSessions: focusSessNorm,
    });

    const strategic = computeStrategicPlan({
      todayStr, visionData, projects, projectTasks, opportunities: opps,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief, actionResult,
    });

    setBrief({
      topAction:        chiefBrief.highestLeverageAction.title,
      topActionProject: chiefBrief.highestLeverageAction.relatedProject ?? "",
      biggestRisk:      chiefBrief.biggestRisk.title,
      riskSeverity:     chiefBrief.biggestRisk.severity,
      topObjective:     strategic.topObjectives[0]?.title ?? "No objectives set — add in /planner",
      executiveSummary: chiefBrief.executiveSummary,
    });
  }, []);

  const update = useCallback((patch: Partial<DailyRhythmState>) => {
    setState((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  const saveToMemory = useCallback(() => {
    if (!state) return;
    const items = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const now   = new Date().toISOString();
    const newItem: MemoryItem = {
      id:               `daily-${TODAY}`,
      title:            `Daily Wrap — ${TODAY}`,
      content:          [
        state.endOfDay.completedToday && `✓ Completed:\n${state.endOfDay.completedToday}`,
        state.endOfDay.slippedItems   && `→ Slipped:\n${state.endOfDay.slippedItems}`,
        state.endOfDay.tomorrowItems  && `Tomorrow:\n${state.endOfDay.tomorrowItems}`,
        state.priorities.filter(Boolean).length && `Priorities: ${state.priorities.filter(Boolean).join(" · ")}`,
      ].filter(Boolean).join("\n\n"),
      type:             "Note" as MemoryType,
      tags:             ["daily-rhythm", "wrap"],
      relatedProjectIds: [],
      relatedPeople:    [],
      importance:       "Medium",
      source:           "Manual",
      createdAt:        now,
      updatedAt:        now,
    };
    const updated = [newItem, ...items.filter((m) => m.id !== `daily-${TODAY}`)];
    safeWrite(KEYS.MEMORY_ITEMS, updated);
    update({ endOfDay: { ...state.endOfDay, savedToMemory: true } });
    setSaved("eod");
    setTimeout(() => setSaved(null), 2000);
  }, [state, update]);

  const convertSlippedToTasks = useCallback(() => {
    if (!state?.endOfDay.slippedItems.trim()) return;
    interface Task { id: number; text: string; done: boolean; }
    const tasks = safeRead<Task[]>(KEYS.TASKS, []);
    const lines = state.endOfDay.slippedItems.split("\n").map((l) => l.trim()).filter(Boolean);
    const newTasks: Task[] = lines.map((text) => ({ id: Date.now() + Math.random(), text, done: false }));
    safeWrite(KEYS.TASKS, [...tasks, ...newTasks]);
    setSaved("midday");
    setTimeout(() => setSaved(null), 2000);
  }, [state]);

  // Date header
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto pt-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        ))}
      </div>
    );
  }

  const checklistCount = Object.values(state.checklist).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-8 pb-6">
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] mb-1" style={{ color: "rgba(99,102,241,0.55)" }}>
          Daily Operating Rhythm
        </p>
        <h1
          className="font-bold tracking-tight leading-none mb-1"
          style={{
            fontSize: "clamp(20px,3vw,26px)",
            background: "linear-gradient(165deg,rgba(255,255,255,0.95) 20%,rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {dateLabel}
        </h1>
        <p className="text-[10px] text-white/25">Structure your day. Track momentum. Own the rhythm.</p>
      </div>

      <div className="space-y-4 pb-8">

        {/* ── 1. MORNING BRIEF ── */}
        <SectionCard label="Morning Brief" accent="rgba(99,102,241,0.45)">
          {!brief ? (
            <div className="h-24 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Top Action */}
              <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(99,102,241,0.6)" }}>⚡ Top Action</p>
                <p className="text-xs font-semibold text-white/80 leading-snug">{brief.topAction}</p>
                {brief.topActionProject && (
                  <p className="text-[9px] text-white/25 mt-1">{brief.topActionProject}</p>
                )}
              </div>
              {/* Risk */}
              <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(245,158,11,0.55)" }}>
                  ⚠ {brief.riskSeverity} Risk
                </p>
                <p className="text-xs text-white/65 leading-snug">{brief.biggestRisk}</p>
              </div>
              {/* Objective */}
              <div className="rounded-xl p-3 sm:col-span-2" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)" }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(52,211,153,0.5)" }}>🎯 Top Objective</p>
                <p className="text-xs font-semibold text-white/75 leading-snug">{brief.topObjective}</p>
              </div>
              {/* Summary */}
              <div className="rounded-xl p-3 sm:col-span-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5 text-white/20">Executive Summary</p>
                <p className="text-[11px] text-white/50 leading-relaxed">{brief.executiveSummary}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Link
              href="/chief"
              className="text-[9px] font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
            >
              Full Chief Brief →
            </Link>
            <Link
              href="/actions"
              className="text-[9px] font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
            >
              Action Queue →
            </Link>
          </div>
        </SectionCard>

        {/* ── 2. START YOUR DAY ── */}
        <SectionCard label="Start Your Day" accent="rgba(139,92,246,0.45)" done={state.checklistDone}>
          {/* Checklist */}
          <div className="space-y-2.5">
            <CheckItem
              checked={state.checklist.reviewedBrief}
              label="Reviewed morning brief"
              onChange={(v) => update({ checklist: { ...state.checklist, reviewedBrief: v } })}
            />
            <CheckItem
              checked={state.checklist.reviewedCalendar}
              label="Checked calendar & commitments"
              onChange={(v) => update({ checklist: { ...state.checklist, reviewedCalendar: v } })}
            />
            <CheckItem
              checked={state.checklist.clearMind}
              label="Cleared mind — ready to execute"
              onChange={(v) => update({ checklist: { ...state.checklist, clearMind: v } })}
            />
            <CheckItem
              checked={state.checklist.setThreePriorities}
              label="Set 3 priorities for today"
              onChange={(v) => update({ checklist: { ...state.checklist, setThreePriorities: v } })}
            />
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${(checklistCount / 4) * 100}%`, background: "rgba(139,92,246,0.6)" }}
              />
            </div>
            <span className="text-[9px] text-white/25">{checklistCount}/4</span>
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(139,92,246,0.45)" }}>
              Today&#39;s 3 Priorities
            </p>
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-white/20 w-4 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={state.priorities[i]}
                  onChange={(e) => {
                    const next: [string, string, string] = [...state.priorities] as [string, string, string];
                    next[i] = e.target.value;
                    update({ priorities: next });
                  }}
                  placeholder={`Priority ${i + 1}`}
                  className="flex-1 rounded-xl px-3 py-2 text-xs text-white/75 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-violet-500/40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            ))}
          </div>

          {!state.checklistDone && (
            <PrimaryButton
              onClick={() => update({ checklistDone: true, checklist: { reviewedBrief: true, setThreePriorities: true, reviewedCalendar: true, clearMind: true } })}
            >
              Start Day →
            </PrimaryButton>
          )}
        </SectionCard>

        {/* ── 3. MIDDAY CHECK-IN ── */}
        <SectionCard label="Midday Check-In" accent="rgba(245,158,11,0.45)" done={state.midday.done}>
          <div className="space-y-3">
            <Textarea
              value={state.midday.completedThisMorning}
              onChange={(v) => update({ midday: { ...state.midday, completedThisMorning: v } })}
              placeholder="What did you complete this morning?"
            />
            <Textarea
              value={state.midday.blocked}
              onChange={(v) => update({ midday: { ...state.midday, blocked: v } })}
              placeholder="Blocked on anything? What needs to move?"
            />
            <Textarea
              value={state.midday.notes}
              onChange={(v) => update({ midday: { ...state.midday, notes: v } })}
              placeholder="Notes, insights, or re-prioritizations…"
            />
          </div>
          {saved === "midday" && (
            <p className="text-[9px] text-emerald-400/70">Saved to tasks ✓</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {!state.midday.done && (
              <PrimaryButton onClick={() => update({ midday: { ...state.midday, done: true } })}>
                Save Check-In ✓
              </PrimaryButton>
            )}
            {state.midday.done && (
              <SecondaryButton onClick={() => update({ midday: { ...state.midday, done: false } })}>
                Edit
              </SecondaryButton>
            )}
          </div>
        </SectionCard>

        {/* ── 4. END OF DAY ── */}
        <SectionCard label="End of Day" accent="rgba(52,211,153,0.4)" done={state.endOfDay.done}>
          <div className="space-y-3">
            <Textarea
              value={state.endOfDay.completedToday}
              onChange={(v) => update({ endOfDay: { ...state.endOfDay, completedToday: v } })}
              placeholder="What did you complete today? List your wins."
              rows={3}
            />
            <Textarea
              value={state.endOfDay.slippedItems}
              onChange={(v) => update({ endOfDay: { ...state.endOfDay, slippedItems: v } })}
              placeholder="What slipped? One item per line — can convert to tasks."
              rows={2}
            />
            <Textarea
              value={state.endOfDay.tomorrowItems}
              onChange={(v) => update({ endOfDay: { ...state.endOfDay, tomorrowItems: v } })}
              placeholder="What's the #1 thing to tackle tomorrow?"
            />
          </div>

          {/* Feedback messages */}
          {state.endOfDay.savedToMemory && (
            <p className="text-[9px] text-emerald-400/70">Saved to memory ✓</p>
          )}
          {saved === "eod" && !state.endOfDay.savedToMemory && (
            <p className="text-[9px] text-emerald-400/70">Saved ✓</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <SecondaryButton onClick={saveToMemory} disabled={state.endOfDay.savedToMemory}>
              {state.endOfDay.savedToMemory ? "Saved to Memory ✓" : "Save to Memory"}
            </SecondaryButton>
            {state.endOfDay.slippedItems.trim() && (
              <SecondaryButton onClick={convertSlippedToTasks}>
                → Convert to Tasks
              </SecondaryButton>
            )}
            {!state.endOfDay.done && (
              <PrimaryButton onClick={() => update({ endOfDay: { ...state.endOfDay, done: true } })}>
                Wrap Day ✓
              </PrimaryButton>
            )}
            {state.endOfDay.done && (
              <SecondaryButton onClick={() => update({ endOfDay: { ...state.endOfDay, done: false } })}>
                Edit
              </SecondaryButton>
            )}
          </div>
        </SectionCard>

        {/* ── 5. WEEKLY REVIEW ── */}
        <Link
          href="/review"
          className="block rounded-2xl px-5 py-4 transition-all hover:opacity-80"
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Weekly Review
              </p>
              <p className="text-sm font-semibold text-white/55">Reflect on this week →</p>
              <p className="text-[10px] text-white/25 mt-0.5">Review wins, misses, and set next week&#39;s focus</p>
            </div>
            <svg viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" className="w-5 h-5 shrink-0">
              <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

      </div>
    </div>
  );
}
