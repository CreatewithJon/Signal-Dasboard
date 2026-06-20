"use client";

/**
 * components/RevenueCard.tsx — Sovereign OS v7.7
 *
 * Compact revenue intelligence card for the homepage Executive zone.
 * Shows: forecast, goal gap, highest-value workspace, top risk.
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
  gapColor,
  riskSeverityColor,
  type RevenueSnapshot,
  type RevenueSettings,
} from "@/lib/revenue/engine";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function RevenueCard() {
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    const todayStr   = new Date().toISOString().slice(0, 10);
    const revSettings = safeRead<RevenueSettings>(KEYS.REVENUE_SETTINGS, DEFAULT_REVENUE_SETTINGS);

    const storedWorkspaces = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const hasPersonal      = storedWorkspaces.some((w) => w.id === "personal");
    const allWorkspaces    = hasPersonal ? storedWorkspaces : [DEFAULT_WORKSPACE, ...storedWorkspaces];

    const snap = computeRevenueSnapshot({
      workspaces:    allWorkspaces,
      opportunities: safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []),
      people:        safeRead<Person[]>(KEYS.RELATIONSHIPS, []),
      projects:      safeRead<Project[]>(KEYS.PROJECTS, []),
      settings:      revSettings,
      todayStr,
    });

    setSnapshot(snap);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.012)",
          height: 96,
        }}
      />
    );
  }

  if (!snapshot) return null;

  const { totalExpectedRevenue, revenueGoal, revenueGap, highestValueWorkspace, risks } = snapshot;
  const topRisk   = risks[0] ?? null;
  const gc        = gapColor(revenueGap);
  const goalPct   = revenueGoal > 0
    ? Math.min(100, Math.round((totalExpectedRevenue / revenueGoal) * 100))
    : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(52,211,153,0.12)",
        background: "rgba(52,211,153,0.02)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.18)",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M2 12l3-3 3 2 3-5 3-2" stroke="rgba(52,211,153,0.85)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="4" r="1.5" fill="rgba(52,211,153,0.6)" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Revenue</p>
            <p className="text-[9px] text-white/25 mt-0.5">Intelligence layer</p>
          </div>
        </div>
        <Link
          href="/revenue"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.16)",
            color: "rgba(52,211,153,0.7)",
          }}
        >
          Full report →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Forecast + Gap */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.12em] font-semibold mb-0.5">Forecast</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "rgba(52,211,153,0.85)" }}>
              {formatCurrency(totalExpectedRevenue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-[0.12em] font-semibold mb-0.5">
              {revenueGap > 0 ? "Gap to Goal" : "Above Goal"}
            </p>
            <p className="text-base font-bold tabular-nums" style={{ color: gc }}>
              {revenueGap > 0 ? `-${formatCurrency(revenueGap)}` : `+${formatCurrency(Math.abs(revenueGap))}`}
            </p>
          </div>
        </div>

        {/* Goal progress bar */}
        <div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${goalPct}%`, background: gc }}
            />
          </div>
          <p className="text-[8px] text-white/20 mt-1">{goalPct}% of {formatCurrency(revenueGoal)} monthly goal</p>
        </div>

        {/* Highest-value workspace */}
        {highestValueWorkspace && highestValueWorkspace.expectedRevenue > 0 && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: highestValueWorkspace.workspace.color }}
              />
              <p className="text-[9px] text-white/25 uppercase tracking-[0.1em] font-semibold shrink-0">
                Top Workspace
              </p>
              <p className="text-[10px] font-semibold text-white/55 truncate flex-1">
                {highestValueWorkspace.workspace.name}
              </p>
              <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: "rgba(52,211,153,0.75)" }}>
                {formatCurrency(highestValueWorkspace.expectedRevenue)}
              </span>
            </div>
          </>
        )}

        {/* Top risk */}
        {topRisk && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
            <div className="flex items-start gap-2">
              <span
                className="text-[7px] font-bold uppercase px-1 py-0.5 rounded shrink-0 mt-0.5"
                style={{
                  color: riskSeverityColor(topRisk.severity),
                  background: riskSeverityColor(topRisk.severity).replace("0.85", "0.08").replace("0.75", "0.08"),
                }}
              >
                {topRisk.severity[0]}
              </span>
              <p className="text-[9px] text-white/40 leading-relaxed line-clamp-2">{topRisk.message}</p>
            </div>
          </>
        )}

        {/* Empty state */}
        {totalExpectedRevenue === 0 && (
          <p className="text-[9px] text-white/20 text-center py-1">
            Add estimated values to your opportunities to see forecasts.
          </p>
        )}
      </div>
    </div>
  );
}
