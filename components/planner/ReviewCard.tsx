"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

type Period = "daily" | "weekly" | "monthly";

const QUESTIONS: Record<Period, { q: string; placeholder: string }[]> = {
  daily: [
    { q: "What did I complete today?", placeholder: "List what you actually finished..." },
    { q: "What moved me closer to my goals?", placeholder: "One specific action that compounded..." },
    { q: "What distracted me?", placeholder: "Be honest. Name the pattern..." },
    { q: "What is the priority tomorrow?", placeholder: "One non-negotiable task..." },
  ],
  weekly: [
    { q: "What were my biggest wins?", placeholder: "Real results, not activity..." },
    { q: "What did I avoid?", placeholder: "The uncomfortable thing I kept skipping..." },
    { q: "What should I double down on?", placeholder: "What worked and deserves more energy..." },
    { q: "What should I remove?", placeholder: "What drained time without results..." },
  ],
  monthly: [
    { q: "What progress did I make?", placeholder: "Measurable outcomes this month..." },
    { q: "What created revenue or momentum?", placeholder: "What actually moved the needle..." },
    { q: "What habits improved?", placeholder: "Behaviors that compounded positively..." },
    { q: "What needs to change next month?", placeholder: "Honest adjustments needed..." },
  ],
};

const BASE_KEY = "sovereign_planner_review";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function weekStr() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}
function monthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function periodKey(p: Period): string {
  if (p === "daily") return todayStr();
  if (p === "weekly") return weekStr();
  return monthStr();
}

function loadAnswers(period: Period): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${BASE_KEY}_${period}`);
    if (!raw) return {};
    const { key, answers } = JSON.parse(raw);
    return key === periodKey(period) ? answers : {};
  } catch {
    return {};
  }
}

function saveAnswers(period: Period, answers: Record<string, string>) {
  localStorage.setItem(
    `${BASE_KEY}_${period}`,
    JSON.stringify({ key: periodKey(period), answers })
  );
}

export default function ReviewCard() {
  const [period, setPeriod] = useState<Period>("daily");
  const [allAnswers, setAllAnswers] = useState<Record<Period, Record<string, string>>>({
    daily: {},
    weekly: {},
    monthly: {},
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAllAnswers({
      daily: loadAnswers("daily"),
      weekly: loadAnswers("weekly"),
      monthly: loadAnswers("monthly"),
    });
    setMounted(true);
  }, []);

  function setAnswer(q: string, val: string) {
    setAllAnswers((prev) => {
      const updated = {
        ...prev,
        [period]: { ...prev[period], [q]: val },
      };
      if (mounted) saveAnswers(period, updated[period]);
      return updated;
    });
  }

  const tabs: { key: Period; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  const filledCount = QUESTIONS[period].filter(
    ({ q }) => (allAnswers[period][q] ?? "").trim().length > 0
  ).length;

  return (
    <Card className="p-5 md:p-7 flex flex-col gap-6" glow="0 0 80px rgba(139,92,246,0.05)">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-0.5">
            Review &amp; Reflection
          </p>
          <p className="text-xs text-white/25">
            {filledCount}/{QUESTIONS[period].length} questions answered
          </p>
        </div>
        {/* Period tabs */}
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
              style={{
                background:
                  period === t.key ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  period === t.key ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.07)"
                }`,
                color:
                  period === t.key ? "rgba(167,139,250,0.95)" : "rgba(255,255,255,0.3)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {QUESTIONS[period].map(({ q, placeholder }, i) => (
          <div key={q}>
            <p className="text-xs text-white/40 mb-2 leading-relaxed">
              <span className="text-violet-400/50 font-bold mr-1.5">
                {String(i + 1).padStart(2, "0")}.
              </span>
              {q}
            </p>
            <textarea
              value={allAnswers[period][q] ?? ""}
              onChange={(e) => setAnswer(q, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-transparent text-sm text-white/60 placeholder:text-white/15 focus:outline-none resize-none rounded-xl px-3.5 py-3 transition-colors leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid rgba(139,92,246,0.28)";
                e.currentTarget.style.background = "rgba(139,92,246,0.04)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
