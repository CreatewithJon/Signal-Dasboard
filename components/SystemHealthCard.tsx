"use client";

/**
 * components/SystemHealthCard.tsx — Sovereign OS v7.6
 *
 * Compact system health widget for the homepage Executive zone.
 * Shows: overall status · warning count · sync state · link to /system
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSyncHealth } from "@/lib/supabase/syncHealth";
import { isDemoMode } from "@/lib/demo/demoMode";
import { computeWorkspaceAnalytics, getWeekStart } from "@/lib/workspaces/analytics";
import {
  computeSystemHealth,
  statusColor,
  statusBg,
  statusBorder,
  severityColor,
  type SystemHealthReport,
  type HealthStatus,
} from "@/lib/systemHealth/engine";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { MemoryItem } from "@/lib/types/memory";
import type { ContentItem } from "@/lib/types/content";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { FocusSession } from "@/lib/types/execution";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function StatusIndicator({ status }: { status: HealthStatus }) {
  const color = statusColor(status);
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: color,
          boxShadow: status !== "Healthy" ? `0 0 6px ${color}` : undefined,
        }}
      />
      <span className="text-xs font-bold" style={{ color }}>
        {status}
      </span>
    </div>
  );
}

export default function SystemHealthCard() {
  const [report,  setReport]  = useState<SystemHealthReport | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const todayStr     = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStart(todayStr);

    // Storage probe
    let lsAvailable = false;
    try { localStorage.setItem("__h__", "1"); localStorage.removeItem("__h__"); lsAvailable = true; } catch { /* noop */ }

    const { configured } = getSupabaseStatus();
    const syncReport     = getSyncHealth();
    const demoActive     = isDemoMode();

    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks  = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const focusSessions = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);

    const storedWorkspaces = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const hasPersonal      = storedWorkspaces.some((w) => w.id === "personal");
    const allWorkspaces    = hasPersonal ? storedWorkspaces : [DEFAULT_WORKSPACE, ...storedWorkspaces];

    const wsAnalytics = computeWorkspaceAnalytics({
      workspaces: allWorkspaces,
      projects, projectTasks, memoryItems, contentItems,
      opportunities, people, focusSessions,
      todayStr, weekStartStr,
    });

    const health = computeSystemHealth({
      localStorageAvailable:  lsAvailable,
      localItemCount:         typeof window !== "undefined" ? localStorage.length : 0,
      supabaseConfigured:     configured,
      supabaseAuthenticated:  false, // conservative — async check not needed for card
      syncReport,
      anthropicConfigured:    false, // unknown from client; shown accurately on /system page
      openaiConfigured:       false,
      projects, projectTasks, memoryItems, contentItems, opportunities, people,
      focusSessionCount:      focusSessions.length,
      workspaceAnalytics:     wsAnalytics,
      isDemoMode:             demoActive,
      todayStr,
    });

    setReport(health);
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

  if (!report) return null;

  const { overallStatus, warningCounts, storage } = report;
  const sColor  = statusColor(overallStatus);
  const sBg     = statusBg(overallStatus);
  const sBorder = statusBorder(overallStatus);

  // Top 2 warnings for the preview
  const topWarnings = report.warnings.slice(0, 2);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${sBorder}`, background: sBg }}
    >
      {/* Header */}
      <div
        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: sBg, border: `1px solid ${sBorder}` }}
          >
            {/* pulse icon */}
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M1 8h3l2-5 2 10 2-6 2 4 1-3h2" stroke={sColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">System Health</p>
            <p className="text-[9px] text-white/25 mt-0.5">Operational status</p>
          </div>
        </div>
        <Link
          href="/system"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: sBg,
            border:     `1px solid ${sBorder}`,
            color:      sColor.replace("0.85", "0.7").replace("0.75", "0.7"),
          }}
        >
          Full report →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Status + counts */}
        <div className="flex items-center justify-between">
          <StatusIndicator status={overallStatus} />
          <div className="flex items-center gap-3 text-[9px]">
            {warningCounts.critical > 0 && (
              <span style={{ color: "rgba(239,68,68,0.75)" }} className="font-bold">
                {warningCounts.critical}C
              </span>
            )}
            {warningCounts.high > 0 && (
              <span style={{ color: "rgba(245,158,11,0.75)" }} className="font-bold">
                {warningCounts.high}H
              </span>
            )}
            {warningCounts.medium > 0 && (
              <span style={{ color: "rgba(167,139,250,0.65)" }} className="font-bold">
                {warningCounts.medium}M
              </span>
            )}
            {warningCounts.total === 0 && (
              <span className="text-white/25">No warnings</span>
            )}
          </div>
        </div>

        {/* Sync state */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">Sync</span>
          <span
            className="text-[10px] font-semibold capitalize"
            style={{
              color: storage.fallbackMode
                ? "rgba(245,158,11,0.7)"
                : "rgba(52,211,153,0.75)",
            }}
          >
            {storage.fallbackMode
              ? storage.supabaseConfigured
                ? `${storage.failedWrites > 0 ? `${storage.failedWrites} failed` : "Fallback"}`
                : "Local only"
              : "Synced"}
          </span>
        </div>

        {/* Top warnings preview */}
        {topWarnings.length > 0 && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
            <div className="space-y-1.5">
              {topWarnings.map((w, i) => {
                const wc  = severityColor(w.severity);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="text-[7px] font-bold uppercase tracking-wide px-1 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ color: wc, background: wc.replace("0.85", "0.08").replace("0.75", "0.08") }}
                    >
                      {w.severity[0]}
                    </span>
                    <p className="text-[10px] text-white/45 leading-relaxed line-clamp-1">{w.message}</p>
                  </div>
                );
              })}
              {warningCounts.total > 2 && (
                <p className="text-[9px] text-white/20 pl-4">
                  +{warningCounts.total - 2} more warning{warningCounts.total - 2 > 1 ? "s" : ""} →
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
