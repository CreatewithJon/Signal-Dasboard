"use client";

import { useEffect, useState } from "react";
import { getSyncHealth, type SyncHealthReport } from "@/lib/supabase/syncHealth";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ResultDot({ result }: { result: "success" | "skipped" | "failed" | undefined }) {
  if (result === undefined)
    return <span style={{ color: "rgba(148,163,184,0.3)" }}>—</span>;
  if (result === "success")
    return <span style={{ color: "rgba(52,211,153,0.8)" }}>●</span>;
  if (result === "failed")
    return <span style={{ color: "rgba(248,113,113,0.8)" }}>●</span>;
  return <span style={{ color: "rgba(148,163,184,0.35)" }}>○</span>; // skipped
}

export default function SyncHealth() {
  const [report, setReport] = useState<SyncHealthReport | null>(null);

  useEffect(() => {
    setReport(getSyncHealth());
  }, []);

  if (!report) return null;

  const { supabaseConfigured, modules, localOnlyModules, exportAvailable } = report;

  return (
    <section
      className="rounded-2xl p-6"
      style={{ background: "rgba(15,15,20,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1"
             style={{ color: "rgba(167,139,250,0.7)" }}>
            Sync Health
          </p>
          <h2 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
            Per-Module Sync Status
          </h2>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
          style={
            supabaseConfigured
              ? { background: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.8)", border: "1px solid rgba(52,211,153,0.15)" }
              : { background: "rgba(245,158,11,0.08)", color: "rgba(245,158,11,0.75)", border: "1px solid rgba(245,158,11,0.15)" }
          }
        >
          <span>{supabaseConfigured ? "●" : "○"}</span>
          {supabaseConfigured ? "Supabase Ready" : "Local Only"}
        </div>
      </div>

      {/* Unconfigured warning */}
      {!supabaseConfigured && (
        <div
          className="mb-4 px-3 py-2.5 rounded-xl text-xs"
          style={{ background: "rgba(245,158,11,0.07)", color: "rgba(245,158,11,0.75)", border: "1px solid rgba(245,158,11,0.12)" }}
        >
          Supabase is not configured. All writes go to localStorage only. Add{" "}
          <code className="opacity-80">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="opacity-80">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable sync.
        </div>
      )}

      {/* Module table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 2px" }}>
          <thead>
            <tr style={{ color: "rgba(148,163,184,0.4)" }}>
              <th className="text-left font-semibold pb-2 pr-4">Module</th>
              <th className="text-left font-semibold pb-2 pr-4">Table</th>
              <th className="text-right font-semibold pb-2 pr-4">Local</th>
              <th className="text-center font-semibold pb-2 pr-4">Last Sync</th>
              <th className="text-left font-semibold pb-2">When</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((mod) => (
              <tr key={mod.module}>
                <td className="pr-4 py-1.5" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {mod.label}
                </td>
                <td className="pr-4 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>
                  <code>{mod.table}</code>
                </td>
                <td className="pr-4 py-1.5 text-right" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {mod.localCount}
                </td>
                <td className="pr-4 py-1.5 text-center">
                  <ResultDot result={mod.lastResult?.supabase} />
                  {mod.lastResult?.supabase === "failed" && (
                    <span className="ml-1" style={{ color: "rgba(248,113,113,0.7)" }}>
                      {mod.lastResult.operation}
                    </span>
                  )}
                </td>
                <td className="py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>
                  {mod.lastResult ? timeAgo(mod.lastResult.timestamp) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Failure detail */}
      {modules.some((m) => m.lastResult?.supabase === "failed") && (
        <div className="mt-4 space-y-1.5">
          {modules
            .filter((m) => m.lastResult?.supabase === "failed")
            .map((m) => (
              <div
                key={m.module}
                className="px-3 py-2 rounded-lg text-[10px]"
                style={{ background: "rgba(248,113,113,0.06)", color: "rgba(248,113,113,0.7)", border: "1px solid rgba(248,113,113,0.1)" }}
              >
                <span className="font-semibold">{m.label}:</span>{" "}
                {m.lastResult?.error ?? "Supabase write failed — data saved locally"}
              </div>
            ))}
        </div>
      )}

      {/* Local-only modules */}
      {localOnlyModules.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
             style={{ color: "rgba(148,163,184,0.4)" }}>
            localStorage Only (not yet synced)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {localOnlyModules.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded-md text-[10px]"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Export availability hint */}
      <p className="mt-4 text-[10px]" style={{ color: "rgba(148,163,184,0.35)" }}>
        {exportAvailable
          ? "Export available — use Export All Data below to create a local backup."
          : "No data in localStorage yet."}
      </p>
    </section>
  );
}
