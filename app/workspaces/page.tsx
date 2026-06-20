"use client";

/**
 * app/workspaces/page.tsx — Sovereign OS v7.5
 *
 * Workspace Analytics — per-workspace operational snapshot.
 * Sections: Executive Summary · Overview Cards · Compare Table ·
 *           Risk Register · Opportunities · Content Pipeline · Focus Time
 *
 * All data read from localStorage — no server calls.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";
import { setActiveWorkspaceId } from "@/lib/workspaces/activeWorkspace";
import {
  computeWorkspaceAnalytics,
  getWeekStart,
  riskLabel,
  riskColor,
  momentumColor,
} from "@/lib/workspaces/analytics";
import type { WorkspaceAnalytics } from "@/lib/workspaces/analytics";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { FocusSession } from "@/lib/types/execution";

// ── helpers ───────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>
      {children}
    </p>
  );
}

function ScoreRing({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-bold tabular-nums" style={{ color: accent ?? "rgba(255,255,255,0.75)" }}>
        {value}
      </span>
      <span className="text-[9px] text-white/25">{label}</span>
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  const color = riskColor(score);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[9px] font-bold tabular-nums w-5 text-right shrink-0" style={{ color }}>{score}</span>
    </div>
  );
}

// ── workspace card ────────────────────────────────────────────────────────────

function WorkspaceCard({
  analytics,
  isActive,
  onActivate,
}: {
  analytics: WorkspaceAnalytics;
  isActive:  boolean;
  onActivate: () => void;
}) {
  const { workspace: ws, openProjects, overdueTasks, activeOpportunities,
          contentPipeline, focusMinutesWeek, riskScore, momentumScore } = analytics;

  const mc = momentumColor(momentumScore);
  const rc = riskColor(riskScore);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: isActive
          ? `1px solid ${ws.color}40`
          : "1px solid rgba(255,255,255,0.06)",
        background: isActive
          ? `${ws.color}0a`
          : "rgba(255,255,255,0.015)",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: ws.color, opacity: 0.7 }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 flex items-center justify-between gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: ws.color, boxShadow: `0 0 8px ${ws.color}80` }}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/80 truncate">{ws.name}</p>
            <p className="text-[9px] text-white/25">{ws.type}</p>
          </div>
        </div>
        {isActive && (
          <span
            className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: `${ws.color}18`, color: `${ws.color}cc`, border: `1px solid ${ws.color}30` }}
          >
            Active
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <StatPill label="Projects" value={openProjects} />
        <StatPill
          label="Overdue"
          value={overdueTasks}
          accent={overdueTasks > 0 ? "rgba(239,68,68,0.85)" : undefined}
        />
        <StatPill
          label="Opps"
          value={activeOpportunities}
          accent={activeOpportunities > 0 ? "rgba(52,211,153,0.75)" : undefined}
        />
        <StatPill label="Content" value={contentPipeline} />
        <StatPill label="Focus min" value={focusMinutesWeek} />
        <StatPill label="Memory" value={analytics.memoryCount} />
      </div>

      {/* Score rings */}
      <div className="px-4 py-3 flex items-center justify-around gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={momentumScore} color={mc} />
          <p className="text-[8px] text-white/25">Momentum</p>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.05)" }} />
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={riskScore} color={rc} />
          <p className="text-[8px] text-white/25">Risk</p>
        </div>
        {analytics.riskFactors.length > 0 && (
          <div className="flex-1 min-w-0 pl-2">
            {analytics.riskFactors.slice(0, 2).map((f, i) => (
              <p key={i} className="text-[8px] text-white/30 leading-snug truncate">· {f}</p>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 flex items-center gap-2">
        {!isActive && (
          <button
            onClick={onActivate}
            className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: `${ws.color}12`,
              border: `1px solid ${ws.color}28`,
              color: `${ws.color}cc`,
            }}
          >
            Set Active
          </button>
        )}
        <Link
          href="/"
          onClick={onActivate}
          className="text-[9px] text-white/30 hover:text-white/55 transition-colors ml-auto"
        >
          View Dashboard →
        </Link>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics[]>([]);
  const [activeId,  setActiveId]  = useState<string>("personal");
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    const todayStr    = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStart(todayStr);

    const stored = safeRead<Workspace[]>(KEYS.WORKSPACES, []);
    const hasPersonal = stored.some((w) => w.id === "personal");
    const workspaces  = hasPersonal ? stored : [DEFAULT_WORKSPACE, ...stored];

    const currentActiveId = (() => {
      try {
        const raw = localStorage.getItem(KEYS.ACTIVE_WORKSPACE_ID);
        return raw ? (JSON.parse(raw) as string) : "personal";
      } catch { return "personal"; }
    })();
    setActiveId(currentActiveId);

    const result = computeWorkspaceAnalytics({
      workspaces,
      projects:      safeRead<Project[]>(KEYS.PROJECTS, []),
      projectTasks:  safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []),
      memoryItems:   safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []),
      contentItems:  safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []),
      opportunities: safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []),
      people:        safeRead<Person[]>(KEYS.RELATIONSHIPS, []),
      focusSessions: safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []),
      todayStr,
      weekStartStr,
    });

    setAnalytics(result);
    setLoaded(true);
  }, []);

  function handleActivate(wsId: string) {
    setActiveId(wsId);
    setActiveWorkspaceId(wsId);
  }

  if (!loaded) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ height: 120, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Executive summary aggregates
  const totalProjects   = analytics.reduce((s, a) => s + a.openProjects, 0);
  const totalOverdue    = analytics.reduce((s, a) => s + a.overdueTasks, 0);
  const totalOpps       = analytics.reduce((s, a) => s + a.activeOpportunities, 0);
  const totalFocus      = analytics.reduce((s, a) => s + a.focusMinutesWeek, 0);
  const totalContent    = analytics.reduce((s, a) => s + a.contentPipeline, 0);

  const highestRisk     = analytics.reduce((a, b) => a.riskScore     > b.riskScore     ? a : b, analytics[0]);
  const highestMomentum = analytics.reduce((a, b) => a.momentumScore > b.momentumScore ? a : b, analytics[0]);

  // Sorted views
  const byRisk      = [...analytics].sort((a, b) => b.riskScore - a.riskScore);
  const byMomentum  = [...analytics].sort((a, b) => b.momentumScore - a.momentumScore);

  // Opps detail
  const allOpps = (() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.OPPORTUNITIES);
      return raw ? (JSON.parse(raw) as Opportunity[]) : [];
    } catch { return []; }
  })();

  return (
    <div className="px-6 py-8 space-y-10 max-w-5xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(99,102,241,0.6)" }}>
            Workspace Analytics
          </p>
          <h1 className="text-2xl font-bold text-white/85 tracking-tight leading-none">
            Operations Overview
          </h1>
          <p className="text-xs text-white/30 mt-1.5">{dateLabel}</p>
        </div>
        <Link
          href="/settings"
          className="text-[9px] font-semibold px-3 py-1.5 rounded-xl shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
        >
          Manage →
        </Link>
      </div>

      {/* ── Executive Summary ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>All Workspaces — Executive Summary</SectionLabel>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}
        >
          {/* Stats row */}
          <div className="grid grid-cols-5 divide-x divide-white/[0.04] px-0">
            {[
              { label: "Open Projects",  value: totalProjects },
              { label: "Overdue Tasks",  value: totalOverdue,  accent: totalOverdue  > 0 ? "rgba(239,68,68,0.85)"    : undefined },
              { label: "Active Opps",    value: totalOpps,     accent: totalOpps     > 0 ? "rgba(52,211,153,0.75)"   : undefined },
              { label: "Content Pipeline", value: totalContent },
              { label: "Focus Min/Wk",   value: totalFocus },
            ].map(({ label, value, accent }) => (
              <div key={label} className="py-4 flex flex-col items-center gap-0.5">
                <span className="text-lg font-bold tabular-nums" style={{ color: accent ?? "rgba(255,255,255,0.75)" }}>
                  {value}
                </span>
                <span className="text-[9px] text-white/25 text-center px-2">{label}</span>
              </div>
            ))}
          </div>

          {/* Highlights row */}
          {analytics.length > 1 && (
            <div
              className="px-5 py-3 flex items-center gap-6 flex-wrap"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.008)" }}
            >
              {highestRisk && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: riskColor(highestRisk.riskScore) }}>
                    Highest Risk
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: highestRisk.workspace.color }}
                  />
                  <span className="text-[10px] text-white/55">{highestRisk.workspace.name}</span>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: riskColor(highestRisk.riskScore) }}>
                    {highestRisk.riskScore}
                  </span>
                </div>
              )}
              <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
              {highestMomentum && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: momentumColor(highestMomentum.momentumScore) }}>
                    Top Momentum
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: highestMomentum.workspace.color }}
                  />
                  <span className="text-[10px] text-white/55">{highestMomentum.workspace.name}</span>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: momentumColor(highestMomentum.momentumScore) }}>
                    {highestMomentum.momentumScore}
                  </span>
                </div>
              )}
              <Link
                href="/"
                onClick={() => handleActivate("all")}
                className="text-[9px] text-white/25 hover:text-white/50 transition-colors ml-auto"
              >
                View All Workspaces →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Workspace Overview Cards ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Workspace Overview</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analytics.map((a) => (
            <WorkspaceCard
              key={a.workspace.id}
              analytics={a}
              isActive={activeId === a.workspace.id}
              onActivate={() => handleActivate(a.workspace.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Compare Table ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Compare Workspaces</SectionLabel>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)" }}
        >
          {/* Table header */}
          <div
            className="grid text-[8px] font-bold uppercase tracking-[0.15em] text-white/20 px-4 py-2.5"
            style={{
              gridTemplateColumns: "minmax(100px,1.5fr) repeat(7,1fr)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span>Workspace</span>
            <span className="text-center">Projects</span>
            <span className="text-center">Overdue</span>
            <span className="text-center">Opps</span>
            <span className="text-center">Content</span>
            <span className="text-center">Memory</span>
            <span className="text-center">Focus</span>
            <span className="text-center">Risk / Mom</span>
          </div>

          {analytics.map((a, i) => (
            <div
              key={a.workspace.id}
              className="grid items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
              style={{
                gridTemplateColumns: "minmax(100px,1.5fr) repeat(7,1fr)",
                borderBottom: i < analytics.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
              }}
              onClick={() => handleActivate(a.workspace.id)}
            >
              {/* Name */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.workspace.color }} />
                <span className="text-[11px] font-semibold text-white/65 truncate">{a.workspace.name}</span>
                {activeId === a.workspace.id && (
                  <span className="text-[7px] text-white/25">●</span>
                )}
              </div>

              {/* Metrics */}
              <span className="text-[11px] tabular-nums text-white/50 text-center">{a.openProjects}</span>
              <span
                className="text-[11px] tabular-nums text-center font-semibold"
                style={{ color: a.overdueTasks > 0 ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.3)" }}
              >
                {a.overdueTasks}
              </span>
              <span
                className="text-[11px] tabular-nums text-center"
                style={{ color: a.activeOpportunities > 0 ? "rgba(52,211,153,0.65)" : "rgba(255,255,255,0.3)" }}
              >
                {a.activeOpportunities}
              </span>
              <span className="text-[11px] tabular-nums text-white/50 text-center">{a.contentPipeline}</span>
              <span className="text-[11px] tabular-nums text-white/50 text-center">{a.memoryCount}</span>
              <span className="text-[11px] tabular-nums text-white/50 text-center">{a.focusMinutesWeek}m</span>

              {/* Risk / Momentum */}
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-[9px] font-bold tabular-nums" style={{ color: riskColor(a.riskScore) }}>
                  {a.riskScore}
                </span>
                <span className="text-[9px] text-white/15">/</span>
                <span className="text-[9px] font-bold tabular-nums" style={{ color: momentumColor(a.momentumScore) }}>
                  {a.momentumScore}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Register ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Risk Register</SectionLabel>
        <div className="space-y-2">
          {byRisk.map((a) => (
            <div
              key={a.workspace.id}
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.workspace.color }} />
                <p className="text-xs font-semibold text-white/70 flex-1">{a.workspace.name}</p>
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    color: riskColor(a.riskScore),
                    background: riskColor(a.riskScore).replace("0.85", "0.08").replace("0.7", "0.07"),
                  }}
                >
                  {riskLabel(a.riskScore)}
                </span>
              </div>
              <RiskBar score={a.riskScore} />
              {a.riskFactors.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {a.riskFactors.map((f, i) => (
                    <p key={i} className="text-[9px] text-white/25">· {f}</p>
                  ))}
                </div>
              )}
              {a.riskFactors.length === 0 && (
                <p className="text-[9px] text-white/20 mt-1.5">No active risk factors.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Opportunities by Workspace ───────────────────────────────────────── */}
      <div>
        <SectionLabel>Opportunities by Workspace</SectionLabel>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)" }}
        >
          {analytics.map((a, i) => {
            const wsOpps = allOpps.filter((o) => {
              if (a.workspace.id === "personal") return !o.workspace_id || o.workspace_id === "personal";
              return o.workspace_id === a.workspace.id;
            }).filter((o) => o.status === "Detected" || o.status === "Reviewing" || o.status === "Active");

            const topOpp = wsOpps.sort((x, y) => y.score - x.score)[0];

            return (
              <div
                key={a.workspace.id}
                className="px-4 py-3 flex items-center gap-4"
                style={{ borderBottom: i < analytics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.workspace.color }} />
                <p className="text-[11px] font-semibold text-white/60 w-28 shrink-0 truncate">{a.workspace.name}</p>
                <span
                  className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-lg shrink-0"
                  style={{
                    background: a.activeOpportunities > 0 ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.03)",
                    color: a.activeOpportunities > 0 ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.2)",
                  }}
                >
                  {a.activeOpportunities} active
                </span>
                {topOpp ? (
                  <p className="text-[10px] text-white/35 flex-1 min-w-0 truncate">
                    Top: {topOpp.title}
                    <span className="text-white/20 ml-1">({topOpp.score})</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-white/15 flex-1">No active opportunities</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content Pipeline by Workspace ────────────────────────────────────── */}
      <div>
        <SectionLabel>Content Pipeline by Workspace</SectionLabel>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)" }}
        >
          {analytics.map((a, i) => (
            <div
              key={a.workspace.id}
              className="px-4 py-3 flex items-center gap-4"
              style={{ borderBottom: i < analytics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.workspace.color }} />
              <p className="text-[11px] font-semibold text-white/60 w-28 shrink-0 truncate">{a.workspace.name}</p>
              <div className="flex items-center gap-2 flex-1">
                {/* Mini bar */}
                {(analytics.reduce((max, x) => Math.max(max, x.contentPipeline), 0) > 0) && (
                  <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((a.contentPipeline / Math.max(...analytics.map((x) => x.contentPipeline), 1)) * 100)}%`,
                        background: a.workspace.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                )}
                <span className="text-[10px] tabular-nums text-white/40 shrink-0 w-16 text-right">
                  {a.contentPipeline} in pipeline
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Focus by Workspace ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Focus Time This Week</SectionLabel>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)" }}
        >
          {byMomentum.map((a, i) => (
            <div
              key={a.workspace.id}
              className="px-4 py-3 flex items-center gap-4"
              style={{ borderBottom: i < analytics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.workspace.color }} />
              <p className="text-[11px] font-semibold text-white/60 w-28 shrink-0 truncate">{a.workspace.name}</p>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((a.focusMinutesWeek / Math.max(...analytics.map((x) => x.focusMinutesWeek), 1, 120)) * 100)}%`,
                    background: momentumColor(a.momentumScore),
                    opacity: 0.75,
                  }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-white/40 shrink-0 w-24 text-right">
                {a.focusMinutesWeek} min · {a.focusSessionsWeek} session{a.focusSessionsWeek !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Link to focus engine */}
        <div className="mt-3 flex justify-end">
          <Link
            href="/focus"
            className="text-[9px] text-white/20 hover:text-white/45 transition-colors"
          >
            Start a focus session →
          </Link>
        </div>
      </div>

    </div>
  );
}
