"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";

function getDueDateState(dateStr: string, isComplete: boolean): "overdue" | null {
  if (!dateStr || isComplete) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime() ? "overdue" : null;
}

export default function OverdueDigest() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      let overdueCount = 0;

      const rawP = localStorage.getItem(KEYS.PROJECTS);
      if (rawP) {
        const projects = JSON.parse(rawP) as Array<{ due_date?: string; status?: string }>;
        if (Array.isArray(projects)) {
          overdueCount += projects.filter((p) => {
            const isComplete = p.status === "Shipped" || p.status === "Archived";
            return getDueDateState(p.due_date ?? "", isComplete) === "overdue";
          }).length;
        }
      }

      const rawT = localStorage.getItem(KEYS.PROJECT_TASKS);
      if (rawT) {
        const tasks = JSON.parse(rawT) as Array<{ due_date?: string; status?: string }>;
        if (Array.isArray(tasks)) {
          overdueCount += tasks.filter((t) =>
            getDueDateState(t.due_date ?? "", t.status === "Done") === "overdue"
          ).length;
        }
      }

      setCount(overdueCount);
    } catch {}
    setMounted(true);
  }, []);

  if (!mounted || count === 0) return null;

  return (
    <Link
      href="/projects"
      className="flex items-center gap-1.5 text-[9px] font-bold transition-opacity hover:opacity-80 shrink-0"
      style={{ color: "rgba(239,68,68,0.8)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
        style={{ background: "#ef4444", boxShadow: "0 0 4px rgba(239,68,68,0.6)" }}
      />
      {count} overdue
    </Link>
  );
}
