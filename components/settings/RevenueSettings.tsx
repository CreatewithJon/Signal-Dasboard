"use client";

/**
 * components/settings/RevenueSettings.tsx — Sovereign OS v7.7
 *
 * Revenue Defaults — configure default close probability and monthly goal.
 * Persists to sovereign_revenue_settings in localStorage.
 */

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";
import { DEFAULT_REVENUE_SETTINGS, type RevenueSettings } from "@/lib/revenue/engine";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function RevenueSettingsPanel() {
  const [prob,    setProb]    = useState(DEFAULT_REVENUE_SETTINGS.defaultCloseProbability * 100);
  const [goal,    setGoal]    = useState(DEFAULT_REVENUE_SETTINGS.monthlyRevenueGoal);
  const [saved,   setSaved]   = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const s = safeRead<RevenueSettings>(KEYS.REVENUE_SETTINGS, DEFAULT_REVENUE_SETTINGS);
    setProb(Math.round(s.defaultCloseProbability * 100));
    setGoal(s.monthlyRevenueGoal);
    setLoaded(true);
  }, []);

  function handleSave() {
    if (typeof window === "undefined") return;
    const settings: RevenueSettings = {
      defaultCloseProbability: Math.max(0, Math.min(100, prob)) / 100,
      monthlyRevenueGoal:      Math.max(0, goal),
    };
    try {
      localStorage.setItem(KEYS.REVENUE_SETTINGS, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // noop
    }
  }

  if (!loaded) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{ height: 120, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      />
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.75)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    outline: "none",
    width: "100%",
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(52,211,153,0.02)", border: "1px solid rgba(52,211,153,0.1)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M1 9l2.5-2.5 2 2L9 4l2-1.5" stroke="rgba(52,211,153,0.85)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xs font-bold text-white/70">Revenue Defaults</p>
      </div>

      <div className="space-y-4">
        {/* Default close probability */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.1em]">
              Default Close Probability
            </label>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(52,211,153,0.8)" }}>
              {prob}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={prob}
            onChange={(e) => setProb(Number(e.target.value))}
            className="w-full accent-emerald-400"
            style={{ accentColor: "rgba(52,211,153,0.85)" }}
          />
          <p className="text-[9px] text-white/20 mt-1">
            Applied to opportunities with no close probability set. Default: 25%.
          </p>
        </div>

        {/* Monthly revenue goal */}
        <div>
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.1em] block mb-1.5">
            Monthly Revenue Goal ($)
          </label>
          <input
            type="number"
            min={0}
            step={100}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            style={inputStyle}
            placeholder="5000"
          />
          <p className="text-[9px] text-white/20 mt-1">
            Used as the target for goal tracking and gap calculations. Default: $5,000.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: saved ? "rgba(52,211,153,0.15)" : "rgba(52,211,153,0.08)",
            border: `1px solid ${saved ? "rgba(52,211,153,0.35)" : "rgba(52,211,153,0.18)"}`,
            color: saved ? "rgba(52,211,153,0.9)" : "rgba(52,211,153,0.65)",
          }}
        >
          {saved ? "Saved ✓" : "Save Revenue Defaults"}
        </button>
      </div>
    </div>
  );
}
