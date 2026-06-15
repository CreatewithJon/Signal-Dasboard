"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

interface Item {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULTS: Item[] = [
  { id: 1, text: "Generate new business leads", done: false },
  { id: 2, text: "Improve personal brand content", done: false },
  { id: 3, text: "Build app features", done: false },
  { id: 4, text: "Review finances", done: false },
  { id: 5, text: "Stay consistent with health routine", done: false },
];

const KEY = "sovereign_planner_weekly";

function weekStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const { week, items } = JSON.parse(raw);
    return week === weekStr() ? items : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function WeeklyPlanCard() {
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
    localStorage.setItem(KEY, JSON.stringify({ week: weekStr(), items }));
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

  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5 h-full" glow="0 0 60px rgba(139,92,246,0.05)">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-0.5">
            Weekly Priorities
          </p>
          <p className="text-xs text-white/25">{getWeekRange()}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-white/25 font-medium">{done}/{items.length}</span>
          <button
            onClick={() => setAdding((a) => !a)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-violet-400 transition-colors text-base leading-none"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
          >
            +
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #7c3aed, #8b5cf6)",
            boxShadow: pct > 0 ? "0 0 6px rgba(139,92,246,0.45)" : "none",
          }}
        />
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
            placeholder="New weekly priority..."
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
      </div>
    </Card>
  );
}
