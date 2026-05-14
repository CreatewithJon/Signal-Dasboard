"use client";

import { useState, useEffect } from "react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatFocus(mins: number): string {
  if (mins === 0) return "—";
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

export default function HeroStats({
  btcPrice,
  btcChange,
}: {
  btcPrice: number;
  btcChange: number;
}) {
  const [focusMins, setFocusMins] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read today's focus sessions
    try {
      const raw = localStorage.getItem("signal_sessions");
      if (raw) {
        const { date, count } = JSON.parse(raw);
        setFocusMins(date === todayStr() ? (count as number) * 25 : 0);
      }
    } catch {}

    // Read streak
    try {
      const raw = localStorage.getItem("signal_streak");
      if (raw) {
        const { lastDate, streak: s } = JSON.parse(raw);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        setStreak(lastDate === todayStr() || lastDate === yStr ? (s as number) : 0);
      }
    } catch {}

    setMounted(true);
  }, []);

  const isUp = btcChange >= 0;

  const pills = [
    {
      label: "BTC",
      value: "$" + btcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      sub: (isUp ? "↑ " : "↓ ") + Math.abs(btcChange).toFixed(2) + "%",
      subColor: isUp ? "rgba(52,211,153,0.9)" : "rgba(248,113,113,0.9)",
      accentColor: "#f59e0b",
    },
    {
      label: "Focus",
      value: mounted ? formatFocus(focusMins) : "—",
      sub: mounted && focusMins > 0 ? "today" : "",
      subColor: "rgba(255,255,255,0.3)",
      accentColor: "rgba(255,255,255,0.85)",
    },
    {
      label: "Streak",
      value: mounted ? (streak > 0 ? `${streak}d` : "—") : "—",
      sub: mounted && streak > 0 ? "🔥" : "",
      subColor: "rgba(245,158,11,0.9)",
      accentColor: streak > 0 ? "#f59e0b" : "rgba(255,255,255,0.3)",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap relative">
      {pills.map(({ label, value, sub, subColor, accentColor }) => (
        <div
          key={label}
          className="flex items-center gap-3.5 px-4 py-3 md:px-6 md:py-4 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.045)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-semibold">
            {label}
          </span>
          <span className="w-px h-3 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs md:text-sm font-semibold" style={{ color: accentColor }}>
            {value}
          </span>
          {sub && (
            <span className="text-[11px] md:text-xs font-medium" style={{ color: subColor }}>
              {sub}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
