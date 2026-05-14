"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

type Horizon = "1yr" | "3yr" | "5yr";

interface Props {
  horizon: Horizon;
}

const DEFAULTS: Record<Horizon, string[]> = {
  "1yr": [
    "Build a profitable AI services business",
    "Grow Digital Wealth Transfer to 100+ clients",
    "Stack Bitcoin consistently every month",
    "Establish a strong personal brand online",
  ],
  "3yr": [
    "Multiple income streams generating $10K+/month",
    "Financial freedom — no mandatory job",
    "Strong presence in AI and Bitcoin space",
    "Build and own digital assets that compound",
  ],
  "5yr": [
    "Financially free. Time sovereign.",
    "Build wealth that outlasts me",
    "Launch a platform used by thousands",
    "Live aligned with faith, family, and impact",
  ],
};

const CONFIG: Record<Horizon, { label: string; color: string; glow: string; borderColor: string }> = {
  "1yr": {
    label: "1-Year Goals",
    color: "#a78bfa",
    glow: "0 0 60px rgba(139,92,246,0.07)",
    borderColor: "rgba(139,92,246,0.18)",
  },
  "3yr": {
    label: "3-Year Vision",
    color: "#818cf8",
    glow: "0 0 60px rgba(99,102,241,0.07)",
    borderColor: "rgba(99,102,241,0.18)",
  },
  "5yr": {
    label: "5-Year Vision",
    color: "#60a5fa",
    glow: "0 0 60px rgba(59,130,246,0.07)",
    borderColor: "rgba(59,130,246,0.18)",
  },
};

export default function LongTermVisionCard({ horizon }: Props) {
  const storageKey = `signal_planner_${horizon}`;
  const { label, color, glow, borderColor } = CONFIG[horizon];

  const [items, setItems] = useState<string[]>(DEFAULTS[horizon]);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, mounted, storageKey]);

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function add() {
    if (!newText.trim()) return;
    setItems((prev) => [...prev, newText.trim()]);
    setNewText("");
    setAdding(false);
  }

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-4 h-full" glow={glow}>
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color }}
        >
          {label}
        </p>
        <button
          onClick={() => setAdding((a) => !a)}
          className="w-5 h-5 rounded-md flex items-center justify-center text-white/25 hover:text-white/55 transition-colors text-sm leading-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          +
        </button>
      </div>

      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Add a goal..."
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${borderColor}` }}
          />
          <button
            onClick={add}
            className="text-xs px-2.5 py-1.5 rounded-xl font-bold"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}
          >
            Add
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5 flex-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 group">
            <span
              className="mt-1.5 w-1 h-1 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="flex-1 text-sm text-white/55 leading-relaxed">{item}</span>
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/50 transition-all text-base leading-none shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-white/20 text-xs">No goals yet. Add one above.</p>
        )}
      </div>
    </Card>
  );
}
