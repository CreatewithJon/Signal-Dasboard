"use client";

import { useState } from "react";
import { Card } from "./Card";

const initialTasks = [
  { id: 1, text: "Review Bitcoin position sizing", done: false },
  { id: 2, text: "Write weekly reflection", done: true },
  { id: 3, text: "Read 30 pages of Deep Work", done: false },
];

export default function ProductivityPanel() {
  const [tasks, setTasks] = useState(initialTasks);
  const [note, setNote] = useState("");

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  const done = tasks.filter((t) => t.done).length;
  const progress = (done / tasks.length) * 100;

  return (
    <Card className="p-7 h-full flex flex-col gap-7" id="focus">

      {/* Focus block */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-3">
          Today&apos;s Focus
        </p>
        <p className="text-lg font-semibold text-white/90 leading-snug mb-4">
          Build the dashboard MVP
        </p>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                boxShadow: "0 0 8px rgba(245,158,11,0.5)",
              }}
            />
          </div>
          <span className="text-[10px] text-white/25 shrink-0 font-medium">
            {done}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-3">
          Priorities
        </p>
        <div className="space-y-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="w-full flex items-start gap-3 text-left group"
            >
              <span
                className="mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all"
                style={{
                  background: task.done ? "rgba(245,158,11,0.9)" : "transparent",
                  border: task.done
                    ? "1px solid rgba(245,158,11,0.9)"
                    : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: task.done ? "0 0 8px rgba(245,158,11,0.4)" : "none",
                }}
              >
                {task.done && (
                  <svg viewBox="0 0 10 10" fill="none" stroke="black" strokeWidth="1.8" className="w-2.5 h-2.5">
                    <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm leading-relaxed transition-colors ${
                  task.done ? "text-white/20 line-through" : "text-white/60 group-hover:text-white/80"
                }`}
              >
                {task.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Deep Work</p>
          <p className="text-sm font-semibold text-white/70">4h 20m</p>
        </div>
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Streak</p>
          <p
            className="text-sm font-semibold"
            style={{ color: "#f59e0b", textShadow: "0 0 8px rgba(245,158,11,0.5)" }}
          >
            12 days
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="mt-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-3">
          Quick Note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Capture a thought..."
          rows={3}
          className="w-full text-sm text-white/60 placeholder:text-white/15 focus:outline-none resize-none rounded-xl px-4 py-3 transition-colors"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
          }}
        />
      </div>
    </Card>
  );
}
