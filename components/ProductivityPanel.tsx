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
    <Card className="p-8 h-full flex flex-col gap-6" id="focus">

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
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                boxShadow: progress > 0 ? "0 0 6px rgba(245,158,11,0.5)" : "none",
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
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/25 mb-1.5">Deep Work</p>
          <p className="text-sm font-semibold text-white/80">4h 20m</p>
        </div>
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/25 mb-1.5">Streak</p>
          <p
            className="text-sm font-semibold"
            style={{ color: "#f59e0b", textShadow: "0 0 10px rgba(245,158,11,0.5)" }}
          >
            12 days
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="mt-auto">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2.5">
          Quick Note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Capture a thought..."
          rows={3}
          className="w-full text-sm text-white/65 placeholder:text-white/15 focus:outline-none resize-none rounded-xl px-4 py-3.5 transition-colors leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "rgba(255,255,255,0.025)";
          }}
        />
      </div>
    </Card>
  );
}
