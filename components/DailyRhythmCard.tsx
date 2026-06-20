"use client";

/**
 * components/DailyRhythmCard.tsx — Sovereign OS v6.6
 *
 * Compact homepage widget showing today's Daily Operating Rhythm phase and progress.
 * Links to /daily.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface StoredState {
  date: string;
  checklist: { reviewedBrief: boolean; setThreePriorities: boolean; reviewedCalendar: boolean; clearMind: boolean };
  priorities: [string, string, string];
  checklistDone: boolean;
  midday: { done: boolean };
  endOfDay: { done: boolean };
}

function getPhase(s: StoredState): { label: string; accent: string; desc: string } {
  if (s.endOfDay.done) return { label: "Day Wrapped", accent: "rgba(52,211,153,0.7)", desc: "Day complete — great work" };
  if (s.midday.done)   return { label: "Evening", accent: "rgba(245,158,11,0.7)", desc: "End-of-day review pending" };
  if (s.checklistDone) return { label: "Working", accent: "rgba(99,102,241,0.7)", desc: "Midday check-in when ready" };
  return { label: "Morning", accent: "rgba(139,92,246,0.7)", desc: "Start your day" };
}

export default function DailyRhythmCard() {
  const [stored, setStored] = useState<StoredState | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const raw   = safeRead<StoredState>(KEYS.DAILY_RHYTHM, {
      date: today,
      checklist: { reviewedBrief: false, setThreePriorities: false, reviewedCalendar: false, clearMind: false },
      priorities: ["", "", ""],
      checklistDone: false,
      midday: { done: false },
      endOfDay: { done: false },
    });
    setStored(raw.date === today ? raw : {
      date: today,
      checklist: { reviewedBrief: false, setThreePriorities: false, reviewedCalendar: false, clearMind: false },
      priorities: ["", "", ""],
      checklistDone: false,
      midday: { done: false },
      endOfDay: { done: false },
    });
  }, []);

  if (!stored) {
    return (
      <div
        className="h-24 rounded-2xl animate-pulse"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      />
    );
  }

  const phase = getPhase(stored);
  const checkCount = Object.values(stored.checklist).filter(Boolean).length;
  const priorities  = stored.priorities.filter(Boolean);

  // Phase step: 0=morning, 1=working, 2=evening, 3=wrapped
  const step = stored.endOfDay.done ? 3 : stored.midday.done ? 2 : stored.checklistDone ? 1 : 0;

  return (
    <Link href="/daily" className="block group">
      <div
        className="rounded-2xl p-4 transition-all group-hover:opacity-80"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: phase.accent, boxShadow: `0 0 6px ${phase.accent}` }}
            />
            <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: phase.accent }}>
              {phase.label}
            </p>
          </div>
          <span className="text-[9px] text-white/20 group-hover:text-white/35 transition-all">
            Daily Rhythm →
          </span>
        </div>

        {/* Phase progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {["Morning", "Working", "Evening", "Wrapped"].map((s, i) => (
            <div
              key={s}
              className="flex-1 h-0.5 rounded-full transition-all"
              style={{ background: i <= step ? phase.accent : "rgba(255,255,255,0.07)" }}
            />
          ))}
        </div>

        {/* Content */}
        {priorities.length > 0 ? (
          <div className="space-y-1">
            {priorities.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] text-white/20">{i + 1}.</span>
                <p className="text-[10px] text-white/55 truncate">{p}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-white/30">{phase.desc}</p>
        )}

        {/* Checklist mini-progress (only in morning phase) */}
        {!stored.checklistDone && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-0.5 rounded-full transition-all"
                style={{ width: `${(checkCount / 4) * 100}%`, background: "rgba(139,92,246,0.5)" }}
              />
            </div>
            <span className="text-[8px] text-white/20">{checkCount}/4 checklist</span>
          </div>
        )}
      </div>
    </Link>
  );
}
