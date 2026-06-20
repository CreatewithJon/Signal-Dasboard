"use client";

/**
 * app/chief/page.tsx
 *
 * Chief of Staff — Sovereign OS v5.1
 *
 * Full executive brief: Executive Summary, Highest Leverage Action,
 * Biggest Risk, Blocked Items, Opportunities (top 3 stored + detected),
 * Recommended Schedule, Metrics, Reasoning, and AI Challenge panel.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeFocusEngine } from "@/lib/focus/engine";
import { computeDailyBriefing } from "@/lib/briefing/daily";
import { computeChiefOfStaffBrief } from "@/lib/chiefOfStaff/engine";
import { loadOpportunities } from "@/lib/opportunities/store";
import type { ChiefOfStaffBrief, ScheduleBlock, Opportunity as ChiefOpportunity, BlockedItem, RiskSeverity } from "@/lib/chiefOfStaff/engine";
import type { Opportunity as StoredOpportunity } from "@/lib/types/opportunities";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem } from "@/lib/briefing/daily";
import type { FocusSession } from "@/lib/types/execution";
import type { Person } from "@/lib/types/relationships";
import { isFollowUpDue } from "@/lib/relationships/store";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import type { GraphInsight } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-3">
      {children}
    </p>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden p-4"
      style={{
        border: `1px solid ${accent ?? "rgba(255,255,255,0.07)"}`,
        background: "rgba(255,255,255,0.015)",
      }}
    >
      {children}
    </div>
  );
}

function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 68, height: 68 }}>
        <svg width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle
            cx="34" cy="34" r={r}
            fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <p className="text-[9px] text-white/30 font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}

const RISK_META: Record<RiskSeverity, { color: string; bg: string; border: string }> = {
  critical: {
    color:  "rgba(239,68,68,0.9)",
    bg:     "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.2)",
  },
  high: {
    color:  "rgba(245,158,11,0.9)",
    bg:     "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.2)",
  },
  medium: {
    color:  "rgba(167,139,250,0.75)",
    bg:     "rgba(99,102,241,0.05)",
    border: "rgba(99,102,241,0.18)",
  },
};

const OPP_ICONS: Record<string, string> = {
  content:      "◆",
  leverage:     "⬆",
  relationship: "◎",
  repurpose:    "↺",
};

const SCHEDULE_COLORS: Record<string, string> = {
  "deep-work": "rgba(52,211,153,0.85)",
  "admin":     "rgba(167,139,250,0.7)",
  "creator":   "rgba(245,158,11,0.8)",
  "habits":    "rgba(59,130,246,0.8)",
  "review":    "rgba(156,163,175,0.6)",
};

// ── AI Challenge Panel ────────────────────────────────────────────────────

function AIChallengePanel({ brief }: { brief: ChiefOfStaffBrief }) {
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const briefContext = [
    `Executive Summary: ${brief.executiveSummary}`,
    `Highest Leverage Action: ${brief.highestLeverageAction.title} — ${brief.highestLeverageAction.reason}`,
    `Biggest Risk: [${brief.biggestRisk.severity.toUpperCase()}] ${brief.biggestRisk.title} — ${brief.biggestRisk.recommendation}`,
    `Weekly Momentum: ${brief.weeklyMomentum.score}/100 — ${brief.weeklyMomentum.explanation}`,
    `Strategic Alignment: ${brief.strategicAlignment.score}/100 — ${brief.strategicAlignment.explanation}`,
    brief.blockedItems.length > 0
      ? `Blocked: ${brief.blockedItems.map((b) => b.text).join(", ")}`
      : "",
    brief.opportunities.length > 0
      ? `Opportunities: ${brief.opportunities.map((o) => o.title).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: briefContext,
        }),
      });
      const data: { reply?: string; error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(99,102,241,0.15)", background: "rgba(99,102,241,0.025)" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-3.5 pb-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-xs font-bold text-white/80">Challenge This Plan</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          Ask your Chief of Staff to identify blind spots, challenge assumptions, or propose better sequencing.
        </p>
      </div>

      {/* Messages */}
      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {[
              "What am I missing?",
              "Is this the right priority order?",
              "What's the biggest assumption I'm making?",
              "What would you do differently?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-xl px-3 py-2"
              style={{
                background: m.role === "user"
                  ? "rgba(99,102,241,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: m.role === "user"
                  ? "1px solid rgba(99,102,241,0.2)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-[11px] leading-relaxed whitespace-pre-wrap"
                style={{ color: m.role === "user" ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.65)" }}>
                {m.content}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <p className="text-[10px] text-red-400/70">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 pb-4 pt-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your Chief of Staff…"
            rows={2}
            className="flex-1 rounded-xl px-3 py-2.5 text-[11px] resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.75)",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 shrink-0"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "rgba(165,180,252,0.9)",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const OPP_TYPE_COLORS: Record<string, string> = {
  Revenue:     "rgba(52,211,153,0.85)",
  Client:      "rgba(59,130,246,0.85)",
  Partnership: "rgba(245,158,11,0.85)",
  Product:     "rgba(167,139,250,0.85)",
  Content:     "rgba(251,113,133,0.85)",
  Event:       "rgba(251,191,36,0.85)",
  Education:   "rgba(129,140,248,0.85)",
  Personal:    "rgba(156,163,175,0.7)",
};

export default function ChiefPage() {
  const [brief,        setBrief]        = useState<ChiefOfStaffBrief | null>(null);
  const [storedOpps,   setStoredOpps]   = useState<StoredOpportunity[]>([]);
  const [people,       setPeople]       = useState<Person[]>([]);
  const [graphInsights, setGraphInsights] = useState<GraphInsight[]>([]);
  const [todayStr,     setTodayStr]     = useState("");
  const [loaded,       setLoaded]       = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setTodayStr(today);

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
    const loadedPeople  = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const visionData    = {
      yr1: safeRead<string[]>(KEYS.PLANNER_1YR, []),
      yr3: safeRead<string[]>(KEYS.PLANNER_3YR, []),
      yr5: safeRead<string[]>(KEYS.PLANNER_5YR, []),
    };

    const dailyBriefing = computeDailyBriefing({
      todayStr: today, projects, projectTasks, memoryItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
    });

    const focusEngine = computeFocusEngine({
      todayStr: today, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, dailyBriefing,
    });

    const allOpps = loadOpportunities();

    // Knowledge Graph — computed before brief so insights can feed Chief of Staff risk/opps
    const graph = computeKnowledgeGraph({
      people:        loadedPeople,
      projects,
      opportunities: allOpps,
      contentItems,
      memoryItems,
    });

    // Action Engine — computed after graph, feeds top action into Chief brief
    const actionResult = computeActionEngine({
      graphInsights: graph.insights,
      opportunities: allOpps,
      people:        loadedPeople,
      projects,
      projectTasks,
      contentItems,
      todayStr:      today,
    });

    const result = computeChiefOfStaffBrief({
      todayStr: today, projects, projectTasks, memoryItems, contentItems,
      dailyItems, weeklyItems, monthlyItems, habits, habitLog,
      visionData, focusEngine, dailyBriefing, people: loadedPeople,
      graphInsights: graph.insights,
      topAction:     actionResult.actions[0],
      focusSessions: focusSessions.map((s: FocusSession) => ({
        date:        s.startedAt?.slice(0, 10) ?? today,
        completedAt: s.endedAt,
        abandoned:   s.status === "Abandoned",
      })),
    });

    setBrief(result);
    setPeople(loadedPeople);
    setGraphInsights(graph.insights);
    setStoredOpps(allOpps.filter((o) => o.status !== "Archived" && o.status !== "Converted"));
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen" style={{ background: "#080808" }}>
        <div className="max-w-2xl mx-auto px-4 pt-16 space-y-4">
          {[140, 100, 200, 160].map((h, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{ height: h, background: "rgba(255,255,255,0.025)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!brief) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
      <div className="text-center max-w-xs px-6">
        <p className="text-sm text-white/40 mb-2">No brief available yet.</p>
        <p className="text-xs text-white/20 leading-relaxed">Add projects and tasks in /projects, then return here.</p>
      </div>
    </div>
  );

  const riskMeta = RISK_META[brief.biggestRisk.severity];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080808" }}>
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" fill="rgba(165,180,252,0.85)" />
              </svg>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Chief of Staff
            </p>
          </div>
          <h1 className="text-2xl font-bold text-white/85 tracking-tight leading-tight">
            Executive Brief
          </h1>
          <p className="text-[10px] text-white/25 mt-1">
            Generated at {formatTime(brief.generatedAt)} · deterministic synthesis of all your data
          </p>
        </div>

        <div className="space-y-4">

          {/* ── Executive Summary ────────────────────────────────────────── */}
          <Card>
            <SectionLabel>Executive Summary</SectionLabel>
            <p className="text-sm text-white/65 leading-relaxed">{brief.executiveSummary}</p>
          </Card>

          {/* ── Scores ───────────────────────────────────────────────────── */}
          <Card>
            <SectionLabel>Weekly Metrics</SectionLabel>
            <div className="flex justify-around">
              <div className="flex flex-col items-center gap-3">
                <ScoreRing
                  score={brief.weeklyMomentum.score}
                  color="rgba(52,211,153,0.9)"
                  label="Weekly Momentum"
                />
                <p className="text-[10px] text-white/30 text-center max-w-[120px] leading-relaxed">
                  {brief.weeklyMomentum.explanation}
                </p>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
              <div className="flex flex-col items-center gap-3">
                <ScoreRing
                  score={brief.strategicAlignment.score}
                  color="rgba(99,102,241,0.9)"
                  label="Strategic Alignment"
                />
                <p className="text-[10px] text-white/30 text-center max-w-[120px] leading-relaxed">
                  {brief.strategicAlignment.explanation}
                </p>
              </div>
            </div>
          </Card>

          {/* ── Highest Leverage Action ──────────────────────────────────── */}
          <Card accent="rgba(52,211,153,0.12)">
            <SectionLabel>Highest Leverage Action</SectionLabel>
            <p className="text-base font-bold text-white/85 leading-snug mb-2">
              {brief.highestLeverageAction.title}
            </p>
            {brief.highestLeverageAction.relatedProject && (
              <p className="text-[10px] text-white/30 mb-2">
                Project: {brief.highestLeverageAction.relatedProject}
              </p>
            )}
            <p className="text-[11px] text-white/50 leading-relaxed mb-1">
              {brief.highestLeverageAction.reason}
            </p>
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}
            >
              <span className="text-[10px] text-emerald-400/60 font-semibold">Impact:</span>
              <span className="text-[10px] text-white/45">{brief.highestLeverageAction.impact}</span>
            </div>
          </Card>

          {/* ── Biggest Risk ─────────────────────────────────────────────── */}
          <Card accent={riskMeta.border}>
            <SectionLabel>Biggest Risk</SectionLabel>
            <div className="flex items-start gap-3 mb-3">
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 mt-0.5"
                style={{ background: riskMeta.bg, border: `1px solid ${riskMeta.border}`, color: riskMeta.color }}
              >
                {brief.biggestRisk.severity}
              </span>
              <p className="text-sm font-semibold text-white/80 leading-snug">
                {brief.biggestRisk.title}
              </p>
            </div>
            <p className="text-[11px] text-white/45 leading-relaxed">
              {brief.biggestRisk.recommendation}
            </p>
          </Card>

          {/* ── Opportunities ────────────────────────────────────────────── */}
          {(storedOpps.length > 0 || brief.opportunities.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Top Opportunities</SectionLabel>
                <Link
                  href="/opportunities"
                  className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: "rgba(52,211,153,0.07)",
                    border: "1px solid rgba(52,211,153,0.18)",
                    color: "rgba(52,211,153,0.7)",
                  }}
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {/* Stored opportunities — top 3 by score */}
                {storedOpps
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map((opp: StoredOpportunity) => {
                    const typeColor = OPP_TYPE_COLORS[opp.type] ?? "rgba(156,163,175,0.7)";
                    return (
                      <div
                        key={opp.id}
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: "rgba(255,255,255,0.015)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5"
                            style={{ background: `${typeColor.replace("0.85", "0.08").replace("0.7", "0.06")}`, border: `1px solid ${typeColor.replace("0.85", "0.18").replace("0.7", "0.14")}`, color: typeColor }}
                          >
                            {opp.score}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-white/75 leading-snug">{opp.title}</p>
                              <span
                                className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                                style={{ color: typeColor, background: `${typeColor.replace("0.85", "0.07").replace("0.7", "0.05")}`, border: `1px solid ${typeColor.replace("0.85", "0.15").replace("0.7", "0.1")}` }}
                              >
                                {opp.type}
                              </span>
                            </div>
                            {opp.suggested_action && (
                              <p className="text-[10px] text-white/40 mt-0.5">→ {opp.suggested_action}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Detected brief opportunities (when no stored opps yet) */}
                {storedOpps.length === 0 && brief.opportunities.map((opp: ChiefOpportunity, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5 opacity-50">
                        {OPP_ICONS[opp.type] ?? "◆"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white/75 leading-snug mb-0.5">
                          {opp.title}
                        </p>
                        <p className="text-[10px] text-white/35 leading-relaxed mb-1">
                          {opp.description}
                        </p>
                        <p className="text-[10px] text-white/55 font-medium">
                          → {opp.action}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* CTA to opportunities page */}
                <Link
                  href="/opportunities"
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px dashed rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="text-[10px] text-white/25">Manage all opportunities in the Opportunity Engine</span>
                  <span className="text-[10px] text-white/20">→</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Relationship Signals ─────────────────────────────────────── */}
          {(() => {
            if (!todayStr || people.length === 0) return null;
            const overdue = people.filter(
              (p) => p.status !== "Archived" && isFollowUpDue(p, todayStr)
            );
            const highProspects = people.filter(
              (p) =>
                p.status !== "Archived" &&
                (p.relationship_type === "Prospect" || p.relationship_type === "Client") &&
                (p.priority === "High" || p.priority === "Critical") &&
                p.related_opportunity_ids.length === 0
            );
            if (overdue.length === 0 && highProspects.length === 0) return null;
            return (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Relationship Signals</SectionLabel>
                  <Link
                    href="/relationships"
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: "rgba(52,211,153,0.07)",
                      border: "1px solid rgba(52,211,153,0.18)",
                      color: "rgba(52,211,153,0.7)",
                    }}
                  >
                    Open CRM →
                  </Link>
                </div>
                {overdue.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(239,68,68,0.5)" }}>
                      Follow-up overdue ({overdue.length})
                    </p>
                    <div className="space-y-1.5">
                      {overdue.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: p.priority === "Critical" ? "rgba(239,68,68,0.8)" : "rgba(245,158,11,0.8)" }}
                          />
                          <p className="text-xs text-white/65 font-medium truncate">{p.name}</p>
                          <p className="text-[9px] shrink-0" style={{ color: "rgba(239,68,68,0.5)" }}>
                            due {p.next_follow_up_at}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {highProspects.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Prospects without opportunities ({highProspects.length})
                    </p>
                    <div className="space-y-1.5">
                      {highProspects.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: "rgba(59,130,246,0.7)" }}
                          />
                          <p className="text-xs text-white/55 font-medium truncate">{p.name}</p>
                          <p className="text-[9px] text-white/25 shrink-0">{p.relationship_type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* ── Graph Intelligence ───────────────────────────────────────── */}
          {graphInsights.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Graph Intelligence</SectionLabel>
                <Link
                  href="/graph"
                  className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    color: "rgba(165,180,252,0.65)",
                  }}
                >
                  Full graph →
                </Link>
              </div>
              <div className="space-y-2">
                {graphInsights.slice(0, 3).map((insight) => {
                  const severityColor =
                    insight.priority === "critical" ? "rgba(239,68,68,0.8)" :
                    insight.priority === "high"     ? "rgba(245,158,11,0.8)" :
                    "rgba(167,139,250,0.65)";
                  return (
                    <div
                      key={insight.id}
                      className="flex items-start gap-2.5 pb-2"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ background: severityColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white/70 leading-snug">{insight.title}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">{insight.action}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Blocked Items ─────────────────────────────────────────────── */}
          {brief.blockedItems.length > 0 && (
            <Card>
              <SectionLabel>Blocked / Stalled</SectionLabel>
              <div className="space-y-2">
                {brief.blockedItems.map((item: BlockedItem, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 pb-2"
                    style={{ borderBottom: i < brief.blockedItems.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                      style={{ background: "rgba(239,68,68,0.5)" }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-white/65 leading-snug">{item.text}</p>
                      {item.projectName && item.projectName !== item.text && (
                        <p className="text-[9px] text-white/25 mt-0.5">Project: {item.projectName}</p>
                      )}
                      <p className="text-[10px] text-white/35 mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Recommended Schedule ─────────────────────────────────────── */}
          <div>
            <SectionLabel>Recommended Schedule</SectionLabel>
            <div className="space-y-2">
              {brief.recommendedSchedule.map((block: ScheduleBlock, i: number) => {
                const color = SCHEDULE_COLORS[block.focus] ?? "rgba(156,163,175,0.6)";
                return (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="px-4 py-3 flex items-start gap-3"
                    >
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: color, minHeight: 16 }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                          <p className="text-[10px] font-bold tabular-nums" style={{ color }}>
                            {block.time}
                          </p>
                          <p className="text-xs font-semibold text-white/70 leading-snug">
                            {block.label}
                          </p>
                        </div>
                        <p className="text-[10px] text-white/35 leading-relaxed">
                          {block.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Reasoning ───────────────────────────────────────────────── */}
          <Card>
            <SectionLabel>How This Brief Was Computed</SectionLabel>
            <div className="space-y-3">
              {brief.reasoning.split("\n\n").map((para, i) => {
                const [boldPart, ...rest] = para.split(":**");
                const label = boldPart.replace("**", "");
                const body  = rest.join(":**");
                return (
                  <div key={i}>
                    <p className="text-[10px] text-white/25 font-semibold mb-0.5">{label}</p>
                    <p className="text-[10px] text-white/45 leading-relaxed">{body}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── AI Challenge Panel ───────────────────────────────────────── */}
          <AIChallengePanel brief={brief} />

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <p className="text-[9px] text-white/15 text-center leading-relaxed pb-4">
            This brief is deterministic — it updates when your data changes.
            Refresh to recompute. Sovereign OS v5.0
          </p>

        </div>
      </div>
    </div>
  );
}
