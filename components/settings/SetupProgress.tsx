"use client";

/**
 * components/settings/SetupProgress.tsx — Sovereign OS v7.1
 *
 * Displays a 7-item first-run checklist. Auto-detects 5 items from localStorage
 * on mount. The remaining 2 (data export, Supabase config) are manual toggles
 * since they can't be auto-detected.
 *
 * Reads/writes KEYS.SETUP_CHECKLIST.
 */

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";

interface SetupChecklist {
  projectCreated:       boolean;
  memoryAdded:          boolean;
  relationshipAdded:    boolean;
  opportunityAdded:     boolean;
  dailyRhythmStarted:   boolean;
  exportCreated:        boolean;
  supabaseConfigured:   boolean;
}

const DEFAULT_CHECKLIST: SetupChecklist = {
  projectCreated:     false,
  memoryAdded:        false,
  relationshipAdded:  false,
  opportunityAdded:   false,
  dailyRhythmStarted: false,
  exportCreated:      false,
  supabaseConfigured: false,
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

function autoDetect(saved: SetupChecklist): SetupChecklist {
  const projects     = safeRead<unknown[]>(KEYS.PROJECTS, []);
  const memory       = safeRead<unknown[]>(KEYS.MEMORY_ITEMS, []);
  const relationships = safeRead<unknown[]>(KEYS.RELATIONSHIPS, []);
  const opportunities = safeRead<unknown[]>(KEYS.OPPORTUNITIES, []);
  const daily        = safeRead<{ checklistDone?: boolean } | null>(KEYS.DAILY_RHYTHM, null);

  return {
    ...saved,
    projectCreated:     Array.isArray(projects)     && projects.length     > 0,
    memoryAdded:        Array.isArray(memory)        && memory.length        > 0,
    relationshipAdded:  Array.isArray(relationships) && relationships.length > 0,
    opportunityAdded:   Array.isArray(opportunities) && opportunities.length > 0,
    dailyRhythmStarted: !!(daily && daily.checklistDone),
    // manual fields keep saved value
    exportCreated:      saved.exportCreated,
    supabaseConfigured: saved.supabaseConfigured,
  };
}

const ITEMS: { key: keyof SetupChecklist; label: string; desc: string; manual?: boolean }[] = [
  { key: "projectCreated",     label: "Create your first project",   desc: "Projects → New Project" },
  { key: "memoryAdded",        label: "Add your first memory",       desc: "Memory → New Memory" },
  { key: "relationshipAdded",  label: "Add a relationship",          desc: "Relationships → Add Person" },
  { key: "opportunityAdded",   label: "Create an opportunity",       desc: "Opportunities → New" },
  { key: "dailyRhythmStarted", label: "Complete a daily check-in",   desc: "Daily Rhythm → check all 4 boxes" },
  { key: "exportCreated",      label: "Export your data",            desc: "Data & Storage → Export All", manual: true },
  { key: "supabaseConfigured", label: "Configure Supabase (optional)", desc: "Set SUPABASE env vars for cloud sync", manual: true },
];

export default function SetupProgress() {
  const [checklist, setChecklist] = useState<SetupChecklist>(DEFAULT_CHECKLIST);

  useEffect(() => {
    const saved = safeRead<SetupChecklist>(KEYS.SETUP_CHECKLIST, DEFAULT_CHECKLIST);
    const detected = autoDetect(saved);
    setChecklist(detected);
    safeWrite(KEYS.SETUP_CHECKLIST, detected);
  }, []);

  function toggleManual(key: keyof SetupChecklist) {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      safeWrite(KEYS.SETUP_CHECKLIST, next);
      return next;
    });
  }

  const done = Object.values(checklist).filter(Boolean).length;
  const total = ITEMS.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-white/60">Setup Progress</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {allDone ? "You're fully set up." : `${done} of ${total} steps complete`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: allDone ? "rgba(52,211,153,0.9)" : "rgba(165,180,252,0.8)" }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: allDone
              ? "rgba(52,211,153,0.7)"
              : "linear-gradient(90deg, rgba(99,102,241,0.6), rgba(139,92,246,0.7))",
          }}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        {ITEMS.map((item) => {
          const checked = checklist[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center gap-3"
              onClick={item.manual ? () => toggleManual(item.key) : undefined}
              style={item.manual ? { cursor: "pointer" } : undefined}
            >
              {/* Checkbox */}
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: checked ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                  border: checked ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {checked && (
                  <svg viewBox="0 0 10 10" fill="none" stroke="rgba(52,211,153,0.9)" strokeWidth="1.5" className="w-2.5 h-2.5">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs leading-snug"
                  style={{ color: checked ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.65)" }}
                >
                  {item.label}
                  {item.manual && (
                    <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(99,102,241,0.5)" }}>
                      tap to toggle
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">{item.desc}</p>
              </div>

              {/* Auto-detected badge */}
              {!item.manual && checked && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                  style={{ color: "rgba(52,211,153,0.5)" }}
                >
                  auto
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <p className="text-[10px] text-white/20 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          All steps complete — you have the full Sovereign OS experience active.
        </p>
      )}
    </div>
  );
}
