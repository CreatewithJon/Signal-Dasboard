"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ContentItem, ContentStatus } from "@/lib/types/content";
import { KEYS } from "@/lib/keys";

const STATUS_CFG: Record<ContentStatus, { bg: string; border: string; text: string }> = {
  Idea:      { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.25)", text: "rgba(167,139,250,0.9)" },
  Drafting:  { bg: "rgba(99,102,241,0.1)",   border: "rgba(99,102,241,0.25)", text: "rgba(165,180,252,0.9)" },
  Ready:     { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)", text: "rgba(52,211,153,0.9)"  },
  Published: { bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.25)",  text: "rgba(34,197,94,0.9)"  },
  Archived:  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "rgba(148,163,184,0.6)" },
};

function getDueDateState(dateStr: string): "overdue" | "urgent" | "soon" | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 2) return "urgent";
  if (diff <= 7) return "soon";
  return null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return `${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ContentWidget() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.CONTENT_ITEMS);
      if (raw) {
        const parsed = JSON.parse(raw) as ContentItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const active = items.filter((i) => i.status !== "Archived" && i.status !== "Published");

  // Stats
  const ideaCount     = items.filter((i) => i.status === "Idea").length;
  const draftingCount = items.filter((i) => i.status === "Drafting").length;
  const readyCount    = items.filter((i) => i.status === "Ready").length;

  // Upcoming: Ready + Drafting, sorted by publish_date (nulls last), then priority
  const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"];
  const upcoming = [...active]
    .sort((a, b) => {
      if (a.publish_date && b.publish_date) return a.publish_date.localeCompare(b.publish_date);
      if (a.publish_date) return -1;
      if (b.publish_date) return 1;
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    })
    .slice(0, 4);

  const overdueCount = active.filter(
    (i) => i.status !== "Published" && getDueDateState(i.publish_date) === "overdue"
  ).length;

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(239,68,68,0.6)" }}>
            Content Pipeline
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Ideas, drafts, and upcoming publishes
          </p>
        </div>
        <Link
          href="/content"
          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(252,165,165,0.75)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(252,165,165,1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(252,165,165,0.75)")}
        >
          Pipeline →
        </Link>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[10px] font-semibold"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)", color: "rgba(239,68,68,0.8)" }}
        >
          ⚠ {overdueCount} piece{overdueCount !== 1 ? "s" : ""} past publish date
          <Link href="/content" className="ml-auto underline underline-offset-2 opacity-70 hover:opacity-100">
            Review →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Ideas",    value: ideaCount,     color: "rgba(167,139,250,0.8)" },
          { label: "Drafting", value: draftingCount, color: "rgba(165,180,252,0.8)" },
          { label: "Ready",    value: readyCount,    color: "rgba(52,211,153,0.8)"  },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p
              className="text-2xl font-bold tracking-tight tabular-nums mb-0.5"
              style={{ color: stat.value > 0 ? stat.color : "rgba(255,255,255,0.15)" }}
            >
              {stat.value}
            </p>
            <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming list */}
      {upcoming.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            No content in the pipeline yet.
          </p>
          <Link
            href="/content"
            className="inline-block mt-2 text-[10px] font-semibold px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "rgba(165,180,252,0.7)",
            }}
          >
            + Add content idea
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
            Upcoming
          </p>
          {upcoming.map((item) => {
            const s = STATUS_CFG[item.status];
            const ddState = getDueDateState(item.publish_date);
            const ddColor =
              ddState === "overdue" ? "rgba(239,68,68,0.85)"
              : ddState === "urgent" ? "rgba(245,158,11,0.85)"
              : ddState === "soon"   ? "rgba(52,211,153,0.7)"
              : "rgba(255,255,255,0.25)";

            return (
              <Link
                key={item.id}
                href="/content"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: ddState === "overdue" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                  border: ddState === "overdue" ? "1px solid rgba(239,68,68,0.1)" : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Status badge */}
                <span
                  className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
                >
                  {item.status}
                </span>

                {/* Title */}
                <span className="text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {item.title || "Untitled"}
                </span>

                {/* Platform chips (max 1) */}
                {item.platforms[0] && (
                  <span className="text-[9px] shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {item.platforms[0]}
                  </span>
                )}

                {/* Date */}
                {item.publish_date && (
                  <span className="text-[10px] font-medium shrink-0" style={{ color: ddColor }}>
                    {formatDate(item.publish_date)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
