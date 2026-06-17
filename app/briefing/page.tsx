"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import type { DailyBriefing, PlannerItem } from "@/lib/briefing/daily";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import { KEYS } from "@/lib/keys";

// ── Priority color map ────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "rgba(248,113,113,0.8)",
  High:     "rgba(251,191,36,0.8)",
  Medium:   "rgba(99,102,241,0.7)",
  Low:      "rgba(255,255,255,0.3)",
};

// ── Safe localStorage read ────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Format date label ─────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ── Section card ──────────────────────────────────────────────────────────

function Section({ title, accent = "rgba(255,255,255,0.07)", children }: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${accent}` }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-[0.25em]"
        style={{ color: accent === "rgba(255,255,255,0.07)" ? "rgba(255,255,255,0.25)" : accent }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    overdue: "rgba(248,113,113,0.15)",
    project: "rgba(99,102,241,0.12)",
    planner: "rgba(139,92,246,0.12)",
  };
  const texts: Record<string, string> = {
    overdue: "rgba(248,113,113,0.8)",
    project: "rgba(165,180,252,0.7)",
    planner: "rgba(196,181,253,0.7)",
  };
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: colors[source] ?? "rgba(255,255,255,0.06)", color: texts[source] ?? "rgba(255,255,255,0.3)" }}
    >
      {source}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [aiResponse, setAiResponse]     = useState<string | null>(null);
  const [streaming, setStreaming]       = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const projects     = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems  = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const habits       = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog     = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});

    // Daily items
    const rawDaily = safeRead<{ date?: string; items?: Array<{ text: string; done: boolean }> }>(KEYS.PLANNER_DAILY, {});
    const dailyItems: PlannerItem[] = Array.isArray(rawDaily.items) ? rawDaily.items : [];

    // Weekly items
    const rawWeekly = safeRead<{ week?: string; items?: Array<{ text: string; done: boolean }> }>(KEYS.PLANNER_WEEKLY, {});
    const weeklyItems: PlannerItem[] = Array.isArray(rawWeekly.items) ? rawWeekly.items : [];

    // Monthly items (string[])
    const rawMonthly = safeRead<{ month?: string; items?: string[] }>(KEYS.PLANNER_MONTHLY, {});
    const monthlyItems: string[] = Array.isArray(rawMonthly.items) ? rawMonthly.items : [];

    setBriefing(
      computeDailyBriefing({
        todayStr,
        projects,
        projectTasks,
        memoryItems,
        dailyItems,
        weeklyItems,
        monthlyItems,
        habits,
        habitLog,
      })
    );
  }, []);

  const refineWithAI = useCallback(async () => {
    if (!briefing || streaming) return;
    setAiResponse("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const prompt = `Here is my daily briefing for today:\n\n${briefing.aiPromptContext}\n\nBased on this, give me a sharp, practical plan for today. Be specific. Tell me what to do first, what to protect time for, and what to ignore. Keep it under 200 words.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          contextSources: ["Planner", "Memory"],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setAiResponse("Could not reach AI. Try again.");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiResponse(acc);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setAiResponse("Connection error. Try again.");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [briefing, streaming]);

  const stopAI = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  if (!briefing) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>Loading briefing…</p>
      </div>
    );
  }

  const { overdueItems, dueToday, topPriorities, highLeverageProjects,
          relevantMemories, habitFocus, suggestedFocusBlock, headline, date } = briefing;

  const habitsDone  = habitFocus.filter((h) => h.done).length;
  const habitsTotal = habitFocus.length;

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-14 px-4 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            ← Home
          </Link>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.3em]"
            style={{ color: "rgba(139,92,246,0.6)" }}
          >
            Daily Briefing
          </span>
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {formatDateLabel(date)}
        </p>

        <h1
          className="font-bold tracking-tight leading-tight mt-1"
          style={{
            fontSize: "clamp(22px, 4vw, 34px)",
            background: "linear-gradient(165deg, rgba(255,255,255,0.92) 20%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {headline}
        </h1>
      </div>

      {/* ── Top Priorities ── */}
      {topPriorities.length > 0 && (
        <Section title="Top Priorities" accent="rgba(139,92,246,0.3)">
          <div className="flex flex-col gap-2.5">
            {topPriorities.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{
                    background: i === 0 ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                    border:     i === 0 ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color:      i === 0 ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {p.text}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <SourceBadge source={p.source} />
                    {p.projectName && (
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {p.projectName}
                      </span>
                    )}
                    {p.priority && (
                      <span className="text-[10px] font-medium" style={{ color: PRIORITY_COLORS[p.priority] }}>
                        {p.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Overdue + Due Today ── */}
      {(overdueItems.length > 0 || dueToday.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {overdueItems.length > 0 && (
            <Section title={`Overdue (${overdueItems.length})`} accent="rgba(248,113,113,0.3)">
              <div className="flex flex-col gap-2">
                {overdueItems.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(248,113,113,0.12)", color: "rgba(248,113,113,0.8)" }}
                    >
                      {o.daysOverdue}d
                    </span>
                    <div>
                      <p className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {o.text}
                      </p>
                      {o.projectName && (
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {o.projectName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {dueToday.length > 0 && (
            <Section title={`Due Today (${dueToday.length})`} accent="rgba(251,191,36,0.3)">
              <div className="flex flex-col gap-2">
                {dueToday.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: d.priority ? PRIORITY_COLORS[d.priority] : "rgba(251,191,36,0.6)" }}
                    />
                    <div>
                      <p className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {d.text}
                      </p>
                      {d.projectName && (
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {d.projectName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── High-Leverage Projects ── */}
      {highLeverageProjects.length > 0 && (
        <Section title="High-Leverage Projects" accent="rgba(99,102,241,0.3)">
          <div className="flex flex-col gap-3">
            {highLeverageProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-1 pb-3 border-b last:border-b-0 last:pb-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {p.title}
                  </p>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide shrink-0"
                    style={{ color: PRIORITY_COLORS[p.priority] }}
                  >
                    {p.priority}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  → {p.nextAction}
                </p>
                {p.dueDate && (
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Due {p.dueDate}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Habits ── */}
      {habitFocus.length > 0 && (
        <Section
          title={`Habit Focus — ${habitsDone}/${habitsTotal} done`}
          accent={habitsDone === habitsTotal && habitsTotal > 0 ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.07)"}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {habitFocus.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background:   h.done ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.03)",
                  border:       h.done ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-sm">{h.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate" style={{ color: h.done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                    {h.name}
                  </p>
                  {h.streak > 0 && (
                    <p className="text-[9px]" style={{ color: "rgba(52,211,153,0.6)" }}>
                      {h.streak}d 🔥
                    </p>
                  )}
                </div>
                {h.done && (
                  <span className="text-[10px]" style={{ color: "rgba(52,211,153,0.7)" }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Memory Highlights ── */}
      {relevantMemories.length > 0 && (
        <Section title="Important Memory" accent="rgba(139,92,246,0.2)">
          <div className="flex flex-col gap-2">
            {relevantMemories.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: m.importance === "Critical" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                    color:      m.importance === "Critical" ? "rgba(248,113,113,0.7)" : "rgba(251,191,36,0.7)",
                  }}
                >
                  {m.importance}
                </span>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {m.title}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Suggested Focus Block ── */}
      <div
        className="rounded-xl px-5 py-4 flex items-start gap-3"
        style={{
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.18)",
        }}
      >
        <span className="text-lg mt-0.5">⚡</span>
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1"
            style={{ color: "rgba(139,92,246,0.6)" }}
          >
            Suggested Focus
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {suggestedFocusBlock}
          </p>
        </div>
      </div>

      {/* ── AI Refinement ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {!streaming ? (
            <button
              onClick={refineWithAI}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "rgba(165,180,252,0.9)",
                boxShadow: "0 0 16px rgba(99,102,241,0.1)",
              }}
            >
              <svg viewBox="0 0 14 14" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M7 1l1.3 3.9L12.5 7l-4.2 1.3L7 12.5l-1.3-4.2L1.5 7l4.2-1.3L7 1z" />
              </svg>
              Ask AI to refine today&apos;s plan
            </button>
          ) : (
            <button
              onClick={stopAI}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.18)",
                color: "rgba(248,113,113,0.75)",
              }}
            >
              <span className="w-2 h-2 rounded-sm" style={{ background: "rgba(248,113,113,0.8)" }} />
              Stop
            </button>
          )}
          {aiResponse !== null && !streaming && (
            <button
              onClick={() => { setAiResponse(null); }}
              className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {aiResponse !== null && (
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
              {aiResponse}
              {streaming && (
                <span
                  className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-indigo-400/70 animate-pulse"
                  style={{ verticalAlign: "text-bottom" }}
                />
              )}
            </p>
          </div>
        )}
      </div>

      {/* Bottom space */}
      <div className="h-8" />
    </div>
  );
}
