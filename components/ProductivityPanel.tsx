"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "./Card";

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: 1, text: "Review Bitcoin position sizing", done: false },
  { id: 2, text: "Write weekly reflection", done: false },
  { id: 3, text: "Read 30 pages of Deep Work", done: false },
];

const TASKS_KEY = "signal_tasks";
const NOTE_KEY = "signal_note";
const SESSIONS_KEY = "signal_sessions";
const STREAK_KEY = "signal_streak";

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return DEFAULT_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TASKS;
  } catch { return DEFAULT_TASKS; }
}

function loadNote(): string {
  try { return localStorage.getItem(NOTE_KEY) ?? ""; } catch { return ""; }
}

function loadSessions(): number {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    return date === todayStr() ? count : 0;
  } catch { return 0; }
}

function saveSessions(count: number) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify({ date: todayStr(), count }));
}

function loadStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { lastDate, streak } = JSON.parse(raw);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (lastDate === todayStr() || lastDate === yStr) return streak;
    return 0;
  } catch { return 0; }
}

function updateStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    let newStreak = 1;
    if (raw) {
      const { lastDate, streak } = JSON.parse(raw);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      if (lastDate === todayStr()) newStreak = streak; // already credited today
      else if (lastDate === yStr) newStreak = streak + 1;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: todayStr(), streak: newStreak }));
    return newStreak;
  } catch { return 1; }
}

// Circular timer ring
function TimerRing({ progress, mode }: { progress: number; mode: "work" | "break" }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.max(0, Math.min(1, progress)));
  const color = mode === "work" ? "#f59e0b" : "#34d399";
  return (
    <svg width="112" height="112" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx="56" cy="56" r={R}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${C}`}
        strokeDashoffset={`${offset}`}
        style={{
          transition: "stroke-dashoffset 0.8s linear, stroke 0.4s ease",
          filter: `drop-shadow(0 0 5px ${color}80)`,
        }}
      />
    </svg>
  );
}

export default function ProductivityPanel() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [note, setNote] = useState("");
  const [mounted, setMounted] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Timer state
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [streak, setStreak] = useState(0);

  // Refs to avoid stale closures in interval
  const modeRef = useRef<"work" | "break">("work");
  const sessionsRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { mountedRef.current = mounted; }, [mounted]);

  // Load from localStorage after mount
  useEffect(() => {
    setTasks(loadTasks());
    setNote(loadNote());
    setSessions(loadSessions());
    setStreak(loadStreak());
    setMounted(true);
  }, []);

  // Persist tasks
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks, mounted]);

  // Persist note (debounced)
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => localStorage.setItem(NOTE_KEY, note), 500);
    return () => clearTimeout(t);
  }, [note, mounted]);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Handle session complete when timeLeft hits 0
  useEffect(() => {
    if (!running || timeLeft > 0) return;
    setRunning(false);
    if (modeRef.current === "work") {
      const next = sessionsRef.current + 1;
      setSessions(next);
      if (mountedRef.current) {
        saveSessions(next);
        setStreak(updateStreak());
      }
      setMode("break");
      setTimeLeft(BREAK_SECS);
    } else {
      setMode("work");
      setTimeLeft(WORK_SECS);
    }
  }, [timeLeft, running]);

  function resetTimer() {
    setRunning(false);
    setMode("work");
    setTimeLeft(WORK_SECS);
  }

  function toggleTask(id: number) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now(), text: newTask.trim(), done: false }]);
    setNewTask("");
    setAddingTask(false);
  }

  const total = mode === "work" ? WORK_SECS : BREAK_SECS;
  const progress = (total - timeLeft) / total;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const deepWorkMins = sessions * 25;
  const deepWorkStr =
    deepWorkMins === 0 ? "—"
    : deepWorkMins >= 60 ? `${Math.floor(deepWorkMins / 60)}h ${deepWorkMins % 60 > 0 ? deepWorkMins % 60 + "m" : ""}`
    : `${deepWorkMins}m`;
  const timerColor = mode === "work" ? "#f59e0b" : "#34d399";

  const done = tasks.filter((t) => t.done).length;
  const taskProgress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  return (
    <Card className="p-5 md:p-7 h-full flex flex-col gap-5" id="focus">

      {/* ── Pomodoro Timer ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            {mode === "work" ? "Focus Timer" : "Break Time"}
          </p>
          <span className="text-[10px] text-white/20 font-medium">
            {sessions} session{sessions !== 1 ? "s" : ""} today
          </span>
        </div>

        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative w-[112px] h-[112px] shrink-0 flex items-center justify-center">
            <TimerRing progress={progress} mode={mode} />
            <div className="relative text-center z-10">
              <p
                className="text-2xl font-bold tabular-nums tracking-tight leading-none"
                style={{ color: timerColor, textShadow: `0 0 16px ${timerColor}60` }}
              >
                {mins}:{secs}
              </p>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">
                {mode === "work" ? "focus" : "break"}
              </p>
            </div>
          </div>

          {/* Controls + stats */}
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: running ? "rgba(248,113,113,0.1)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${running ? "rgba(248,113,113,0.25)" : "rgba(245,158,11,0.22)"}`,
                  color: running ? "rgba(248,113,113,0.9)" : timerColor,
                }}
              >
                {running ? "Pause" : timeLeft < total && timeLeft > 0 ? "Resume" : "Start"}
              </button>
              <button
                onClick={resetTimer}
                title="Reset"
                className="w-10 h-9 rounded-xl flex items-center justify-center transition-all hover:text-white/50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.22)",
                  fontSize: "16px",
                }}
              >
                ↺
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Deep Work</p>
                <p className="text-sm font-semibold text-white/75">{deepWorkStr}</p>
              </div>
              <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Streak</p>
                <p className="text-sm font-semibold" style={{ color: streak > 0 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
                  {streak > 0 ? `${streak}d 🔥` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* ── Tasks ── */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Priorities</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/20">{done}/{tasks.length}</span>
            <button
              onClick={() => setAddingTask((a) => !a)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-white/25 hover:text-white/55 transition-colors text-base leading-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Add priority"
            >
              +
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] rounded-full overflow-hidden mb-3.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${taskProgress}%`,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
              boxShadow: taskProgress > 0 ? "0 0 6px rgba(245,158,11,0.5)" : "none",
            }}
          />
        </div>

        {/* Add task input */}
        {addingTask && (
          <div className="flex gap-2 mb-3">
            <input
              autoFocus
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
                if (e.key === "Escape") setAddingTask(false);
              }}
              placeholder="New priority..."
              className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              onClick={addTask}
              className="text-xs px-3 py-2 rounded-xl font-bold"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", color: "#f59e0b" }}
            >
              Add
            </button>
          </div>
        )}

        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 group">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all"
                style={{
                  background: task.done ? "rgba(245,158,11,0.9)" : "transparent",
                  border: task.done ? "1px solid rgba(245,158,11,0.9)" : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: task.done ? "0 0 8px rgba(245,158,11,0.35)" : "none",
                }}
              >
                {task.done && (
                  <svg viewBox="0 0 10 10" fill="none" stroke="black" strokeWidth="2" className="w-2.5 h-2.5">
                    <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm leading-relaxed transition-colors ${task.done ? "text-white/20 line-through" : "text-white/60"}`}>
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/50 transition-all text-base leading-none mt-0.5 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-white/20 text-sm">No priorities. Add one above.</p>
          )}
        </div>
      </div>

      {/* ── Quick Note ── */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2">
          Quick Note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Capture a thought..."
          rows={2}
          className="w-full text-sm text-white/65 placeholder:text-white/15 focus:outline-none resize-none rounded-xl px-4 py-3 transition-colors leading-relaxed"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)"; }}
          onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; }}
        />
      </div>
    </Card>
  );
}
