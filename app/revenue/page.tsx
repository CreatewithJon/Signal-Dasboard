"use client";

/**
 * app/revenue/page.tsx — Sovereign OS v7.7
 *
 * Revenue Intelligence — executive revenue layer.
 * Sections:
 *   1. Executive Revenue Summary
 *   2. Revenue by Workspace
 *   3. Pipeline Forecast
 *   4. Revenue Risks
 *   5. Revenue Suggestions
 *   6. Goal Tracking
 *
 * All data from localStorage — no server calls.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { Project } from "@/lib/types/projects";
import {
  computeRevenueSnapshot,
  DEFAULT_REVENUE_SETTINGS,
  formatCurrency,
  confidenceColor,
  riskSeverityColor,
  gapColor,
  type RevenueSnapshot,
  type RevenueSettings,
} from "@/lib/revenue/engine";

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
    <p
      className="text-[9px] font-bold uppercase tracking-[0.22em] mb-3"
      style={{ color: "rgba(255,255,255,0.2)" }}
    >
      {children}
    </p>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className ?? ""}`}
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-1.5 py-5 items-center text-center">
      <span
        className="text-2xl font-bold tabular-nums tracking-tight"
        style={{ color: accent ?? "rgba(255,255,255,0.85)" }}
      >
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
        {label}
      </span>
      {sub && <span className="text-[9px] text-white/20">{sub}</span>}
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [settings, setSettings] = useState<RevenueSettings>(DEFAULT_REVENUE_SETTINGS);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const storedSettings = safeRead<RevenueSettings>(KEYS.REVENUE_SETTINGS, DEFAULT_REVENUE_SETTINGS);
    setSettings(storedSettings);

    const storedWorkspaces = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const hasPersonal      = storedWorkspaces.some((w) => w.id === "personal");
    const allWorkspaces    = hasPersonal ? storedWorkspaces : [DEFAULT_WORKSPACE, ...storedWorkspaces];

    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);

    const snap = computeRevenueSnapshot({
      workspaces: allWorkspaces,
      opportunities,
      people,
      projects,
      settings: storedSettings,
      todayStr,
    });

    setSnapshot(snap);
    setLoaded(true);
  }, []);

  if (!loaded || !snapshot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.03)" }}
          />
        ))}
      </div>
    );
  }

  const {
    totalPipelineValue, totalExpectedRevenue, totalClosedRevenue,
    revenueGoal, revenueGap,
    highestValueWorkspace, workspaceSummaries,
    risks, suggestions,
  } = snapshot;

  const goalPct = revenueGoal > 0
    ? Math.min(100, Math.round((totalExpectedRevenue / revenueGoal) * 100))
    : 0;

  const maxPipeline = Math.max(...workspaceSummaries.map((w) => w.pipelineValue), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.3em] mb-1"
            style={{ color: "rgba(52,211,153,0.5)" }}
          >
            Sovereign OS
          </p>
          <h1
            className="text-2xl font-bold tracking-tight leading-none mb-1"
            style={{
              background: "linear-gradient(165deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Revenue Intelligence
          </h1>
          <p className="text-xs text-white/30">Where money comes from — pipeline, forecast, gaps, and actions</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/opportunities"
            className="text-[9px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.18)",
              color: "rgba(52,211,153,0.7)",
            }}
          >
            Manage Opportunities →
          </Link>
          <Link
            href="/settings#revenue"
            className="text-[9px] font-semibold px-3 py-1.5 rounded-lg transition-all text-white/30"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            Revenue Settings
          </Link>
        </div>
      </div>

      {/* ── Section 1: Executive Revenue Summary ─────────────────────────── */}
      <div>
        <SectionLabel>Section 1 — Executive Revenue Summary</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Pipeline"
            value={formatCurrency(totalPipelineValue)}
            sub="Total estimated value"
            accent="rgba(255,255,255,0.75)"
          />
          <StatCard
            label="Forecast"
            value={formatCurrency(totalExpectedRevenue)}
            sub={`${settings.defaultCloseProbability * 100}% avg close prob`}
            accent="rgba(52,211,153,0.85)"
          />
          <StatCard
            label="Closed"
            value={formatCurrency(totalClosedRevenue)}
            sub="Converted opportunities"
            accent="rgba(99,102,241,0.85)"
          />
          <StatCard
            label={revenueGap > 0 ? "Gap to Goal" : "Above Goal"}
            value={formatCurrency(Math.abs(revenueGap))}
            sub={`vs $${(revenueGoal / 1000).toFixed(1)}k monthly goal`}
            accent={gapColor(revenueGap)}
          />
        </div>

        {highestValueWorkspace && (
          <div
            className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(52,211,153,0.04)",
              border: "1px solid rgba(52,211,153,0.12)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: highestValueWorkspace.workspace.color }}
            />
            <p className="text-xs text-white/50 flex-1">
              Highest-value workspace:{" "}
              <span className="font-semibold text-white/75">
                {highestValueWorkspace.workspace.name}
              </span>{" "}
              — {formatCurrency(highestValueWorkspace.expectedRevenue)} expected
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Revenue by Workspace ─────────────────────────────── */}
      <div>
        <SectionLabel>Section 2 — Revenue by Workspace</SectionLabel>
        {workspaceSummaries.length === 0 ? (
          <Card>
            <p className="text-xs text-white/30 text-center py-4">No workspaces configured.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Workspace", "Pipeline", "Forecast", "Closed", "Opps", "Overdue", "Confidence", "Goal Gap"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workspaceSummaries.map((ws) => {
                  const cc  = confidenceColor(ws.confidenceScore);
                  const gc  = gapColor(ws.revenueGap);
                  return (
                    <tr key={ws.workspace.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ws.workspace.color }} />
                          <span className="text-white/65 font-medium truncate max-w-[100px]">{ws.workspace.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 tabular-nums font-semibold">
                        {formatCurrency(ws.pipelineValue)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color: "rgba(52,211,153,0.8)" }}>
                        {formatCurrency(ws.expectedRevenue)}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "rgba(99,102,241,0.75)" }}>
                        {formatCurrency(ws.closedRevenue)}
                      </td>
                      <td className="px-4 py-3 text-white/45 tabular-nums">{ws.activeOpportunityCount}</td>
                      <td className="px-4 py-3 tabular-nums">
                        <span style={{ color: ws.overdueOpportunityCount > 0 ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.25)" }}>
                          {ws.overdueOpportunityCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${ws.confidenceScore}%`, background: cc }} />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums" style={{ color: cc }}>
                            {ws.confidenceScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: gc }}>
                          {ws.revenueGap > 0 ? `-${formatCurrency(ws.revenueGap)}` : `+${formatCurrency(Math.abs(ws.revenueGap))}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Pipeline Forecast ─────────────────────────────────── */}
      <div>
        <SectionLabel>Section 3 — Pipeline Forecast</SectionLabel>
        <Card>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-4">
            Expected Revenue by Workspace
          </p>
          {workspaceSummaries.filter((w) => w.pipelineValue > 0).length === 0 ? (
            <p className="text-xs text-white/25 py-4 text-center">
              No opportunity values set. Add estimated values to your opportunities to see forecast data.
            </p>
          ) : (
            <div className="space-y-3">
              {workspaceSummaries
                .filter((w) => w.pipelineValue > 0)
                .sort((a, b) => b.expectedRevenue - a.expectedRevenue)
                .map((ws) => {
                  const pipelineWidth = (ws.pipelineValue / maxPipeline) * 100;
                  const expectedWidth = (ws.expectedRevenue / maxPipeline) * 100;
                  return (
                    <div key={ws.workspace.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ws.workspace.color }} />
                          <span className="text-[10px] font-semibold text-white/55">{ws.workspace.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] tabular-nums">
                          <span className="text-white/30">{formatCurrency(ws.pipelineValue)} pipeline</span>
                          <span className="font-bold" style={{ color: "rgba(52,211,153,0.8)" }}>
                            {formatCurrency(ws.expectedRevenue)} expected
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                        {/* Pipeline bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${pipelineWidth}%`,
                            background: "rgba(255,255,255,0.08)",
                          }}
                        />
                        {/* Expected bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${expectedWidth}%`,
                            background: `linear-gradient(90deg, rgba(52,211,153,0.6), rgba(52,211,153,0.3))`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              <p className="text-[8px] text-white/15 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                Light bar = pipeline value · Green bar = expected revenue (pipeline × close probability)
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Section 4: Revenue Risks ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 4 — Revenue Risks</SectionLabel>
        {risks.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 py-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "rgba(52,211,153,0.8)" }} />
              <p className="text-sm font-semibold" style={{ color: "rgba(52,211,153,0.85)" }}>
                No revenue risks detected
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {risks.map((r, i) => {
              const rc  = riskSeverityColor(r.severity);
              const rbg = rc.replace("0.85", "0.06").replace("0.75", "0.06");
              const rbd = rc.replace("0.85", "0.18").replace("0.75", "0.15");
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: rbg, border: `1px solid ${rbd}` }}
                >
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                    style={{ color: rc, background: rbg, border: `1px solid ${rbd}` }}
                  >
                    {r.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-white/70 leading-relaxed">{r.message}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{r.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 5: Revenue Suggestions ───────────────────────────────── */}
      <div>
        <SectionLabel>Section 5 — Revenue Suggestions</SectionLabel>
        {suggestions.length === 0 ? (
          <Card>
            <p className="text-xs text-white/30 text-center py-4">
              Add opportunity values and contacts to unlock revenue suggestions.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {suggestions.slice(0, 8).map((s, i) => {
              const isHigh = s.priority === "High";
              const color  = isHigh ? "rgba(52,211,153,0.75)" : "rgba(167,139,250,0.65)";
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                    style={{
                      color,
                      background: color.replace("0.75", "0.07").replace("0.65", "0.07"),
                      border: `1px solid ${color.replace("0.75", "0.2").replace("0.65", "0.18")}`,
                    }}
                  >
                    {s.priority}
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-white/70 leading-relaxed">{s.action}</p>
                    <p className="text-[9px] text-white/30 mt-0.5 leading-relaxed">{s.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 6: Goal Tracking ──────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 6 — Goal Tracking</SectionLabel>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-0.5">Monthly Revenue Goal</p>
              <p className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                {formatCurrency(revenueGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-0.5">Expected</p>
              <p className="text-2xl font-bold" style={{ color: "rgba(52,211,153,0.85)" }}>
                {formatCurrency(totalExpectedRevenue)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full mb-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${goalPct}%`,
                background: `linear-gradient(90deg, ${gapColor(revenueGap)}, ${gapColor(revenueGap).replace("0.85", "0.5").replace("0.75", "0.5")})`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] text-white/30">
            <span>{goalPct}% of goal</span>
            <span
              className="font-semibold"
              style={{ color: gapColor(revenueGap) }}
            >
              {revenueGap > 0
                ? `${formatCurrency(revenueGap)} to go`
                : `${formatCurrency(Math.abs(revenueGap))} above goal`}
            </span>
          </div>

          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[9px] text-white/20">
              Pipeline: {formatCurrency(totalPipelineValue)} · Closed: {formatCurrency(totalClosedRevenue)}
            </p>
            <Link
              href="/settings#revenue"
              className="text-[9px] font-semibold text-white/25 hover:text-white/50 transition-colors"
            >
              Set goal →
            </Link>
          </div>
        </Card>
      </div>

      {/* Bottom space */}
      <div className="h-12" />
    </div>
  );
}
