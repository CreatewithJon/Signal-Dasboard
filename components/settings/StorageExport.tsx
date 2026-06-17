"use client";

import { useState } from "react";
import { KEYS } from "@/lib/keys";

// All sovereign_ keys to include in the export
const EXPORT_KEYS = [
  KEYS.PROJECTS,
  KEYS.PROJECT_TASKS,
  KEYS.MEMORY_ITEMS,
  KEYS.CONTENT_ITEMS,
  KEYS.FOCUS_SESSIONS,
  KEYS.HABITS,
  KEYS.HABIT_LOG,
  KEYS.PLANNER_DAILY,
  KEYS.PLANNER_WEEKLY,
  KEYS.PLANNER_MONTHLY,
  KEYS.PLANNER_1YR,
  KEYS.PLANNER_3YR,
  KEYS.PLANNER_5YR,
  KEYS.PLANNER_REVIEW,
  KEYS.NARRATIVES,
  KEYS.CONTENT_IDEAS,
  KEYS.BTC_STACK,
  KEYS.NOTE,
  KEYS.TASKS,
];

export default function StorageExport() {
  const [status, setStatus] = useState<"idle" | "done" | "empty">("idle");

  function handleExport() {
    const data: Record<string, unknown> = {
      exportedAt:      new Date().toISOString(),
      sovereignVersion: "v4.0",
    };

    let hasAny = false;
    for (const key of EXPORT_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          data[key] = JSON.parse(raw);
          hasAny = true;
        } catch {
          data[key] = raw; // store as raw string if JSON parse fails
        }
      }
    }

    if (!hasAny) {
      setStatus("empty");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `sovereign-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatus("done");
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
      style={
        status === "done"
          ? { background: "rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.85)", border: "1px solid rgba(52,211,153,0.2)" }
          : status === "empty"
            ? { background: "rgba(245,158,11,0.1)", color: "rgba(245,158,11,0.8)", border: "1px solid rgba(245,158,11,0.18)" }
            : { background: "rgba(99,102,241,0.12)", color: "rgba(165,180,252,0.9)", border: "1px solid rgba(99,102,241,0.22)" }
      }
    >
      {status === "done" ? (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Downloaded
        </>
      ) : status === "empty" ? (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3M8 10.5v.5" strokeLinecap="round" />
          </svg>
          No data to export
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 12h10" strokeLinecap="round" />
          </svg>
          Export All Data
        </>
      )}
    </button>
  );
}
