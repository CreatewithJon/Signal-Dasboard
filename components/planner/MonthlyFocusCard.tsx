"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

const DEFAULTS = [
  "Build systems, not random tasks",
  "Improve lead generation",
  "Strengthen daily discipline",
  "Create visible progress",
];

const KEY = "sovereign_planner_monthly";

function monthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const { month, items } = JSON.parse(raw);
    return month === monthStr() ? items : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function MonthlyFocusCard() {
  const [items, setItems] = useState<string[]>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    setItems(load());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(KEY, JSON.stringify({ month: monthStr(), items }));
  }, [items, mounted]);

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function add() {
    if (!newText.trim()) return;
    setItems((prev) => [...prev, newText.trim()]);
    setNewText("");
    setAdding(false);
  }

  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5 h-full" glow="0 0 60px rgba(99,102,241,0.06)">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/60 mb-0.5">
            Monthly Focus
          </p>
          <p className="text-xs text-white/25">{month}</p>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-indigo-400 transition-colors text-base leading-none"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}
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
            placeholder="New monthly focus..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.22)" }}
          />
          <button
            onClick={add}
            className="text-xs px-3 py-2 rounded-xl font-bold"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}
          >
            Add
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "rgba(99,102,241,0.6)" }}
            />
            <span className="flex-1 text-sm text-white/60 leading-relaxed">{item}</span>
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/50 transition-all text-base leading-none shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-white/20 text-sm">No focus areas. Add one above.</p>
        )}
      </div>
    </Card>
  );
}
