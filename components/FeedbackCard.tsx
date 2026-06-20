"use client";

/**
 * components/FeedbackCard.tsx
 *
 * Compact Operating zone card for Feedback Engine — Sovereign OS v8.1
 *
 * Shows: critical count, open issue count, recent insight, top priority item.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadFeedback } from "@/lib/feedback/store";
import type { FeedbackItem } from "@/lib/types/feedback";

export default function FeedbackCard() {
  const [items,  setItems]  = useState<FeedbackItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadFeedback());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)", height: 120 }}
      />
    );
  }

  const open     = items.filter((i) => i.status === "New" || i.status === "Reviewing");
  const critical = open.filter((i) => i.priority === "Critical");
  const topItem  = open.sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  })[0];
  const latestInsight = items
    .filter((i) => i.type === "Insight")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const TYPE_COLORS: Record<string, string> = {
    Bug:         "rgba(239,68,68,0.75)",
    Feature:     "rgba(99,102,241,0.75)",
    UX:          "rgba(245,158,11,0.75)",
    Performance: "rgba(251,146,60,0.75)",
    Workflow:    "rgba(52,211,153,0.75)",
    Insight:     "rgba(167,139,250,0.75)",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(167,139,250,0.12)",
        background: "rgba(167,139,250,0.02)",
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
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
              <path d="M2 3h12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V3z" stroke="rgba(196,181,253,0.8)" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M5 7h6M5 9.5h4" stroke="rgba(196,181,253,0.8)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M6 12v2l2-1 2 1v-2" stroke="rgba(196,181,253,0.7)" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 leading-none">Feedback</p>
            <p className="text-[9px] text-white/25 mt-0.5">Issues · ideas · friction</p>
          </div>
        </div>
        <Link
          href="/feedback"
          className="text-[9px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.18)",
            color: "rgba(196,181,253,0.7)",
          }}
        >
          View all →
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {items.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[10px] text-white/20">No feedback yet.</p>
            <Link
              href="/feedback"
              className="text-[9px] font-semibold mt-1 block transition-colors"
              style={{ color: "rgba(167,139,250,0.4)" }}
            >
              Capture the first item →
            </Link>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums" style={{ color: "rgba(167,139,250,0.85)" }}>
                  {open.length}
                </span>
                <span className="text-[8px] text-white/25 -mt-0.5">open</span>
              </div>
              {critical.length > 0 && (
                <>
                  <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tabular-nums" style={{ color: "rgba(239,68,68,0.85)" }}>
                      {critical.length}
                    </span>
                    <span className="text-[8px] text-white/25 -mt-0.5">critical</span>
                  </div>
                </>
              )}
              <div className="flex-1" />
              <Link
                href="/feedback"
                className="text-[8px] font-bold px-2 py-1 rounded-lg transition-all"
                style={{
                  background: "rgba(167,139,250,0.07)",
                  border: "1px solid rgba(167,139,250,0.14)",
                  color: "rgba(167,139,250,0.55)",
                }}
              >
                + Add
              </Link>
            </div>

            {/* Top item */}
            {topItem && (
              <>
                <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/20 mb-1">
                    Top Priority
                  </p>
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{
                        color: TYPE_COLORS[topItem.type] ?? "rgba(255,255,255,0.4)",
                        background: `${(TYPE_COLORS[topItem.type] ?? "rgba(255,255,255,0.4)").replace("0.75", "0.08")}`,
                        border: `1px solid ${(TYPE_COLORS[topItem.type] ?? "rgba(255,255,255,0.4)").replace("0.75", "0.16")}`,
                      }}
                    >
                      {topItem.type}
                    </span>
                    <p className="text-[10px] font-semibold text-white/60 leading-snug line-clamp-2">
                      {topItem.title}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Latest insight */}
            {latestInsight && (
              <>
                <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/20 mb-1">
                    Latest Insight
                  </p>
                  <p className="text-[10px] text-white/40 leading-snug line-clamp-2">
                    {latestInsight.title}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
