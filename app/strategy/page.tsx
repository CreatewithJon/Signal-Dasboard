"use client";

/**
 * app/strategy/page.tsx
 *
 * Strategic Planner — Sovereign OS v6.0
 *
 * Long-horizon planning view: North Star, Top Objectives, Dependencies,
 * Bottlenecks, Strategic Risks, 30/60/90 Day Plans, Recommended Sequence,
 * Confidence + Reasoning, and AI "Challenge This Strategy" panel.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeStrategicPlan } from "@/lib/strategicPlanner/engine";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { StrategicPlan, Severity, HorizonPlan } from "@/lib/strategicPlanner/engine";
import { computeWeeklyReview } from "@/lib/weeklyReview/engine";
import type { WeeklyReview } from "@/lib/weeklyReview/engine";
import type { ChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";
import type { Person } from "@/lib/types/relationships";
import type { Opportunity } from "@/lib/types/opportunities";

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Style maps ────────────────────────────────────────────────────────────

const SEVERITY_META: Record<Severity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "rgba(239,68,68,0.9)",    bg: "rgba(239,68,68,0.06)",    border: "rgba(239,68,68,0.2)",    label: "Critical" },
  high:     { color: "rgba(245,158,11,0.9)",   bg: "rgba(245,158,11,0.06)",   border: "rgba(245,158,11,0.2)",   label: "High" },
  medium:   { color: "rgba(167,139,250,0.75)", bg: "rgba(99,102,241,0.05)",   border: "rgba(99,102,241,0.18)",  label: "Medium" },
};

const IMPACT_META: Record<string, { color: string }> = {
  transformative: { color: "rgba(52,211,153,0.9)" },
  high:           { color: "rgba(245,158,11,0.85)" },
  medium:         { color: "rgba(165,180,252,0.8)" },
  low:            { color: "rgba(255,255,255,0.4)" },
};

const HORIZON_ACCENT: Record<string, { color: string; bg: string; border: string }> = {
  "30 Days": { color: "rgba(52,211,153,0.9)",  bg: "rgba(52,211,153,0.04)",  border: "rgba(52,211,153,0.18)" },
  "60 Days": { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.04)",  border: "rgba(245,158,11,0.18)" },
  "90 Days": { color: "rgba(165,180,252,0.9)", bg: "rgba(99,102,241,0.04)",  border: "rgba(99,102,241,0.18)" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-3">
      {children}
    </p>
  );
}

function PanelCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
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

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}

function ConfidenceRing({ score }: { score: number }) {
  const r    = 32;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 75 ? "rgba(52,211,153,0.85)" :
    score >= 50 ? "rgba(245,158,11,0.85)" :
    "rgba(239,68,68,0.75)";

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 76, height: 76 }}>
      <svg width="76" height="76" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="38" cy="38" r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── Horizon Plan Card ──────────────────────────────────────────────────────

function HorizonCard({ plan, selected, onClick }: { plan: HorizonPlan; selected: boolean; onClick: () => void }) {
  const acc = HORIZON_ACCENT[plan.label] ?? HORIZON_ACCENT["30 Days"];
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-2xl px-4 py-3 text-left transition-all"
      style={{
        background: selected ? acc.bg : "rgba(255,255,255,0.02)",
        border: selected ? `1px solid ${acc.border}` : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: selected ? acc.color : "rgba(255,255,255,0.3)" }}>
        {plan.label}
      </p>
      <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
        {plan.priorities[0] ?? ""}
      </p>
    </button>
  );
}

// ── AI Challenge Panel ─────────────────────────────────────────────────────

function AIChallengePanel({ plan, chiefBrief }: { plan: StrategicPlan; chiefBrief: ChiefOfStaffBrief | null }) {
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const planContext = [
    `STRATEGIC PLAN — ${plan.generatedAt.slice(0, 10)}`,
    `North Star: "${plan.northStar.title}" — ${plan.northStar.rationale}`,
    `Top Objectives: ${plan.topObjectives.map((o) => `"${o.title}" (${o.impact})`).join("; ")}`,
    `Bottlenecks: ${plan.bottlenecks.map((b) => `[${b.severity.toUpperCase()}] ${b.title}`).join("; ")}`,
    `Strategic Risks: ${plan.strategicRisks.map((r) => `[${r.severity.toUpperCase()}] ${r.title}`).join("; ")}`,
    `30-Day Priorities: ${plan.thirtyDayPlan.priorities.join("; ")}`,
    `60-Day Goals: ${plan.sixtyDayPlan.goals.join("; ")}`,
    `90-Day Outcomes: ${plan.ninetyDayPlan.goals.join("; ")}`,
    `Dependencies: ${plan.dependencies.map((d) => d.steps.join(" → ")).join(" | ")}`,
    `Recommended Sequence: ${plan.sequencing.map((s) => `${s.order}. ${s.action}`).join("; ")}`,
    `Confidence: ${plan.confidence}/100`,
    chiefBrief
      ? `Chief of Staff — Highest Leverage: ${chiefBrief.highestLeverageAction.title}; Risk: ${chiefBrief.biggestRisk.title}`
      : "",
  ].filter(Boolean).join("\n");

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chief-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: msg, context: planContext }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  const SUGGESTIONS = [
    "Find weak assumptions in this plan",
    "What dependencies am I missing?",
    "Propose an alternative sequencing",
    "What hidden opportunities does this reveal?",
    "Where am I most likely to fail?",
  ];

  return (
    <PanelCard accent="rgba(99,102,241,0.15)">
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-xs font-bold text-white/80">Challenge This Strategy</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          AI analysis of weak assumptions, missing dependencies, and alternative sequencing.
        </p>
      </div>

      <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
              style={{
                background: m.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                border:     m.role === "user" ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.07)",
                color:      m.role === "user" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.65)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3 py-2 text-xs animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
            >
              Analyzing…
            </div>
          </div>
        )}
        {error && (
          <p className="text-[10px] text-red-400/70">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 pb-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about this strategy…"
          className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/20 focus:outline-none py-3"
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className="text-[10px] font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-30 shrink-0"
          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}
        >
          Ask
        </button>
      </div>
    </PanelCard>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const [plan,         setPlan]         = useState<StrategicPlan | null>(null);
  const [chiefBrief,   setChiefBrief]   = useState<ChiefOfStaffBrief | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [loaded,       setLoaded]       = useState(false);
  const [horizon,      setHorizon]      = useState<"30 Days" | "60 Days" | "90 Days">("30 Days");

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Load all data
    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks  = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const focusSessions = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);
    const habits        = safeRead<HabitEntry[]>(KEYS.HABITS, []);
    const habitLog      = safeRead<Record<string, string[]>>(KEYS.HABIT_LOG, {});

    // Vision data
    const yr1 = safeRead<string[]>(KEYS.PLANNER_1YR, []);
    const yr3 = safeRead<string[]>(KEYS.PLANNER_3YR, []);
    const yr5 = safeRead<string[]>(KEYS.PLANNER_5YR, []);
    const visionData = { yr1, yr3, yr5 };

    // Planner items
    const rawDaily   = safeRead<{ items?: PlannerItem[] }>(KEYS.PLANNER_DAILY, {});
    const rawWeekly  = safeRead<{ items?: PlannerItem[] }>(KEYS.PLANNER_WEEKLY, {});
    const rawMonthly = safeRead<{ items?: string[] }>(KEYS.PLANNER_MONTHLY, {});
    const dailyItems  = rawDaily.items   ?? [];
    const weeklyItems = rawWeekly.items  ?? [];
    const monthlyItems = rawMonthly.items ?? [];

    // Compute graph + action engine
    const graph         = computeKnowledgeGraph({ people, projects, opportunities, contentItems, memoryItems });
    const dailyBriefing = computeDailyBriefing({ todayStr, projects, projectTasks, memoryItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog });
    const focusEngine   = computeFocusEngine({ todayStr, projects, projectTasks, memoryItems, contentItems, dailyItems, weeklyItems, monthlyItems, habits, habitLog, visionData, dailyBriefing });
    const actionResult  = computeActionEngine({ graphInsights: graph.insights, opportunities, people, projects, projectTasks, contentItems, todayStr });

    // Normalize focus sessions for chief input (expects { date, completedAt, abandoned })
    const focusSessNorm = focusSessions.map((s: FocusSession) => ({
      date:        s.startedAt?.slice(0, 10) ?? todayStr,
      completedAt: s.endedAt,
      abandoned:   s.status === "Abandoned",
    }));

    // Compute chief brief (for strategy page enrichment)
    const chiefInput = {
      todayStr, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems,
      habits, habitLog, visionData,
      focusEngine, dailyBriefing, focusSessions: focusSessNorm,
      people, graphInsights: graph.insights,
      topAction: actionResult.actions[0],
    };
    const brief = computeChiefOfStaffBrief(chiefInput);
    setChiefBrief(brief);

    // Compute strategic plan (uses raw FocusSession[])
    const strategic = computeStrategicPlan({
      todayStr, visionData, projects, projectTasks, opportunities,
      people, contentItems, memoryItems, focusSessions,
      graphInsights: graph.insights,
      chiefBrief: brief,
      actionResult,
    });

    setPlan(strategic);

    // Compute weekly review for alignment note
    const weeklyRev = computeWeeklyReview({
      todayStr, projects, projectTasks, contentItems,
      opportunities, people, memoryItems,
      focusSessions, habits, habitLog,
      strategicPlan: strategic, actionResult,
    });
    setWeeklyReview(weeklyRev);

    setLoaded(true);
  }, []);

  if (!loaded || !plan) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm animate-pulse">
        Building strategic plan…
      </div>
    );
  }

  const horizonPlan =
    horizon === "30 Days" ? plan.thirtyDayPlan :
    horizon === "60 Days" ? plan.sixtyDayPlan  :
    plan.ninetyDayPlan;

  const horizonAcc = HORIZON_ACCENT[horizon];

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Hero ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 35%, rgba(99,102,241,0.1) 0%, rgba(245,158,11,0.03) 60%, transparent 75%)" }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-indigo-400/60 mb-4 relative">
          Strategic Planner · v6.0
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-3 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          30 · 60 · 90 Day Strategy
        </h1>
        <p className="text-sm text-white/25 max-w-md mx-auto leading-relaxed relative">
          Long-horizon planning from vision to execution. Sits above Focus Engine, Chief of Staff, and Action Engine.
        </p>

        {/* Confidence */}
        <div className="flex justify-center mt-6 relative">
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ConfidenceRing score={plan.confidence} />
            <div className="text-left">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-0.5">Confidence</p>
              <p className="text-sm font-semibold text-white/70">
                {plan.confidence >= 75 ? "High" : plan.confidence >= 50 ? "Moderate" : "Low"}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">
                Based on data richness + execution history
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── North Star ── */}
      <section className="mb-8">
        <SectionLabel>North Star</SectionLabel>
        <div
          className="rounded-2xl px-6 py-5"
          style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <span className="text-lg">◈</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white/90 leading-snug mb-2">
                {plan.northStar.title}
              </h2>
              <p className="text-xs text-white/40 leading-relaxed">
                {plan.northStar.rationale}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Objectives ── */}
      <section className="mb-8">
        <SectionLabel>Top Objectives ({plan.topObjectives.length})</SectionLabel>
        <div className="flex flex-col gap-3">
          {plan.topObjectives.map((obj, i) => (
            <div
              key={obj.id}
              className="rounded-2xl px-5 py-4 flex items-start gap-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "rgba(99,102,241,0.1)", color: "rgba(165,180,252,0.7)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-white/85">{obj.title}</p>
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ color: IMPACT_META[obj.impact]?.color ?? "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}
                  >
                    {obj.impact}
                  </span>
                  <span className="text-[8px] text-white/25 uppercase tracking-[0.1em]">
                    {obj.difficulty}
                  </span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{obj.whyItMatters}</p>
              </div>
            </div>
          ))}
          {plan.topObjectives.length === 0 && (
            <p className="text-sm text-white/25 px-2">
              No objectives derived. Add active projects or set your 1-year vision in /planner.
            </p>
          )}
        </div>

        {/* Goal Decomposition CTA */}
        {plan.topObjectives.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Link
              href="/goals"
              className="inline-flex items-center gap-2 text-[10px] font-semibold px-3.5 py-2 rounded-xl transition-all"
              style={{
                background: "rgba(139,92,246,0.08)",
                border:     "1px solid rgba(139,92,246,0.2)",
                color:      "rgba(167,139,250,0.8)",
              }}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <circle cx="7" cy="7" r="5.5" />
                <path d="M7 4.5v2.5l2 2" strokeLinecap="round" />
              </svg>
              Decompose into milestones + actions →
            </Link>
          </div>
        )}
      </section>

      {/* ── 30/60/90 Day Plans ── */}
      <section className="mb-8">
        <SectionLabel>Execution Horizon</SectionLabel>

        {/* Tab switcher */}
        <div className="flex gap-3 mb-5">
          {([plan.thirtyDayPlan, plan.sixtyDayPlan, plan.ninetyDayPlan] as HorizonPlan[]).map((p) => (
            <HorizonCard
              key={p.label}
              plan={p}
              selected={horizon === p.label}
              onClick={() => setHorizon(p.label as typeof horizon)}
            />
          ))}
        </div>

        {/* Active horizon detail */}
        <PanelCard accent={horizonAcc.border}>
          <div className="px-5 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-bold" style={{ color: horizonAcc.color }}>
              {horizonPlan.label} Plan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Priorities */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-2.5">Priorities</p>
              <ul className="space-y-1.5">
                {horizonPlan.priorities.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: horizonAcc.color }} />
                    <p className="text-xs text-white/65 leading-relaxed">{p}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Milestones */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-2.5">Milestones</p>
              <ul className="space-y-1.5">
                {horizonPlan.milestones.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px]" style={{ color: horizonAcc.color }}>◆</span>
                    <p className="text-xs text-white/65 leading-relaxed">{m}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-2.5">Actions</p>
              <ul className="space-y-1.5">
                {horizonPlan.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-white/25">→</span>
                    <p className="text-xs text-white/55 leading-relaxed">{a}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Goals */}
            {horizonPlan.goals.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-2.5">Goals</p>
                <ul className="space-y-1.5">
                  {horizonPlan.goals.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[10px]" style={{ color: horizonAcc.color }}>⬆</span>
                      <p className="text-xs text-white/55 leading-relaxed">{g}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PanelCard>
      </section>

      {/* ── Recommended Sequence ── */}
      <section className="mb-8">
        <SectionLabel>Recommended Sequence</SectionLabel>
        <div className="flex flex-col gap-2">
          {plan.sequencing.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(99,102,241,0.12)", color: "rgba(165,180,252,0.7)", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                {step.order}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80 leading-snug">{step.action}</p>
                <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{step.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottlenecks + Dependencies side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

        {/* Bottlenecks */}
        <div>
          <SectionLabel>Bottlenecks ({plan.bottlenecks.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {plan.bottlenecks.length === 0 ? (
              <p className="text-xs text-white/25 px-2">No bottlenecks detected — clean execution path.</p>
            ) : (
              plan.bottlenecks.map((bn) => (
                <div
                  key={bn.id}
                  className="rounded-2xl px-4 py-3"
                  style={{ background: SEVERITY_META[bn.severity].bg, border: `1px solid ${SEVERITY_META[bn.severity].border}` }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <SeverityBadge severity={bn.severity} />
                    <p className="text-xs font-semibold text-white/80 leading-snug">{bn.title}</p>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">{bn.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <SectionLabel>Dependencies ({plan.dependencies.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {plan.dependencies.length === 0 ? (
              <p className="text-xs text-white/25 px-2">No dependency chains detected.</p>
            ) : (
              plan.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: dep.isBlocking ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: dep.isBlocking ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {dep.steps.map((s, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(99,102,241,0.1)", color: "rgba(165,180,252,0.8)" }}
                        >
                          {s}
                        </span>
                        {i < dep.steps.length - 1 && (
                          <span className="text-[10px] text-white/20">→</span>
                        )}
                      </span>
                    ))}
                    {dep.isBlocking && (
                      <span className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full ml-1"
                        style={{ color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                        Blocking
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/35 leading-relaxed">{dep.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Strategic Risks ── */}
      <section className="mb-8">
        <SectionLabel>Strategic Risks ({plan.strategicRisks.length})</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plan.strategicRisks.length === 0 ? (
            <p className="text-xs text-white/25 px-2">No major risks detected.</p>
          ) : (
            plan.strategicRisks.map((risk) => {
              const m = SEVERITY_META[risk.severity];
              return (
                <div
                  key={risk.id}
                  className="rounded-2xl px-4 py-3.5"
                  style={{ background: m.bg, border: `1px solid ${m.border}` }}
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <SeverityBadge severity={risk.severity} />
                    <p className="text-xs font-semibold leading-snug" style={{ color: m.color }}>
                      {risk.title}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed">{risk.recommendation}</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Confidence + Reasoning ── */}
      <section className="mb-8">
        <SectionLabel>Confidence + Reasoning</SectionLabel>
        <PanelCard>
          <div className="flex items-start gap-5 p-5">
            <ConfidenceRing score={plan.confidence} />
            <div>
              <p className="text-xs font-bold text-white/60 mb-3">Strategic Reasoning</p>
              <div className="space-y-3">
                {plan.reasoning.split("\n\n").map((block, i) => (
                  <p key={i} className="text-xs text-white/45 leading-relaxed">
                    {block.split("**").map((part, j) =>
                      j % 2 === 1
                        ? <strong key={j} className="text-white/65 font-semibold">{part}</strong>
                        : <span key={j}>{part}</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </PanelCard>
      </section>

      {/* ── Chief of Staff Alignment ── */}
      {chiefBrief && (
        <section className="mb-8">
          <SectionLabel>Chief of Staff Alignment</SectionLabel>
          <div
            className="rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4"
            style={{ background: "rgba(139,92,246,0.03)", border: "1px solid rgba(139,92,246,0.14)" }}
          >
            <div className="flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet-400/50 mb-1">
                Today&apos;s Highest Leverage Action
              </p>
              <p className="text-sm font-semibold text-white/80">{chiefBrief.highestLeverageAction.title}</p>
              <p className="text-xs text-white/35 mt-0.5">{chiefBrief.highestLeverageAction.reason}</p>
            </div>
            <div
              className="h-px md:h-12 md:w-px"
              style={{ background: "rgba(139,92,246,0.15)" }}
            />
            <div className="shrink-0">
              <Link
                href="/chief"
                className="text-[10px] font-bold px-4 py-2 rounded-xl transition-all inline-block"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(196,181,253,0.85)" }}
              >
                Full Chief Brief →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Weekly Alignment Note ── */}
      {weeklyReview && (
        <section className="mb-8">
          <SectionLabel>Weekly Alignment</SectionLabel>
          <div
            className="rounded-2xl px-5 py-4 flex items-start gap-5"
            style={{
              background: weeklyReview.strategicAlignment.score >= 75
                ? "rgba(52,211,153,0.03)"
                : weeklyReview.strategicAlignment.score >= 45
                ? "rgba(245,158,11,0.03)"
                : "rgba(239,68,68,0.03)",
              border: weeklyReview.strategicAlignment.score >= 75
                ? "1px solid rgba(52,211,153,0.14)"
                : weeklyReview.strategicAlignment.score >= 45
                ? "1px solid rgba(245,158,11,0.14)"
                : "1px solid rgba(239,68,68,0.14)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold tabular-nums"
              style={{
                background: weeklyReview.strategicAlignment.score >= 75
                  ? "rgba(52,211,153,0.08)"
                  : weeklyReview.strategicAlignment.score >= 45
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(239,68,68,0.06)",
                color: weeklyReview.strategicAlignment.score >= 75
                  ? "rgba(52,211,153,0.9)"
                  : weeklyReview.strategicAlignment.score >= 45
                  ? "rgba(245,158,11,0.9)"
                  : "rgba(239,68,68,0.8)",
              }}
            >
              {weeklyReview.strategicAlignment.score}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/75 mb-1">
                {weeklyReview.weekStart} — {weeklyReview.weekEnd}
              </p>
              <p className="text-[10px] text-white/40 leading-relaxed mb-2">
                {weeklyReview.strategicAlignment.completedAligned} of {weeklyReview.strategicAlignment.totalCompleted} completed tasks aligned to top strategic objectives.{" "}
                {weeklyReview.strategicAlignment.note}
              </p>
              {weeklyReview.slippedItems.length > 0 && (
                <p className="text-[9px] text-white/25">
                  {weeklyReview.slippedItems.length} item{weeklyReview.slippedItems.length !== 1 ? "s" : ""} slipped last week —
                  {" "}<span style={{ color: "rgba(245,158,11,0.6)" }}>
                    {weeklyReview.slippedItems[0].title}
                  </span>
                  {weeklyReview.slippedItems.length > 1 ? ` + ${weeklyReview.slippedItems.length - 1} more` : ""}
                </p>
              )}
              <Link
                href="/review"
                className="inline-block mt-2 text-[9px] font-semibold"
                style={{ color: "rgba(99,102,241,0.6)" }}
              >
                View full weekly review →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── AI Challenge ── */}
      <section className="mb-16">
        <SectionLabel>AI Analysis</SectionLabel>
        <AIChallengePanel plan={plan} chiefBrief={chiefBrief} />
      </section>

    </div>
  );
}
