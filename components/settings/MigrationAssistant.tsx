"use client";

import { useState } from "react";
import {
  analyzeLocalDataForMigration,
  migrateLocalDataToSupabase,
  type MigrationAnalysis,
  type MigrationResult,
} from "@/lib/supabase/localMigration";
import { getCachedUserId } from "@/lib/supabase/authStatus";

type Phase =
  | "idle"          // initial state
  | "analyzing"     // running analysis
  | "preview"       // showing dry-run results, awaiting confirm
  | "migrating"     // running migration
  | "done"          // migration complete
  | "error";        // top-level error

export default function MigrationAssistant() {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [analysis, setAnalysis] = useState<MigrationAnalysis | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult]     = useState<MigrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Check auth synchronously from cache
  const isAuthenticated = getCachedUserId() !== null;

  // ── Analyze ──────────────────────────────────────────────────────────────

  function handleAnalyze() {
    setPhase("analyzing");
    setConfirmed(false);
    setResult(null);
    setErrorMsg("");
    // Analysis is sync (reads localStorage only) — wrap in setTimeout for
    // a brief "loading" flash so the user knows something happened
    setTimeout(() => {
      const a = analyzeLocalDataForMigration();
      setAnalysis(a);
      setPhase("preview");
    }, 120);
  }

  // ── Migrate ──────────────────────────────────────────────────────────────

  async function handleMigrate() {
    if (!confirmed) return;
    setPhase("migrating");
    const res = await migrateLocalDataToSupabase();
    if (!res.ok) {
      setErrorMsg(res.error);
      setPhase("error");
      return;
    }
    setResult(res.result);
    setPhase("done");
  }

  function handleReset() {
    setPhase("idle");
    setAnalysis(null);
    setConfirmed(false);
    setResult(null);
    setErrorMsg("");
  }

  // ── Not signed in ────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "rgba(245,158,11,0.5)" }} />
          <span className="text-sm font-semibold" style={{ color: "rgba(245,158,11,0.75)" }}>
            Sign In Required
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          You must be signed in to migrate local data to Supabase. Use the Identity &amp; Auth
          section above to sign in via magic link, then return here.
        </p>
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Copies your existing localStorage data to Supabase under your user account.
          localStorage is never modified. Upserts are idempotent — safe to run multiple times.
          Run an analysis first to preview what will be migrated.
        </p>
        <button
          onClick={handleAnalyze}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: "rgba(99,102,241,0.15)", color: "rgba(165,180,252,0.9)", border: "1px solid rgba(99,102,241,0.25)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <circle cx="8" cy="8" r="5.5" />
            <path d="M8 5.5v3M8 10v.5" strokeLinecap="round" />
          </svg>
          Analyze Local Data
        </button>
      </div>
    );
  }

  // ── Analyzing ─────────────────────────────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: "rgba(99,102,241,0.4)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Scanning localStorage…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "rgba(248,113,113,0.8)" }}>
          Migration failed to start
        </p>
        <p className="text-xs" style={{ color: "rgba(248,113,113,0.6)" }}>{errorMsg}</p>
        <button onClick={handleReset} className="text-xs underline" style={{ color: "rgba(148,163,184,0.5)" }}>
          Reset
        </button>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  if (phase === "preview" && analysis) {
    const hasData = analysis.totalEligible > 0;
    const hasWarnings =
      analysis.globalWarnings.length > 0 ||
      analysis.modules.some((m) => m.warnings.length > 0);

    return (
      <div className="space-y-4">
        {/* Global warnings */}
        {analysis.globalWarnings.length > 0 && (
          <div
            className="px-4 py-3 rounded-xl text-xs"
            style={{ background: "rgba(245,158,11,0.07)", color: "rgba(245,158,11,0.75)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            {analysis.globalWarnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        )}

        {/* Analysis table */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">
            Dry Run Preview
          </p>
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 2px" }}>
            <thead>
              <tr style={{ color: "rgba(148,163,184,0.4)" }}>
                <th className="text-left font-semibold pb-2 pr-4">Module</th>
                <th className="text-right font-semibold pb-2 pr-4">Local</th>
                <th className="text-right font-semibold pb-2 pr-4">Eligible</th>
                <th className="text-right font-semibold pb-2">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {analysis.modules.map((m) => (
                <tr key={m.module}>
                  <td className="pr-4 py-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {m.label}
                    {m.warnings.length > 0 && (
                      <span className="ml-1.5 text-[9px]" style={{ color: "rgba(245,158,11,0.6)" }}>⚠</span>
                    )}
                  </td>
                  <td className="pr-4 py-1.5 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{m.localCount}</td>
                  <td className="pr-4 py-1.5 text-right" style={{ color: m.eligibleCount > 0 ? "rgba(52,211,153,0.75)" : "rgba(255,255,255,0.2)" }}>
                    {m.eligibleCount}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: m.skippedCount > 0 ? "rgba(245,158,11,0.65)" : "rgba(255,255,255,0.2)" }}>
                    {m.skippedCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td className="pt-2 pr-4 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Total</td>
                <td className="pt-2 pr-4 text-right text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{analysis.totalLocal}</td>
                <td className="pt-2 pr-4 text-right text-[10px] font-semibold" style={{ color: "rgba(52,211,153,0.65)" }}>{analysis.totalEligible}</td>
                <td className="pt-2 text-right text-[10px] font-semibold" style={{ color: "rgba(245,158,11,0.55)" }}>{analysis.totalSkipped}</td>
              </tr>
            </tfoot>
          </table>

          {/* Per-module warnings */}
          {hasWarnings && (
            <div className="mt-4 space-y-1">
              {analysis.modules.flatMap((m) =>
                m.warnings.map((w, i) => (
                  <p key={`${m.module}-${i}`} className="text-[10px]" style={{ color: "rgba(245,158,11,0.6)" }}>
                    {m.label}: {w}
                  </p>
                ))
              )}
            </div>
          )}
        </div>

        {/* Confirmation + action */}
        {hasData ? (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)" }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 shrink-0 accent-violet-400"
              />
              <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                I understand this will copy{" "}
                <strong style={{ color: "rgba(165,180,252,0.85)" }}>
                  {analysis.totalEligible} item{analysis.totalEligible !== 1 ? "s" : ""}
                </strong>{" "}
                from localStorage to Supabase. My local data will not be changed or deleted.
                This operation is safe to run again — all writes use upsert on the existing ID.
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMigrate}
                disabled={!confirmed}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30"
                style={{ background: "rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.9)", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Run Migration
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.03)", color: "rgba(148,163,184,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Nothing eligible to migrate.
            </p>
            <button onClick={handleReset} className="text-xs underline" style={{ color: "rgba(148,163,184,0.4)" }}>
              Reset
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Migrating ─────────────────────────────────────────────────────────────

  if (phase === "migrating") {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}
      >
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: "rgba(99,102,241,0.5)" }} />
        <span className="text-xs" style={{ color: "rgba(165,180,252,0.7)" }}>
          Migrating data to Supabase… do not close this tab.
        </span>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (phase === "done" && result) {
    const allSucceeded = result.totalFailed === 0;

    return (
      <div className="space-y-4">
        {/* Summary banner */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: allSucceeded ? "rgba(52,211,153,0.05)" : "rgba(245,158,11,0.05)",
            border: allSucceeded ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: allSucceeded ? "rgba(52,211,153,0.85)" : "rgba(245,158,11,0.7)" }} />
            <span className="text-sm font-semibold" style={{ color: allSucceeded ? "rgba(52,211,153,0.9)" : "rgba(245,158,11,0.85)" }}>
              {allSucceeded ? "Migration Complete" : "Migration Complete with Errors"}
            </span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {result.totalSucceeded} of {result.totalAttempted} items migrated successfully.
            {result.totalFailed > 0 && ` ${result.totalFailed} item(s) failed — see details below.`}
          </p>
        </div>

        {/* Per-module result table */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 2px" }}>
            <thead>
              <tr style={{ color: "rgba(148,163,184,0.4)" }}>
                <th className="text-left font-semibold pb-2 pr-4">Module</th>
                <th className="text-right font-semibold pb-2 pr-4">Attempted</th>
                <th className="text-right font-semibold pb-2 pr-4">Succeeded</th>
                <th className="text-right font-semibold pb-2">Failed</th>
              </tr>
            </thead>
            <tbody>
              {result.modules.map((m) => (
                <tr key={m.module}>
                  <td className="pr-4 py-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>{m.label}</td>
                  <td className="pr-4 py-1.5 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{m.attempted}</td>
                  <td className="pr-4 py-1.5 text-right" style={{ color: "rgba(52,211,153,0.75)" }}>{m.succeeded}</td>
                  <td className="py-1.5 text-right" style={{ color: m.failed > 0 ? "rgba(248,113,113,0.75)" : "rgba(255,255,255,0.2)" }}>
                    {m.failed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Error detail */}
          {result.modules.some((m) => m.errors.length > 0) && (
            <div className="mt-4 space-y-1 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {result.modules.flatMap((m) =>
                m.errors.map((e, i) => (
                  <p key={`${m.module}-${i}`} className="text-[10px]" style={{ color: "rgba(248,113,113,0.6)" }}>
                    {m.label}: {e}
                  </p>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] flex-1" style={{ color: "rgba(255,255,255,0.2)" }}>
            Your local data is unchanged. This migration can be run again safely.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
