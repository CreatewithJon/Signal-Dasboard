"use client";

/**
 * components/settings/DemoModeSettings.tsx — Sovereign OS v7.2
 *
 * Settings panel for Demo Mode.
 *
 * Shows:
 * - Pre-demo warning (always visible): export data before enabling demo mode
 * - Toggle to enable / disable demo mode (reloads page to apply)
 * - Reset Demo Data button (only when active): re-injects clean demo data
 * - Status: whether demo mode is on and what it affects
 */

import { useState, useEffect } from "react";
import { isDemoMode, enterDemoMode, exitDemoMode, resetDemoData } from "@/lib/demo/demoMode";

export default function DemoModeSettings() {
  const [active, setActive] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setActive(isDemoMode());
  }, []);

  function handleToggle() {
    if (active) {
      exitDemoMode();
    } else {
      enterDemoMode();
    }
    window.location.reload();
  }

  function handleReset() {
    setResetting(true);
    resetDemoData();
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }

  return (
    <div className="space-y-3">

      {/* Pre-demo warning — always visible */}
      <div
        className="rounded-xl px-4 py-3.5 flex items-start gap-3"
        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}
      >
        <span className="text-sm shrink-0 mt-0.5">⚠</span>
        <div>
          <p className="text-xs font-semibold text-amber-400/80 mb-1">Before demoing or screen-sharing</p>
          <ol className="space-y-0.5">
            {[
              "Export your data below (Data & Storage → Export All)",
              "Enable Demo Mode — loads safe sample data instead",
              "Exit Demo Mode when done to restore your real data",
            ].map((step, i) => (
              <li key={i} className="text-[11px] text-white/35 leading-relaxed">
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Toggle card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: active ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.025)",
          border: active ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {active && (
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(239,68,68,0.8)" }} />
              )}
              <p className="text-sm font-semibold" style={{ color: active ? "rgba(252,165,165,0.9)" : "rgba(255,255,255,0.65)" }}>
                {active ? "Demo Mode Active" : "Demo Mode"}
              </p>
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed">
              {active
                ? "Showing demo data. Your real data is backed up and will be restored on exit."
                : "Replaces your real data with safe sample data for demos. Your data is backed up and restored on exit."}
            </p>
          </div>

          {/* Toggle */}
          <button
            onClick={handleToggle}
            className="shrink-0 w-11 h-6 rounded-full transition-all relative"
            style={{
              background: active ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)",
              border: active ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.1)",
            }}
            aria-label={active ? "Disable demo mode" : "Enable demo mode"}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
              style={{
                left: active ? "calc(100% - 22px)" : "2px",
                background: active ? "rgba(252,165,165,0.9)" : "rgba(255,255,255,0.3)",
              }}
            />
          </button>
        </div>

        {/* What demo mode affects */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20 mb-2">
            Affected data
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Projects", "Tasks", "Memory", "Relationships", "Opportunities"].map((label) => (
              <span
                key={label}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: active ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                  color: active ? "rgba(252,165,165,0.7)" : "rgba(255,255,255,0.25)",
                  border: active ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-2">
            Planner, Habits, Focus Sessions, and all AI messages are not affected.
          </p>
        </div>
      </div>

      {/* Reset Demo Data — only when active */}
      {active && (
        <div
          className="rounded-xl px-4 py-3.5 flex items-center justify-between gap-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-xs font-semibold text-white/50">Reset Demo Data</p>
            <p className="text-[10px] text-white/25 mt-0.5">
              Re-inject clean demo data. Your real backup is not affected.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "rgba(252,165,165,0.8)",
            }}
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
        </div>
      )}
    </div>
  );
}
