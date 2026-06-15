"use client";

import { useState, useEffect } from "react";
import { Card } from "./Card";

interface Habit {
  id: string;
  name: string;
  icon: string;
}

const DEFAULT_HABITS: Habit[] = [
  { id: "morning", name: "Morning Review", icon: "☀️" },
  { id: "exercise", name: "Move / Exercise", icon: "⚡" },
  { id: "read", name: "Read 30 Pages", icon: "📖" },
  { id: "noScroll", name: "No Mindless Scroll", icon: "🚫" },
  { id: "reflect", name: "Evening Reflect", icon: "🌙" },
];

const HABITS_KEY = "sovereign_habits";
const LOG_KEY = "sovereign_habit_log";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStreak(habitId: string, log: Record<string, string[]>): number {
  let streak = 0;
  const date = new Date();
  if (!log[todayKey()]?.includes(habitId)) {
    date.setDate(date.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const key = date.toISOString().slice(0, 10);
    if (log[key]?.includes(habitId)) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else break;
  }
  return streak;
}

function newId(): string {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function HabitPanel() {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [log, setLog] = useState<Record<string, string[]>>({});
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editHabits, setEditHabits] = useState<Habit[]>([]);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  useEffect(() => {
    try {
      const savedHabits = localStorage.getItem(HABITS_KEY);
      if (savedHabits) setHabits(JSON.parse(savedHabits));
      const savedLog = localStorage.getItem(LOG_KEY);
      if (savedLog) setLog(JSON.parse(savedLog));
    } catch {}
    setMounted(true);
  }, []);

  function toggle(habitId: string) {
    const key = todayKey();
    setLog((prev) => {
      const todayList = prev[key] ?? [];
      const next = todayList.includes(habitId)
        ? todayList.filter((id) => id !== habitId)
        : [...todayList, habitId];
      const updated = { ...prev, [key]: next };
      try { localStorage.setItem(LOG_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function openEdit() {
    setEditHabits(habits.map((h) => ({ ...h })));
    setNewName("");
    setNewIcon("");
    setEditing(true);
  }

  function saveEdit() {
    const cleaned = editHabits.filter((h) => h.name.trim());
    setHabits(cleaned);
    try { localStorage.setItem(HABITS_KEY, JSON.stringify(cleaned)); } catch {}
    setEditing(false);
  }

  function updateEditHabit(id: string, field: "name" | "icon", value: string) {
    setEditHabits((prev) => prev.map((h) => h.id === id ? { ...h, [field]: value } : h));
  }

  function deleteEditHabit(id: string) {
    setEditHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function addHabit() {
    if (!newName.trim()) return;
    const habit: Habit = { id: newId(), name: newName.trim(), icon: newIcon.trim() || "✦" };
    setEditHabits((prev) => [...prev, habit]);
    setNewName("");
    setNewIcon("");
  }

  const todayDone = log[todayKey()] ?? [];
  const doneCount = habits.filter((h) => todayDone.includes(h.id)).length;
  const allDone = habits.length > 0 && doneCount === habits.length;
  const pct = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <Card className="p-5 md:p-7 h-full flex flex-col gap-5" id="habits" glow="0 0 80px rgba(52,211,153,0.06)">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/50 mb-0.5">
            Daily Habits
          </p>
          <p className="text-xs text-white/25">
            {doneCount}/{habits.length} complete today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={editing ? saveEdit : openEdit}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: editing ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
              border: editing ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,255,255,0.08)",
              color: editing ? "rgba(52,211,153,0.9)" : "rgba(255,255,255,0.3)",
            }}
          >
            {editing ? "Save" : "Edit"}
          </button>
          {!editing && (
            <p
              className="text-3xl font-bold tracking-tight tabular-nums"
              style={{
                color: allDone ? "#34d399" : pct > 0 ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.2)",
                textShadow: allDone ? "0 0 16px rgba(52,211,153,0.4)" : "none",
                transition: "color 0.3s ease",
              }}
            >
              {pct}%
            </p>
          )}
          {editing && (
            <button
              onClick={() => setEditing(false)}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — only in normal mode */}
      {!editing && (
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #10b981, #34d399)",
              boxShadow: doneCount > 0 ? "0 0 8px rgba(52,211,153,0.5)" : "none",
            }}
          />
        </div>
      )}

      {/* ── Normal mode ── */}
      {!editing && (
        <div className="flex-1 flex flex-col gap-2">
          {habits.map((habit) => {
            const done = todayDone.includes(habit.id);
            const streak = mounted ? getStreak(habit.id, log) : 0;
            return (
              <button
                key={habit.id}
                onClick={() => toggle(habit.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                style={{
                  background: done ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.03)",
                  border: done ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-base w-5 text-center shrink-0">{habit.icon}</span>
                <span className="flex-1 text-sm font-medium transition-colors"
                  style={{ color: done ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)" }}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <span className="text-[10px] font-bold shrink-0" style={{ color: "rgba(245,158,11,0.65)" }}>
                    {streak}d 🔥
                  </span>
                )}
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: done ? "rgba(52,211,153,0.85)" : "transparent",
                    border: done ? "1px solid rgba(52,211,153,0.85)" : "1px solid rgba(255,255,255,0.12)",
                    boxShadow: done ? "0 0 8px rgba(52,211,153,0.35)" : "none",
                  }}
                >
                  {done && (
                    <svg viewBox="0 0 10 10" fill="none" stroke="black" strokeWidth="2" className="w-2.5 h-2.5">
                      <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Edit mode ── */}
      {editing && (
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Edit your habits</p>

          {editHabits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-2 p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <input
                value={habit.icon}
                onChange={(e) => updateEditHabit(habit.id, "icon", e.target.value)}
                maxLength={2}
                className="w-8 text-center bg-transparent text-base focus:outline-none"
                placeholder="✦"
              />
              <input
                value={habit.name}
                onChange={(e) => updateEditHabit(habit.id, "name", e.target.value)}
                className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none"
                placeholder="Habit name"
              />
              <button
                onClick={() => deleteEditHabit(habit.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-rose-500/15"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Add new habit */}
          <div
            className="flex items-center gap-2 p-2 rounded-xl mt-1"
            style={{ background: "rgba(52,211,153,0.04)", border: "1px dashed rgba(52,211,153,0.15)" }}
          >
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              maxLength={2}
              className="w-8 text-center bg-transparent text-base focus:outline-none"
              placeholder="✦"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
              className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none"
              placeholder="New habit name..."
            />
            <button
              onClick={addHabit}
              disabled={!newName.trim()}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-30"
              style={{
                background: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "rgba(52,211,153,0.8)",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* All done message */}
      {!editing && allDone && (
        <div
          className="text-center py-2 rounded-xl"
          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "rgba(52,211,153,0.75)" }}>
            Perfect day. All habits complete. 🙌
          </p>
        </div>
      )}
    </Card>
  );
}
