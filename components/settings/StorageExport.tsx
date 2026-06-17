"use client";

import { useRef, useState } from "react";
import { KEYS } from "@/lib/keys";

// All sovereign_ keys included in export / eligible for restore
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

// ── Types ──────────────────────────────────────────────────────────────────

interface RestoreSummary {
  keysFound:    string[];
  keysEmpty:    string[];
  itemCounts:   Record<string, number | null>; // null = non-array value
}

type ExportStatus = "idle" | "done" | "empty";
type RestorePhase = "idle" | "preview" | "confirmed" | "done" | "error";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildExportData(): { data: Record<string, unknown>; hasAny: boolean } {
  const data: Record<string, unknown> = {
    exportedAt:       new Date().toISOString(),
    sovereignVersion: "v4.3",
  };
  let hasAny = false;
  for (const key of EXPORT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
      hasAny = true;
    }
  }
  return { data, hasAny };
}

function analyzeBackup(parsed: Record<string, unknown>): RestoreSummary {
  const keysFound: string[] = [];
  const keysEmpty: string[] = [];
  const itemCounts: Record<string, number | null> = {};

  for (const key of EXPORT_KEYS) {
    const val = parsed[key];
    if (val === undefined || val === null) {
      keysEmpty.push(key);
    } else {
      keysFound.push(key);
      itemCounts[key] = Array.isArray(val) ? val.length : null;
    }
  }
  return { keysFound, keysEmpty, itemCounts };
}

function shortKey(key: string): string {
  return key.replace("sovereign_", "");
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StorageExport() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [restorePhase, setRestorePhase] = useState<RestorePhase>("idle");
  const [summary, setSummary]           = useState<RestoreSummary | null>(null);
  const [pendingData, setPendingData]   = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    const { data, hasAny } = buildExportData();
    if (!hasAny) {
      setExportStatus("empty");
      setTimeout(() => setExportStatus("idle"), 3000);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `sovereign-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus("done");
    setTimeout(() => setExportStatus("idle"), 3000);
  }

  // ── Import (file pick → preview) ─────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-picked after cancel
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result;
      if (typeof raw !== "string") {
        setErrorMsg("Could not read file.");
        setRestorePhase("error");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setErrorMsg("Invalid JSON — file appears to be corrupt or not a Sovereign OS backup.");
        setRestorePhase("error");
        return;
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setErrorMsg("Unrecognized backup format — expected a JSON object.");
        setRestorePhase("error");
        return;
      }
      const obj = parsed as Record<string, unknown>;
      // Must have at least exportedAt or one known key
      const hasKnownKey = EXPORT_KEYS.some((k) => k in obj);
      if (!hasKnownKey) {
        setErrorMsg("No recognized Sovereign OS keys found in this file.");
        setRestorePhase("error");
        return;
      }
      const s = analyzeBackup(obj);
      if (s.keysFound.length === 0) {
        setErrorMsg("Backup file contains no data to restore.");
        setRestorePhase("error");
        return;
      }
      setSummary(s);
      setPendingData(obj);
      setRestorePhase("preview");
    };
    reader.readAsText(file);
  }

  // ── Confirm restore ───────────────────────────────────────────────────────

  function handleConfirmRestore() {
    if (!pendingData || !summary) return;

    // 1. Back up current localStorage before overwriting
    try {
      const { data: backup, hasAny } = buildExportData();
      if (hasAny) {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `sovereign-os-pre-restore-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // backup attempt failed — proceed anyway, user was warned
    }

    // 2. Write restored keys
    try {
      for (const key of summary.keysFound) {
        const val = pendingData[key];
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {
      setErrorMsg("Restore failed — localStorage write error.");
      setRestorePhase("error");
      return;
    }

    setRestorePhase("done");
  }

  function handleCancel() {
    setPendingData(null);
    setSummary(null);
    setErrorMsg("");
    setRestorePhase("idle");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Export + Import buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={
            exportStatus === "done"
              ? { background: "rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.85)", border: "1px solid rgba(52,211,153,0.2)" }
              : exportStatus === "empty"
                ? { background: "rgba(245,158,11,0.1)", color: "rgba(245,158,11,0.8)", border: "1px solid rgba(245,158,11,0.18)" }
                : { background: "rgba(99,102,241,0.12)", color: "rgba(165,180,252,0.9)", border: "1px solid rgba(99,102,241,0.22)" }
          }
        >
          {exportStatus === "done" ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Downloaded
            </>
          ) : exportStatus === "empty" ? (
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

        {/* Import trigger */}
        {restorePhase === "idle" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M8 10V2M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12h10" strokeLinecap="round" />
            </svg>
            Restore from Backup
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview panel */}
      {restorePhase === "preview" && summary && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "rgba(245,158,11,0.85)" }}>
            Restore Preview — review before confirming
          </p>
          <div className="grid grid-cols-2 gap-1">
            {summary.keysFound.map((key) => {
              const count = summary.itemCounts[key];
              return (
                <div key={key} className="flex items-center justify-between gap-2 text-[10px]"
                     style={{ color: "rgba(255,255,255,0.6)" }}>
                  <span>{shortKey(key)}</span>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>
                    {count !== null ? `${count} item${count !== 1 ? "s" : ""}` : "data"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px]" style={{ color: "rgba(245,158,11,0.6)" }}>
            Your current data will be overwritten. A pre-restore backup will be
            automatically downloaded first.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirmRestore}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(245,158,11,0.15)", color: "rgba(245,158,11,0.9)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              Confirm Restore
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {restorePhase === "done" && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)" }}
        >
          <p className="text-xs" style={{ color: "rgba(52,211,153,0.85)" }}>
            Restore complete — {summary?.keysFound.length ?? 0} keys written. Reload to see your data.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: "rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.9)", border: "1px solid rgba(52,211,153,0.2)" }}
          >
            Reload
          </button>
        </div>
      )}

      {/* Error */}
      {restorePhase === "error" && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
        >
          <p className="text-xs" style={{ color: "rgba(248,113,113,0.8)" }}>{errorMsg}</p>
          <button
            onClick={handleCancel}
            className="ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
