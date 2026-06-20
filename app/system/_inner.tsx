"use client";

/**
 * app/system/_inner.tsx — Sovereign OS v7.6
 *
 * System Health & Observability — executive visibility dashboard.
 * Sections:
 *   1. Overall Status
 *   2. Storage Health
 *   3. AI Health
 *   4. Data Health
 *   5. Workspace Health
 *   6. Warnings
 *   7. Quick Actions
 *
 * All data from localStorage — no server calls.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSyncHealth } from "@/lib/supabase/syncHealth";
import { isDemoMode } from "@/lib/demo/demoMode";
import { computeWorkspaceAnalytics, getWeekStart, riskLabel, riskColor, momentumColor } from "@/lib/workspaces/analytics";
import { computeSystemHealth, statusColor, statusBg, statusBorder, severityColor, type SystemHealthReport } from "@/lib/systemHealth/engine";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";
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

function countLocalItems(): number {
  if (typeof window === "undefined") return 0;
  try { return localStorage.length; } catch { return 0; }
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>
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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
      style={{ background: ok ? "rgba(52,211,153,0.8)" : "rgba(239,68,68,0.8)" }}
    />
  );
}

function DataCountRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[11px] text-white/45">{label}</span>
      <span
        className="text-[13px] font-bold tabular-nums"
        style={{ color: accent ?? "rgba(255,255,255,0.75)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  hasAnthropicKey: boolean;
  hasOpenAIKey:    boolean;
}

// ── main component ────────────────────────────────────────────────────────────

export default function SystemHealthInner({ hasAnthropicKey, hasOpenAIKey }: Props) {
  const [report,  setReport]  = useState<SystemHealthReport | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const todayStr    = new Date().toISOString().slice(0, 10);
    const weekStartStr = getWeekStart(todayStr);

    // Storage checks
    let lsAvailable = false;
    try { localStorage.setItem("__health_probe__", "1"); localStorage.removeItem("__health_probe__"); lsAvailable = true; } catch { /* noop */ }
    const localItemCount    = countLocalItems();
    const { configured }    = getSupabaseStatus();
    const syncReport        = getSyncHealth();
    const demoActive        = isDemoMode();

    // Auth — we can only check Supabase configured state synchronously;
    // authenticated status is async. We default to false (conservative).
    // Settings page handles the full async auth check.
    const supabaseAuthenticated = false; // conservative — accurate enough for health display

    // Load all data
    const projects       = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks   = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const memoryItems    = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);
    const contentItems   = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const opportunities  = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const people         = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const focusSessions  = safeRead<FocusSession[]>(KEYS.FOCUS_SESSIONS, []);

    // Workspace analytics
    const storedWorkspaces = safeRead<Workspace[]>(KEYS.WORKSPACES, [DEFAULT_WORKSPACE]);
    const hasPersonal      = storedWorkspaces.some((w) => w.id === "personal");
    const allWorkspaces    = hasPersonal ? storedWorkspaces : [DEFAULT_WORKSPACE, ...storedWorkspaces];
    const wsAnalytics      = computeWorkspaceAnalytics({
      workspaces: allWorkspaces,
      projects, projectTasks, memoryItems, contentItems, opportunities, people, focusSessions,
      todayStr, weekStartStr,
    });

    const health = computeSystemHealth({
      localStorageAvailable:  lsAvailable,
      localItemCount,
      supabaseConfigured:     configured,
      supabaseAuthenticated,
      syncReport,
      anthropicConfigured:    hasAnthropicKey,
      openaiConfigured:       hasOpenAIKey,
      projects, projectTasks, memoryItems, contentItems, opportunities, people,
      focusSessionCount:      focusSessions.length,
      workspaceAnalytics:     wsAnalytics,
      isDemoMode:             demoActive,
      todayStr,
    });

    setReport(health);
    setLoaded(true);
  }, [hasAnthropicKey, hasOpenAIKey]);

  if (!loaded || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        ))}
      </div>
    );
  }

  const { overallStatus, storage, ai, data, workspaceHealth, warnings, warningCounts, lastUpdated } = report;
  const sColor  = statusColor(overallStatus);
  const sBg     = statusBg(overallStatus);
  const sBorder = statusBorder(overallStatus);

  const updatedAt = new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: "rgba(52,211,153,0.5)" }}>
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
            System Health
          </h1>
          <p className="text-xs text-white/30">Operational observability — updated at {updatedAt}</p>
        </div>

        {/* Overall status badge */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shrink-0"
          style={{ background: sBg, border: `1px solid ${sBorder}` }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: sColor, boxShadow: `0 0 8px ${sColor}` }}
          />
          <div>
            <p className="text-base font-bold leading-none" style={{ color: sColor }}>
              {overallStatus}
            </p>
            <p className="text-[9px] text-white/30 mt-0.5">
              {warningCounts.total === 0
                ? "No warnings detected"
                : `${warningCounts.total} warning${warningCounts.total > 1 ? "s" : ""} — ${warningCounts.critical > 0 ? `${warningCounts.critical} critical` : warningCounts.high > 0 ? `${warningCounts.high} high` : `${warningCounts.medium} medium`}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 1: Overall Status ──────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 1 — Overall Status</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Status",    value: overallStatus,          color: sColor },
            { label: "Critical",  value: warningCounts.critical, color: warningCounts.critical > 0 ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.35)" },
            { label: "High",      value: warningCounts.high,     color: warningCounts.high > 0     ? "rgba(245,158,11,0.85)" : "rgba(255,255,255,0.35)" },
            { label: "Medium",    value: warningCounts.medium,   color: warningCounts.medium > 0   ? "rgba(167,139,250,0.75)" : "rgba(255,255,255,0.35)" },
          ].map((s) => (
            <Card key={s.label} className="flex flex-col items-center gap-1.5 py-5">
              <span className="text-xl font-bold tabular-nums" style={{ color: s.color }}>
                {s.value}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                {s.label}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Section 2: Storage Health ──────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 2 — Storage Health</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* localStorage */}
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-3">LocalStorage</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Status</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={storage.localStorageEnabled} />
                  <span className="text-xs font-semibold" style={{ color: storage.localStorageEnabled ? "rgba(52,211,153,0.85)" : "rgba(239,68,68,0.85)" }}>
                    {storage.localStorageEnabled ? "Enabled" : "Unavailable"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Items stored</span>
                <span className="text-xs font-bold text-white/70 tabular-nums">{storage.localItemCount}</span>
              </div>
            </div>
          </Card>

          {/* Supabase */}
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-3">Supabase</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Configured</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={storage.supabaseConfigured} />
                  <span className="text-xs font-semibold" style={{ color: storage.supabaseConfigured ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)" }}>
                    {storage.supabaseConfigured ? "Yes" : "No — local only"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Authenticated</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={storage.supabaseAuthenticated} />
                  <span className="text-xs font-semibold" style={{ color: storage.supabaseAuthenticated ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)" }}>
                    {storage.supabaseAuthenticated ? "Signed in" : "Not signed in"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Mode</span>
                <span className="text-xs font-bold text-white/60 capitalize">{storage.readMode.replace("-", " ")}</span>
              </div>
              {storage.failedWrites > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/45">Failed writes</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: "rgba(239,68,68,0.85)" }}>{storage.failedWrites}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Fallback mode</span>
                <span className="text-xs font-semibold" style={{ color: storage.fallbackMode ? "rgba(245,158,11,0.75)" : "rgba(52,211,153,0.75)" }}>
                  {storage.fallbackMode ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </Card>

          {/* Sync results */}
          {storage.lastSyncResults.length > 0 && (
            <Card className="sm:col-span-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-3">Sync Results — Last Write per Module</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Module", "Result", "Timestamp", "Error"].map((h) => (
                        <th key={h} className="text-left pb-2 pr-4 text-white/25 font-semibold text-[9px] uppercase tracking-[0.12em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storage.lastSyncResults.map((r) => {
                      const color =
                        r.result === "success" ? "rgba(52,211,153,0.75)"
                        : r.result === "failed" ? "rgba(239,68,68,0.75)"
                        : r.result === "skipped" ? "rgba(245,158,11,0.65)"
                        : "rgba(255,255,255,0.2)";
                      return (
                        <tr key={r.module} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td className="py-2 pr-4 text-white/55">{r.module}</td>
                          <td className="py-2 pr-4">
                            <span className="font-semibold" style={{ color }}>{r.result}</span>
                          </td>
                          <td className="py-2 pr-4 text-white/30 tabular-nums">
                            {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="py-2 text-[10px]" style={{ color: "rgba(239,68,68,0.6)" }}>
                            {r.error ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Section 3: AI Health ───────────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 3 — AI Health</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Anthropic */}
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "rgba(139,92,246,0.5)" }}>Anthropic</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Configured</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={ai.anthropicConfigured} />
                  <span className="text-xs font-semibold" style={{ color: ai.anthropicConfigured ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)" }}>
                    {ai.anthropicConfigured ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Chat available</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={ai.chatAvailable} />
                  <span className="text-xs font-semibold" style={{ color: ai.chatAvailable ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)" }}>
                    {ai.chatAvailable ? "Ready" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* OpenAI */}
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "rgba(52,211,153,0.5)" }}>OpenAI</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Configured</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={ai.openaiConfigured} />
                  <span className="text-xs font-semibold" style={{ color: ai.openaiConfigured ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)" }}>
                    {ai.openaiConfigured ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Embeddings</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={ai.embeddingsAvailable} />
                  <span className="text-xs font-semibold text-white/30">Planned</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Vector Memory */}
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "rgba(99,102,241,0.5)" }}>Vector Memory</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Mode</span>
                <span className="text-xs font-bold capitalize" style={{ color: "rgba(245,158,11,0.65)" }}>
                  {ai.vectorMode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Vector DB</span>
                <span className="text-xs font-semibold text-white/30">Not ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Semantic search</span>
                <span className="text-xs font-semibold text-white/30">Inactive</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Section 4: Data Health ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 4 — Data Health</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-2">Record Counts</p>
            <DataCountRow label="Projects"       value={data.projects}      accent="rgba(139,92,246,0.75)" />
            <DataCountRow label="Tasks"          value={data.tasks}         accent="rgba(99,102,241,0.75)" />
            <DataCountRow label="Memories"       value={data.memories}      accent="rgba(52,211,153,0.75)" />
            <DataCountRow label="Relationships"  value={data.relationships}  />
            <DataCountRow label="Opportunities"  value={data.opportunities} accent="rgba(245,158,11,0.75)" />
            <DataCountRow label="Content Items"  value={data.content}       accent="rgba(239,68,68,0.65)" />
            <DataCountRow label="Focus Sessions" value={data.focusSessions}  />
          </Card>
          <Card className="flex flex-col items-center justify-center gap-2 py-8">
            <span
              className="text-5xl font-bold tabular-nums"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,102,241,0.7))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {data.total}
            </span>
            <p className="text-xs text-white/30 font-semibold uppercase tracking-[0.15em]">Total Records</p>
            <p className="text-[10px] text-white/20 text-center mt-1">Across all data types in localStorage</p>
          </Card>
        </div>
      </div>

      {/* ── Section 5: Workspace Health ────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 5 — Workspace Health</SectionLabel>
        {workspaceHealth.length === 0 ? (
          <Card>
            <p className="text-xs text-white/30 text-center py-4">No workspaces configured.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Workspace", "Projects", "Overdue", "Opps", "Risk", "Momentum"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workspaceHealth.map((ws) => (
                  <tr
                    key={ws.workspace.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ws.workspace.color }} />
                        <span className="text-white/65 font-medium truncate max-w-[120px]">{ws.workspace.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 tabular-nums">{ws.openProjects}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span style={{ color: ws.overdueTasks > 0 ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.3)" }}>
                        {ws.overdueTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "rgba(52,211,153,0.65)" }}>{ws.activeOpportunities}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tabular-nums" style={{ color: riskColor(ws.riskScore) }}>{ws.riskScore}</span>
                        <span className="text-[9px] uppercase tracking-wide" style={{ color: riskColor(ws.riskScore) }}>
                          {riskLabel(ws.riskScore)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold tabular-nums" style={{ color: momentumColor(ws.momentumScore) }}>{ws.momentumScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 6: Warnings ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 6 — Warnings</SectionLabel>
        {warnings.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 py-3">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: "rgba(52,211,153,0.8)", boxShadow: "0 0 6px rgba(52,211,153,0.5)" }}
              />
              <p className="text-sm font-semibold" style={{ color: "rgba(52,211,153,0.85)" }}>
                No warnings — system is operating normally
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {warnings.map((w, i) => {
              const sc  = severityColor(w.severity);
              const sbg = sc.replace("0.85", "0.06").replace("0.75", "0.06");
              const sbd = sc.replace("0.85", "0.18").replace("0.75", "0.15");
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: sbg, border: `1px solid ${sbd}` }}
                >
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                    style={{ background: sbg, border: `1px solid ${sbd}`, color: sc }}
                  >
                    {w.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-white/70 leading-relaxed">{w.message}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{w.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 7: Quick Actions ───────────────────────────────────────── */}
      <div>
        <SectionLabel>Section 7 — Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/chief",      label: "Chief of Staff",  desc: "Executive brief" },
            { href: "/actions",    label: "Actions",         desc: "High-leverage tasks" },
            { href: "/workspaces", label: "Workspaces",      desc: "Workspace analytics" },
            { href: "/settings",   label: "Settings",        desc: "Sync + auth config" },
            { href: "/focus",      label: "Focus Engine",    desc: "Start a focus session" },
            { href: "/review",     label: "Weekly Review",   desc: "Review & reflect" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col gap-1 px-4 py-3 rounded-xl transition-all"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-xs font-semibold text-white/70">{a.label} →</span>
              <span className="text-[10px] text-white/30">{a.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom space */}
      <div className="h-12" />
    </div>
  );
}
