"use client";

/**
 * components/RelationshipWidget.tsx
 *
 * Homepage widget — Relationship Intelligence — Sovereign OS v5.2
 * Shows: follow-ups due, high-priority people, recent relationship notes
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { loadPeople, isFollowUpDue } from "@/lib/relationships/store";
import type { Person } from "@/lib/types/relationships";
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

const PRIORITY_COLOR: Record<string, string> = {
  Critical: "rgba(239,68,68,0.9)",
  High:     "rgba(251,191,36,0.9)",
  Medium:   "rgba(99,102,241,0.8)",
  Low:      "rgba(255,255,255,0.25)",
};

const TYPE_DOT: Record<string, string> = {
  Client:    "rgba(52,211,153,0.8)",
  Prospect:  "rgba(59,130,246,0.8)",
  Founder:   "rgba(251,191,36,0.8)",
  Partner:   "rgba(245,158,11,0.8)",
  Mentor:    "rgba(167,139,250,0.8)",
  Educator:  "rgba(139,92,246,0.7)",
  Community: "rgba(255,255,255,0.35)",
  Other:     "rgba(255,255,255,0.25)",
};

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: "rgba(139,92,246,0.15)",
        border: "1px solid rgba(139,92,246,0.22)",
        color: "rgba(167,139,250,0.85)",
        fontSize: size < 30 ? 9 : 11,
        letterSpacing: "0.04em",
      }}
    >
      {initials}
    </div>
  );
}

export default function RelationshipWidget() {
  const [people, setPeople]       = useState<Person[]>([]);
  const [memories, setMemories]   = useState<MemoryItem[]>([]);
  const [todayStr, setTodayStr]   = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setTodayStr(today);
    setPeople(loadPeople());
    setMemories(safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []));
  }, []);

  const activePeople = people.filter((p) => p.status !== "Archived");

  // Follow-ups overdue
  const overdue = todayStr
    ? activePeople.filter((p) => isFollowUpDue(p, todayStr))
    : [];

  // High-priority active people (Critical or High, not overdue)
  const highPriority = activePeople
    .filter(
      (p) =>
        (p.priority === "Critical" || p.priority === "High") &&
        !overdue.find((o) => o.id === p.id)
    )
    .slice(0, 3);

  // Recent relationship notes (MemoryItems of type "Person")
  const recentNotes = memories
    .filter((m) => m.type === "Person")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const isEmpty = activePeople.length === 0;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.18)" }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="1.4" className="w-3.5 h-3.5">
              <circle cx="7" cy="7" r="3" />
              <path d="M1 17c0-3.3 2.7-6 6-6h2" strokeLinecap="round" />
              <circle cx="14" cy="11" r="3" />
              <path d="M11 19c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(52,211,153,0.6)" }}>
              Relationships
            </p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {activePeople.length} active · {overdue.length} follow-up{overdue.length !== 1 ? "s" : ""} due
            </p>
          </div>
        </div>
        <Link
          href="/relationships"
          className="text-[10px] font-semibold transition-opacity hover:opacity-100"
          style={{ color: "rgba(52,211,153,0.5)" }}
        >
          Manage →
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-6">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No relationships tracked yet.</p>
          <Link href="/relationships" className="text-[11px] mt-2 inline-block" style={{ color: "rgba(52,211,153,0.5)" }}>
            Add your first contact →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Follow-ups overdue */}
          {overdue.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(239,68,68,0.5)" }}>
                Follow-up overdue
              </p>
              <div className="space-y-1.5">
                {overdue.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}
                  >
                    <Avatar name={p.name} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {p.name}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: "rgba(239,68,68,0.6)" }}>
                        Due {p.next_follow_up_at} · {p.role || p.relationship_type}
                      </p>
                    </div>
                    <div
                      className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(239,68,68,0.12)", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.18)" }}
                    >
                      Overdue
                    </div>
                  </div>
                ))}
                {overdue.length > 3 && (
                  <p className="text-[9px] pl-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                    +{overdue.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* High-priority people */}
          {highPriority.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.18)" }}>
                High priority
              </p>
              <div className="space-y-1.5">
                {highPriority.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <Avatar name={p.name} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: "rgba(255,255,255,0.72)" }}>
                        {p.name}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {p.organization ? `${p.organization} · ` : ""}{p.relationship_type}
                      </p>
                    </div>
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: PRIORITY_COLOR[p.priority] ?? "rgba(255,255,255,0.2)" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: TYPE_DOT[p.relationship_type] ?? "rgba(255,255,255,0.2)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.18)" }}>
                Recent notes
              </p>
              <div className="space-y-1.5">
                {recentNotes.map((m) => (
                  <div key={m.id} className="flex items-start gap-2">
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                      style={{ background: "rgba(139,92,246,0.5)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                        {m.title}
                      </p>
                      {m.content && (
                        <p className="text-[9px] line-clamp-1" style={{ color: "rgba(255,255,255,0.22)" }}>
                          {m.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
