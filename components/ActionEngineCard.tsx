"use client";

/**
 * components/ActionEngineCard.tsx
 *
 * Homepage widget for Action Engine — Sovereign OS v5.5
 * Shows: top action, urgent count, link to /actions
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import { computeActionEngine } from "@/lib/actionEngine/engine";
import type { ActionEngineResult, ActionPriority } from "@/lib/actionEngine/engine";
import type { Person } from "@/lib/types/relationships";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { Opportunity } from "@/lib/types/opportunities";
import type { ContentItem } from "@/lib/types/content";
import type { MemoryItem } from "@/lib/types/memory";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const PRIORITY_COLOR: Record<ActionPriority, string> = {
  critical: "rgba(239,68,68,0.85)",
  high:     "rgba(245,158,11,0.85)",
  medium:   "rgba(167,139,250,0.75)",
  low:      "rgba(255,255,255,0.3)",
};

export default function ActionEngineCard() {
  const [result, setResult] = useState<ActionEngineResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const todayStr      = new Date().toISOString().slice(0, 10);
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const projectTasks  = safeRead<ProjectTask[]>(KEYS.PROJECT_TASKS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);

    const graph = computeKnowledgeGraph({ people, projects, opportunities, contentItems, memoryItems });

    const actionResult = computeActionEngine({
      graphInsights: graph.insights,
      opportunities,
      people,
      projects,
      projectTasks,
      contentItems,
      todayStr,
    });

    setResult(actionResult);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl overflow-hidden animate-pulse"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.012)",
          height: 120,
        }}
      />
    );
  }

  if (!result) return null;

  const topAction    = result.actions[0];
  const urgentCount  = result.urgentActions.length;
  const totalCount   = result.actions.length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(245,158,11,0.14)",
        background: "rgba(245,158,11,0.02)",
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
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.3" className="w-3.5 h-3.5">
              <path d="M8 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Action Engine</p>
            <p className="text-[9px] text-white/25 mt-0.5">
              {totalCount} action{totalCount !== 1 ? "s" : ""} · {urgentCount} urgent
            </p>
          </div>
        </div>
        <Link
          href="/actions"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.18)",
            color: "rgba(251,191,36,0.7)",
          }}
        >
          All actions →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {topAction ? (
          <>
            {/* Top Action */}
            <div className="mb-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-1">
                Top Priority
              </p>
              <div className="flex items-start gap-2">
                <span
                  className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                  style={{
                    background: `${PRIORITY_COLOR[topAction.priority].replace("0.85", "0.09").replace("0.75", "0.09")}`,
                    border: `1px solid ${PRIORITY_COLOR[topAction.priority].replace("0.85", "0.22").replace("0.75", "0.18")}`,
                    color: PRIORITY_COLOR[topAction.priority],
                  }}
                >
                  {topAction.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/75 leading-snug line-clamp-2">
                    {topAction.title}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">
                    {topAction.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            {urgentCount > 0 && (
              <>
                <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} className="mb-3" />
                {/* Urgent count */}
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Urgent actions
                  </p>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "rgba(239,68,68,0.85)" }}
                  >
                    {urgentCount}
                  </span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="py-2 text-center">
            <p className="text-[10px] text-white/25">No actions detected yet</p>
            <p className="text-[9px] text-white/15 mt-0.5">Add data across modules to surface recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
}
