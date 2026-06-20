"use client";

/**
 * app/review/page.tsx
 *
 * Weekly Review — Sovereign OS v6.2
 *
 * Reviews the current week: completed work, slipped items, wins, blockers,
 * focus stats, habit consistency, relationship follow-ups, content progress,
 * strategic alignment, and next-week focus. AI "Analyze My Week" panel.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeWeeklyReview, buildWeeklyReviewContext } from "@/lib/weeklyReview/engine";
import type { WeeklyReview, SlipSeverity, RecommendationPriority } from "@/lib/weeklyReview/engine";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import { updatePerson } from "@/lib/relationships/store";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem } from "@/lib/types/memory";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";

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

// ── Style Helpers ──────────────────────────────────────────────────────────

const SLIP_META: Record<SlipSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "rgba(239,68,68,0.9)",   bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",   label: "Critical" },
  high:     { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)",  label: "High" },
  medium:   { color: "rgba(165,180,252,0.75)",bg: "rgba(99,102,241,0.05)",  border: "rgba(99,102,241,0.18)", label: "Medium" },
};

const REC_META: Record<RecommendationPriority, { color: string; bg: string; border: string; dot: string }> = {
  critical: { color: "rgba(239,68,68,0.85)",   bg: "rgba(239,68,68,0.05)",   border: "rgba(239,68,68,0.18)",   dot: "#ef4444" },
  high:     { color: "rgba(245,158,11,0.85)",  bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.18)",  dot: "#f59e0b" },
  medium:   { color: "rgba(165,180,252,0.75)", bg: "rgba(99,102,241,0.05)", border: "rgba(99,102,241,0.16)",  dot: "#8b5cf6" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-3">
      {children}
    </p>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.015)",
        border: `1px solid ${accent ?? "rgba(255,255,255,0.07)"}`,
      }}
    >
      {children}
    </div>
  );
}

function CardSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {children}
    </div>
  );
}

type ConversionState = "idle" | "done" | "error";

function ConvertButton({ label, onConvert }: { label: string; onConvert: () => boolean }) {
  const [state, setState] = useState<ConversionState>("idle");
  function handleClick() {
    const ok = onConvert();
    setState(ok ? "done" : "error");
    if (ok) setTimeout(() => setState("idle"), 2500);
  }
  if (state === "done") return (
    <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: "rgba(52,211,153,0.85)", background: "rgba(52,211,153,0.08)" }}>
      ✓ Done
    </span>
  );
  if (state === "error") return (
    <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.06)" }}>
      Error
    </span>
  );
  return (
    <button
      onClick={handleClick}
      className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80 shrink-0"
      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.22)", color: "rgba(165,180,252,0.8)" }}
    >
      {label}
    </button>
  );
}

// ── Alignment Ring ─────────────────────────────────────────────────────────

function AlignmentRing({ score }: { score: number }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 75 ? "rgba(52,211,153,0.85)" :
    score >= 45 ? "rgba(245,158,11,0.85)" :
    "rgba(239,68,68,0.75)";
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ── AI Analyze Panel ───────────────────────────────────────────────────────

function AIAnalyzePanel({ review }: { review: WeeklyReview }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(override?: string) {
    const text = override ?? input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const context = buildWeeklyReviewContext(review);
    const userMsg = { role: "user" as const, content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chief-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message: text,
          context: `You are the Sovereign OS Weekly Review AI. The user is reviewing their week. Here is the weekly review data:\n\n${context}\n\nProvide honest, direct, actionable analysis. Be specific. Help them understand what patterns to carry forward and what to change.`,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Unable to reach AI. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" style={{ color: "rgba(167,139,250,0.9)" }}>
              <path d="M8 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" strokeLinejoin="round" />
              <path d="M13 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/85">Analyze My Week</p>
            <p className="text-[10px] text-white/30">AI-powered review insights</p>
          </div>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            "What were my biggest wins this week?",
            "Why did I slip on key items?",
            "How should I prioritize next week?",
            "What patterns do you see?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "assistant" ? (
                <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div
                  className="text-xs px-3 py-2 rounded-xl max-w-[80%]"
                  style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.9)" }}
                >
                  {m.content}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse [animation-delay:300ms]" />
            </div>
          )}
          {error && <p className="text-xs text-red-400/70">{error}</p>}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about your week…"
            className="flex-1 bg-transparent text-sm text-white/75 placeholder-white/20 outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-30"
            style={{ background: "rgba(139,92,246,0.12)", color: "rgba(167,139,250,0.8)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            Send
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [review,   setReview]   = useState<WeeklyReview | null>(null);
  const [people,   setPeople]   = useState<Person[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [savedMemory, setSavedMemory] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const proj         = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const contentItems = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const opps         = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const peopleSrc    = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
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

    const graph         = computeKnowledgeGraph({ people: peopleSrc, projects: proj, opportunities: opps, contentItems, memoryItems });
    const dailyBriefing = computeDailyBriefing({ todayStr, projects: proj, projectTasks, memoryItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog });
    const focusEngine   = computeFocusEngine({ todayStr, projects: proj, projectTasks, memoryItems, contentItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog, visionData, dailyBriefing });
    const actionResult  = computeActionEngine({ graphInsights: graph.insights, opportunities: opps, people: peopleSrc, projects: proj, projectTasks, contentItems, todayStr });
    const chiefBrief    = computeChiefOfStaffBrief({
      todayStr, projects: proj, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing, people: peopleSrc,
      graphInsights: graph.insights, topAction: actionResult.actions[0],
      focusSessions: focusSessNorm,
    });
    const strategicPlan = computeStrategicPlan({
      todayStr, visionData, projects: proj, projectTasks, opportunities: opps,
      people: peopleSrc, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights, chiefBrief, actionResult,
    });

    const result = computeWeeklyReview({
      todayStr, projects: proj, projectTasks, contentItems,
      opportunities: opps, people: peopleSrc, memoryItems,
      focusSessions, habits, habitLog, strategicPlan, actionResult,
    });

    setReview(result);
    setPeople(peopleSrc);
    setLoaded(true);
  }, []);

  function saveToMemory() {
    if (!review) return;
    try {
      const existing = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
      const now = new Date().toISOString();
      const lines = [
        `Week: ${review.weekStart} → ${review.weekEnd}`,
        "",
        `Completed: ${review.completedWork.length} items`,
        ...review.completedWork.slice(0, 4).map((c) => `  • [${c.type}] ${c.title}`),
        "",
        `Slipped: ${review.slippedItems.length} items`,
        ...review.slippedItems.slice(0, 3).map((s) => `  • [${s.severity}] ${s.title}`),
        "",
        `Wins: ${review.wins.map((w) => w.title).join(", ")}`,
        `Habit score: ${review.habitConsistency.score}%`,
        `Focus: ${review.focusStats.completedSessions} sessions, ${review.focusStats.totalMinutes} min`,
        `Strategic alignment: ${review.strategicAlignment.score}%`,
        "",
        "Next week focus:",
        ...review.nextWeekFocus.map((f) => `  • ${f.title}`),
      ];
      const mem: MemoryItem = {
        id:                crypto.randomUUID(),
        title:             `Weekly Review: ${review.weekStart}`,
        content:           lines.join("\n"),
        type:              "Project Context",
        tags:              ["weekly-review", "reflection"],
        relatedProjectIds: [],
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

  function convertRecommendationToTask(taskTitle: string, projectId?: string): boolean {
    try {
      const existing = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
      const now = new Date().toISOString();
      const newTask: ProjectTask = {
        id:         crypto.randomUUID(),
        project_id: projectId ?? "",
        title:      taskTitle,
        status:     "Todo",
        priority:   "High",
        due_date:   "",
        notes:      `Added from Weekly Review — ${review?.weekStart ?? ""}`,
        created_at: now,
        updated_at: now,
      };
      safeWrite(KEYS.PROJECT_TASKS, [...existing, newTask]);
      return true;
    } catch { return false; }
  }

  function scheduleFollowUp(personId: string): boolean {
    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      updatePerson(personId, {
        next_follow_up_at: nextWeek.toISOString().slice(0, 10),
        status: "Follow Up",
      });
      return true;
    } catch { return false; }
  }

  if (!loaded || !review) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-white/20 text-sm animate-pulse">
        Computing weekly review…
      </div>
    );
  }

  const alignScore = review.strategicAlignment.score;
  const alignColor =
    alignScore >= 75 ? "rgba(52,211,153,0.85)" :
    alignScore >= 45 ? "rgba(245,158,11,0.85)" :
    "rgba(239,68,68,0.75)";

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Hero ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 50% 30%, rgba(52,211,153,0.1) 0%, transparent 70%)" }}
        />
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] relative mb-4" style={{ color: "rgba(52,211,153,0.55)" }}>
          Sovereign OS · Weekly Review
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
          Weekly Review
        </h1>
        <p className="text-xs text-white/30 relative mb-1">
          {review.weekStart} → {review.weekEnd}
        </p>
        <p className="text-sm text-white/25 max-w-md mx-auto leading-relaxed relative">
          What got done. What slipped. What matters next week.
        </p>

        {/* Quick stats */}
        <div className="flex items-center justify-center gap-3 mt-6 relative flex-wrap">
          {[
            { label: "Completed",  value: review.completedWork.length, color: "rgba(52,211,153,0.8)" },
            { label: "Slipped",    value: review.slippedItems.length,  color: review.slippedItems.length > 0 ? "rgba(245,158,11,0.8)" : "rgba(52,211,153,0.8)" },
            { label: "Wins",       value: review.wins.length,          color: "rgba(252,211,77,0.8)" },
            { label: "Focus min",  value: review.focusStats.totalMinutes, color: "rgba(99,102,241,0.8)" },
            { label: "Alignment",  value: `${alignScore}%`,            color: alignColor },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <Link
            href="/goals"
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
          >
            ← Goals
          </Link>
          <Link
            href="/actions"
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "rgba(52,211,153,0.7)" }}
          >
            View Actions →
          </Link>
        </div>
      </section>

      <div className="space-y-8">

        {/* ── Wins ── */}
        {review.wins.length > 0 && (
          <section>
            <SectionLabel>Wins This Week ({review.wins.length})</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {review.wins.map((win) => (
                <div
                  key={win.id}
                  className="rounded-2xl px-4 py-3"
                  style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.14)" }}
                >
                  <p className="text-sm font-semibold text-white/80 mb-0.5">{win.title}</p>
                  <p className="text-[10px] text-white/35 leading-relaxed">{win.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Completed Work ── */}
        <section>
          <SectionLabel>Completed Work ({review.completedWork.length})</SectionLabel>
          {review.completedWork.length === 0 ? (
            <p className="text-sm text-white/20 px-2">No completed items found this week.</p>
          ) : (
            <Card>
              <div className="divide-y divide-white/[0.04]">
                {review.completedWork.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        color: item.type === "task" ? "rgba(99,102,241,0.8)" : item.type === "content" ? "rgba(245,158,11,0.8)" : item.type === "opportunity" ? "rgba(52,211,153,0.8)" : "rgba(165,180,252,0.7)",
                        background: item.type === "task" ? "rgba(99,102,241,0.08)" : item.type === "content" ? "rgba(245,158,11,0.08)" : item.type === "opportunity" ? "rgba(52,211,153,0.08)" : "rgba(99,102,241,0.06)",
                      }}
                    >
                      {item.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{item.title}</p>
                      {item.projectTitle && (
                        <p className="text-[9px] text-white/25">{item.projectTitle}</p>
                      )}
                    </div>
                    <p className="text-[9px] text-white/20 shrink-0">{item.completedAt.slice(0, 10)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* ── Slipped Items ── */}
        {review.slippedItems.length > 0 && (
          <section>
            <SectionLabel>Slipped Items ({review.slippedItems.length})</SectionLabel>
            <Card>
              <div className="divide-y divide-white/[0.04]">
                {review.slippedItems.map((item) => {
                  const m = SLIP_META[item.severity];
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span
                        className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                        style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
                      >
                        {m.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/75 leading-snug">{item.title}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{item.reason}</p>
                      </div>
                      <span
                        className="text-[8px] uppercase tracking-wide text-white/25 shrink-0 mt-0.5"
                      >
                        {item.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        {/* ── Blockers ── */}
        {review.blockers.length > 0 && (
          <section>
            <SectionLabel>Blockers ({review.blockers.length})</SectionLabel>
            <Card>
              <div className="divide-y divide-white/[0.04]">
                {review.blockers.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: "rgba(239,68,68,0.7)" }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-white/75 leading-snug">{b.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{b.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* ── Focus Stats + Habit Consistency (2-col) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Focus Stats */}
          <div>
            <SectionLabel>Focus This Week</SectionLabel>
            <Card>
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Sessions",   value: `${review.focusStats.completedSessions} / ${review.focusStats.totalSessions}` },
                  { label: "Total min",  value: review.focusStats.totalMinutes },
                  { label: "Avg session",value: `${review.focusStats.avgSessionMinutes} min` },
                  { label: "Longest",    value: `${review.focusStats.longestSession} min` },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">{r.label}</span>
                    <span className="text-xs font-semibold text-white/70 tabular-nums">{r.value}</span>
                  </div>
                ))}
                {review.focusStats.topProjectTitle && (
                  <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] text-white/20 mb-0.5">Top project</p>
                    <p className="text-xs text-white/60">{review.focusStats.topProjectTitle}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Habit Consistency */}
          <div>
            <SectionLabel>Habit Consistency</SectionLabel>
            <Card>
              <div className="px-5 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <AlignmentRing score={review.habitConsistency.score} />
                  <div>
                    <p className="text-sm font-bold text-white/80 tabular-nums">
                      {review.habitConsistency.score}%
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {review.habitConsistency.perfectDays} perfect day{review.habitConsistency.perfectDays !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] text-white/25">
                      Best streak: {review.habitConsistency.bestStreak}d
                    </p>
                  </div>
                </div>
                {/* Day grid */}
                <div className="flex gap-1.5 flex-wrap">
                  {review.habitConsistency.completionByDay.map((d) => {
                    const pct = d.total > 0 ? d.completed / d.total : 0;
                    const color =
                      pct >= 1    ? "rgba(52,211,153,0.6)" :
                      pct >= 0.5  ? "rgba(245,158,11,0.5)" :
                      pct > 0     ? "rgba(99,102,241,0.4)" :
                      "rgba(255,255,255,0.06)";
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.completed}/${d.total}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: color }}
                      >
                        <span className="text-[8px] font-bold text-white/50">
                          {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {review.habitConsistency.lowestHabit && (
                  <p className="text-[9px] text-white/25 mt-3">
                    Weakest: {review.habitConsistency.lowestHabit.name} ({review.habitConsistency.lowestHabit.rate}%)
                  </p>
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* ── Relationship Follow-Ups ── */}
        {review.relationshipFollowUps.length > 0 && (
          <section>
            <SectionLabel>Relationship Follow-Ups ({review.relationshipFollowUps.length})</SectionLabel>
            <Card>
              <div className="divide-y divide-white/[0.04]">
                {review.relationshipFollowUps.map((fu) => {
                  const person = people.find((p) => p.id === fu.personId);
                  return (
                    <div key={fu.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-white/75">{fu.personName}</p>
                          {fu.isOverdue && (
                            <span
                              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                              style={{ color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
                            >
                              Overdue
                            </span>
                          )}
                          <span className="text-[8px] text-white/20 uppercase tracking-wide">{fu.priority}</span>
                        </div>
                        <p className="text-[9px] text-white/25">Due: {fu.dueDate}</p>
                      </div>
                      {person && (
                        <ConvertButton
                          label="Reschedule"
                          onConvert={() => scheduleFollowUp(person.id)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        {/* ── Content Progress ── */}
        <section>
          <SectionLabel>Content Progress</SectionLabel>
          <Card>
            <CardSection>
              <div className="flex gap-6">
                {[
                  { label: "Created",   value: review.contentProgress.created },
                  { label: "→ Ready",   value: review.contentProgress.movedReady },
                  { label: "Published", value: review.contentProgress.published },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold text-white/85 tabular-nums">{s.value}</p>
                    <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardSection>
            {review.contentProgress.items.length > 0 && (
              <div className="divide-y divide-white/[0.04]">
                {review.contentProgress.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                    <span
                      className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        color: item.status === "Published" ? "rgba(52,211,153,0.8)" : item.status === "Ready" ? "rgba(245,158,11,0.8)" : "rgba(165,180,252,0.7)",
                        background: item.status === "Published" ? "rgba(52,211,153,0.08)" : item.status === "Ready" ? "rgba(245,158,11,0.08)" : "rgba(99,102,241,0.06)",
                      }}
                    >
                      {item.status}
                    </span>
                    <p className="text-xs text-white/60 truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* ── Strategic Alignment ── */}
        <section>
          <SectionLabel>Strategic Alignment</SectionLabel>
          <Card>
            <div className="px-5 py-5 flex items-center gap-5">
              <AlignmentRing score={review.strategicAlignment.score} />
              <div>
                <p className="text-sm font-semibold text-white/80 mb-1">
                  {review.strategicAlignment.completedAligned} / {review.strategicAlignment.totalCompleted} tasks aligned to top objectives
                </p>
                <p className="text-[10px] text-white/35 leading-relaxed max-w-sm">
                  {review.strategicAlignment.note}
                </p>
                <Link
                  href="/strategy"
                  className="inline-block mt-2 text-[9px] font-semibold"
                  style={{ color: "rgba(99,102,241,0.6)" }}
                >
                  Review strategy →
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Recommendations ── */}
        {review.recommendations.length > 0 && (
          <section>
            <SectionLabel>Recommendations ({review.recommendations.length})</SectionLabel>
            <div className="space-y-3">
              {review.recommendations.map((rec) => {
                const m = REC_META[rec.priority];
                return (
                  <div
                    key={rec.id}
                    className="rounded-2xl px-5 py-4 flex items-start gap-3"
                    style={{ background: m.bg, border: `1px solid ${m.border}` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: m.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/80 leading-snug mb-1">{rec.title}</p>
                      <p className="text-[10px] text-white/35 leading-relaxed">{rec.reason}</p>
                    </div>
                    {rec.taskTitle && (
                      <ConvertButton
                        label="→ Task"
                        onConvert={() => convertRecommendationToTask(rec.taskTitle!, rec.projectId)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Next Week Focus ── */}
        <section>
          <SectionLabel>Next Week Focus ({review.nextWeekFocus.length})</SectionLabel>
          {review.nextWeekFocus.length === 0 ? (
            <p className="text-sm text-white/20 px-2">Nothing prioritized yet. Complete some tasks and come back.</p>
          ) : (
            <div className="space-y-3">
              {review.nextWeekFocus.map((item, i) => (
                <div
                  key={item.id}
                  className="rounded-2xl px-5 py-4 flex items-start gap-4"
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.75)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 leading-snug">{item.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{item.reason}</p>
                    {item.projectTitle && (
                      <p className="text-[9px] text-white/20 mt-0.5">{item.projectTitle}</p>
                    )}
                  </div>
                  <span
                    className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ color: "rgba(165,180,252,0.6)", background: "rgba(99,102,241,0.07)" }}
                  >
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Panel ── */}
        <section>
          <SectionLabel>AI Analysis</SectionLabel>
          <AIAnalyzePanel review={review} />
        </section>

        {/* ── Save to Memory ── */}
        <section>
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <p className="text-xs text-white/45">Save this review to memory</p>
              <p className="text-[9px] text-white/20 mt-0.5">Gives AI context about your weekly performance history</p>
            </div>
            {savedMemory ? (
              <span className="text-[9px] font-bold" style={{ color: "rgba(52,211,153,0.8)" }}>✓ Saved</span>
            ) : (
              <button
                onClick={saveToMemory}
                className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
              >
                Save to Memory
              </button>
            )}
          </div>
        </section>

      </div>
      <div className="h-16" />
    </div>
  );
}
