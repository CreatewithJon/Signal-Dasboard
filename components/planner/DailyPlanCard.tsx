"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

interface Item {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULTS: Item[] = [
  { id: 1, text: "Send 10 outreach messages", done: false },
  { id: 2, text: "Work on Digital Wealth Transfer", done: false },
  { id: 3, text: "Create one content post", done: false },
  { id: 4, text: "Workout or walk", done: false },
  { id: 5, text: "Prayer / reflection time", done: false },
];

const KEY = "signal_planner_daily";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const { date, items } = JSON.parse(raw);
    return date === todayStr() ? items : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function DailyPlanCard() {
  const [items, setItems] = useState<Item[]>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    setItems(load());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(KEY, JSON.stringify({ date: todayStr(), items }));
  }, [items, mounted]);

  function toggle(id: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }
  function remove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function add() {
    if (!newText.trim()) return;
    setItems((prev) => [...prev, { id: Date.now(), text: newText.trim(), done: false }]);
    setNewText("");
    setAdding(false);
  }

  const done = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  const allDone = items.length > 0 && done === items.length;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5 h-full" glow="0 0 80px rgba(139,92,246,0.07)">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-0.5">
            Today&apos;s Plan
          </p>
          <p className="text-xs text-white/25">{today}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-white/25 font-medium">{done}/{items.length}</span>
          <button
            onClick={() => setAdding((a) => !a)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-violet-400 transition-colors text-base leading-none"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
            title="Add task"
          >
            +
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/25">Daily progress</span>
          <span
            className="text-[10px] font-bold"
            style={{ color: allDone ? "#34d399" : "rgba(139,92,246,0.85)" }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: allDone
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #7c3aed, #8b5cf6)",
              boxShadow: pct > 0
                ? `0 0 6px ${allDone ? "rgba(52,211,153,0.5)" : "rgba(139,92,246,0.5)"}`
                : "none",
            }}
          />
        </div>
      </div>

      {/* Add input */}
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
            placeholder="New priority..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.22)" }}
          />
          <button
            onClick={add}
            className="text-xs px-3 py-2 rounded-xl font-bold"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }}
          >
            Add
          </button>
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col gap-2.5 flex-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 group">
            <button
              onClick={() => toggle(item.id)}
              className="mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all"
              style={{
                background: item.done ? "rgba(139,92,246,0.85)" : "transparent",
                border: item.done
                  ? "1px solid rgba(139,92,246,0.85)"
                  : "1px solid rgba(255,255,255,0.15)",
                boxShadow: item.done ? "0 0 8px rgba(139,92,246,0.35)" : "none",
              }}
            >
              {item.done && (
                <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" className="w-2.5 h-2.5">
                  <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 text-sm leading-relaxed transition-colors ${
                item.done ? "text-white/25 line-through" : "text-white/65"
              }`}
            >
              {item.text}
            </span>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/50 transition-all text-base leading-none mt-0.5 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-white/20 text-sm">No priorities. Add one above.</p>
        )}
      </div>

      {allDone && (
        <div
          className="text-center py-2.5 rounded-xl"
          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.14)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "rgba(52,211,153,0.8)" }}>
            Day complete. Excellent execution. 🙌
          </p>
        </div>
      )}
    </Card>
  );
}
