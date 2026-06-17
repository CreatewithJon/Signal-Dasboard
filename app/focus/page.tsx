"use client";

import { useState, useEffect, useRef } from "react";
import { KEYS } from "@/lib/keys";
import { computeFocusEngine } from "@/lib/focus/engine";
import type { FocusEngineResult, FocusPriority, FocusBlock } from "@/lib/focus/engine";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { HabitEntry } from "@/lib/memory/context";
import type { PlannerItem, DailyBriefing } from "@/lib/briefing/daily";

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

// ── Score ring ─────────────────────────────────────────────────────────────

function ScoreRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-base font-bold"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
    </div>
  );
}

// ── Source badge ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  "overdue-task":    { label: "Overdue",  color: "rgba(239,68,68,0.18)"   },
  "overdue-project": { label: "Overdue",  color: "rgba(239,68,68,0.18)"   },
  "critical-task":   { label: "Critical", color: "rgba(245,158,11,0.18)"  },
  "high-task":       { label: "High",     color: "rgba(99,102,241,0.18)"  },
  "content-deadline":{ label: "Content",  color: "rgba(239,68,68,0.18)"   },
  "planner":         { label: "Planner",  color: "rgba(139,92,246,0.18)"  },
  "project-action":  { label: "Project",  color: "rgba(16,185,129,0.18)"  },
};

const SOURCE_TEXT: Record<string, string> = {
  "overdue-task":    "rgba(239,68,68,0.9)",
  "overdue-project": "rgba(239,68,68,0.9)",
  "critical-task":   "rgba(245,158,11,0.9)",
  "high-task":       "rgba(167,139,250,0.9)",
  "content-deadline":"rgba(239,68,68,0.9)",
  "planner":         "rgba(167,139,250,0.9)",
  "project-action":  "rgba(52,211,153,0.9)",
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_LABELS[source] ?? { label: source, color: "rgba(255,255,255,0.08)" };
  const tc  = SOURCE_TEXT[source] ?? "rgba(255,255,255,0.5)";
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
      style={{ background: cfg.color, color: tc, border: `1px solid ${tc.replace("0.9", "0.18")}` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Block type icons ───────────────────────────────────────────────────────

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  "deep-work": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <circle cx="10" cy="10" r="8" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  "admin": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round" />
    </svg>
  ),
  "creator": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <rect x="2" y="5" width="16" height="10" rx="2" />
      <circle cx="7.5" cy="10" r="1.5" />
      <path d="M13 8l3 2-3 2V8z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  ),
  "recovery": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M10 3a7 7 0 100 14A7 7 0 0010 3z" />
      <path d="M10 7v3l2 2" strokeLinecap="round" />
    </svg>
  ),
  "review": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M5 13l3 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const BLOCK_COLORS: Record<string, string> = {
  "deep-work": "rgba(139,92,246,0.7)",
  "admin":     "rgba(99,102,241,0.6)",
  "creator":   "rgba(239,68,68,0.7)",
  "recovery":  "rgba(16,185,129,0.6)",
  "review":    "rgba(245,158,11,0.7)",
};

// ── Priority card ──────────────────────────────────────────────────────────

function PriorityCard({
  priority,
  why,
  index,
}: {
  priority: FocusPriority;
  why?: { whyNow: string; supportsProject?: string; supportsVision?: string; impact: string };
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  const rankColor = index === 0
    ? "rgba(245,158,11,0.9)"
    : index === 1
      ? "rgba(167,139,250,0.85)"
      : "rgba(255,255,255,0.4)";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: index === 0 ? "0 0 24px rgba(245,158,11,0.06)" : "none",
      }}
    >
      <button
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Rank number */}
        <span
          className="text-3xl font-black shrink-0 leading-none"
          style={{ color: rankColor, opacity: 0.9 }}
        >
          {priority.rank}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <SourceBadge source={priority.source} />
            {priority.daysOverdue !== undefined && (
              <span className="text-[8px] font-bold uppercase tracking-wide text-red-400">
                {priority.daysOverdue}d overdue
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white/88 leading-snug">
            {priority.text}
          </p>
          {priority.projectName && (
            <p className="text-[10px] text-white/30 mt-1">{priority.projectName}</p>
          )}
        </div>

        {/* Expand chevron */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`w-3.5 h-3.5 shrink-0 mt-1 text-white/20 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l5 5 5-5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Why it matters — collapsible */}
      {open && why && (
        <div
          className="px-5 pb-5 space-y-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="pt-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-1.5">
              Why now
            </p>
            <p className="text-xs text-white/55 leading-relaxed">{why.whyNow}</p>
          </div>

          {why.supportsProject && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-1">
                Project
              </p>
              <p className="text-xs text-white/45">{why.supportsProject}</p>
            </div>
          )}

          {why.supportsVision && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-1">
                Vision alignment
              </p>
              <p className="text-xs text-white/45 italic">{why.supportsVision}</p>
            </div>
          )}

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mb-1">
              Impact
            </p>
            <p className="text-xs text-white/45">{why.impact}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Focus block card ───────────────────────────────────────────────────────

function FocusBlockCard({ block }: { block: FocusBlock }) {
  const color = BLOCK_COLORS[block.type] ?? "rgba(255,255,255,0.4)";
  const icon  = BLOCK_ICONS[block.type];

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Time */}
      <div className="shrink-0 text-center w-12">
        <p className="text-sm font-bold" style={{ color }}>{block.time}</p>
      </div>

      {/* Divider */}
      <div className="shrink-0 w-px self-stretch" style={{ background: color, opacity: 0.25 }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color, opacity: 0.8 }}>{icon}</span>
          <p className="text-xs font-semibold text-white/75">{block.label}</p>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed">{block.description}</p>
      </div>
    </div>
  );
}

// ── AI Refine Panel ────────────────────────────────────────────────────────

function AIRefinePanel({ aiPromptContext }: { aiPromptContext: string }) {
  const [output, setOutput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const abortRef              = useRef<AbortController | null>(null);

  async function handleRefine() {
    if (loading) return;
    setOutput("");
    setError("");
    setLoading(true);

    abortRef.current = new AbortController();

    const prompt = `Here is my current Focus Engine output:\n\n${aiPromptContext}\n\nAnalyze this and help me refine my focus for today. What are the most critical things I should do first? Are there any patterns you notice? What should I be aware of that I might be missing?`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setError("AI refinement failed. Try again.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setOutput(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Could not reach AI service.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(139,92,246,0.04)",
        border: "1px solid rgba(139,92,246,0.12)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(139,92,246,0.15)" }}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="1.4" className="w-3.5 h-3.5">
            <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
            <path d="M16 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/75">Refine My Focus</p>
          <p className="text-[10px] text-white/30">Ask AI to analyze today&apos;s priorities</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={loading ? handleStop : handleRefine}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={
            loading
              ? { background: "rgba(239,68,68,0.12)", color: "rgba(252,165,165,0.9)", border: "1px solid rgba(239,68,68,0.18)" }
              : { background: "rgba(139,92,246,0.18)", color: "rgba(167,139,250,0.95)", border: "1px solid rgba(139,92,246,0.25)" }
          }
        >
          {loading ? "Stop" : "Refine with AI"}
        </button>

        {output && !loading && (
          <button
            onClick={() => setOutput("")}
            className="px-3 py-2 rounded-xl text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {output && (
        <div
          className="mt-4 rounded-xl p-4 text-xs text-white/65 leading-relaxed whitespace-pre-wrap"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {output}
          {loading && (
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
              style={{ background: "rgba(167,139,250,0.8)", animation: "pulse 1s ease-in-out infinite" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FocusPage() {
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

    // Parse planner items
    function parsePlannerItems(key: string): PlannerItem[] {
      const raw = safeRead<unknown>(key, []);
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((x) => ({
          text: typeof x.text === "string" ? x.text : String(x),
          done: typeof x.done === "boolean" ? x.done : false,
        }));
    }

    // Planner data can be stored as {text, done} objects or raw strings
    function parseMixedPlannerKey(key: string): PlannerItem[] {
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
    const weeklyItems  = parseMixedPlannerKey(KEYS.PLANNER_WEEKLY);
    const monthlyRaw   = safeRead<string[]>(KEYS.PLANNER_MONTHLY, []);
    const monthlyItems = Array.isArray(monthlyRaw) ? monthlyRaw : [];

    const yr1 = safeRead<string[]>(KEYS.PLANNER_1YR, []);
    const yr3 = safeRead<string[]>(KEYS.PLANNER_3YR, []);
    const yr5 = safeRead<string[]>(KEYS.PLANNER_5YR, []);

    const computed = computeFocusEngine({
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
    });

    setResult(computed);
  }, []);

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-white/25 text-sm">Computing your focus…</p>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.32em] mb-3"
          style={{ color: "rgba(139,92,246,0.55)" }}
        >
          Sovereign OS · Focus Engine
        </p>
        <h1
          className="font-bold tracking-[-0.02em] leading-[1.1] mb-2"
          style={{
            fontSize: "clamp(24px, 4vw, 38px)",
            background: "linear-gradient(160deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          What should I focus on today?
        </h1>
        <p className="text-xs text-white/30">{todayLabel}</p>
      </div>

      {/* ── Scores ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-8 p-6 rounded-2xl mb-8"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <ScoreRing
          value={result.momentumScore}
          label="Momentum"
          color={
            result.momentumScore >= 70
              ? "rgba(52,211,153,0.9)"
              : result.momentumScore >= 45
                ? "rgba(245,158,11,0.9)"
                : "rgba(239,68,68,0.85)"
          }
        />

        <div className="h-12 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        <ScoreRing
          value={result.alignmentScore}
          label="Alignment"
          color={
            result.alignmentScore >= 70
              ? "rgba(139,92,246,0.9)"
              : result.alignmentScore >= 45
                ? "rgba(99,102,241,0.85)"
                : "rgba(255,255,255,0.35)"
          }
        />

        <div className="h-12 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        <div className="text-center">
          <p
            className="text-2xl font-black"
            style={{ color: "rgba(245,158,11,0.9)" }}
          >
            {result.topThree.length}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 mt-1">
            Priorities
          </p>
        </div>
      </div>

      {/* ── Top 3 Priorities ───────────────────────────────────────────── */}
      <div className="mb-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Top Priorities
        </p>
        {result.topThree.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-sm text-white/35">No priorities detected.</p>
            <p className="text-xs text-white/20 mt-1">Add tasks to your projects or items to your daily planner.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.topThree.map((p, i) => (
              <PriorityCard
                key={i}
                priority={p}
                why={result.whyItMatters[i]}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── AI Refine ──────────────────────────────────────────────────── */}
      <div className="mt-6 mb-10">
        <AIRefinePanel aiPromptContext={result.aiPromptContext} />
      </div>

      {/* ── Focus Blocks ───────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
          Today&apos;s Focus Schedule
        </p>
        <div className="space-y-2">
          {result.focusBlocks.map((block) => (
            <FocusBlockCard key={block.time} block={block} />
          ))}
        </div>
      </div>

      {/* ── Avoid List ─────────────────────────────────────────────────── */}
      {result.avoidList.length > 0 && (
        <div className="mb-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
            Avoid Today
          </p>
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(239,68,68,0.03)",
              border: "1px solid rgba(239,68,68,0.1)",
            }}
          >
            <ul className="space-y-2.5">
              {result.avoidList.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-red-400/60 mt-0.5 shrink-0 text-xs">✕</span>
                  <span className="text-xs text-white/45 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom space */}
      <div className="h-8" />
    </div>
  );
}
