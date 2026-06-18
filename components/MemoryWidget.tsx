"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { MemoryItem, MemoryType } from "@/lib/types/memory";
import { getMemoryItems } from "@/lib/repositories/memoryRepository";

const TYPE_DOT: Record<MemoryType, string> = {
  Note:              "bg-blue-400",
  Person:            "bg-violet-400",
  "Project Context": "bg-indigo-400",
  Meeting:           "bg-amber-400",
  Decision:          "bg-rose-400",
  Idea:              "bg-emerald-400",
  Resource:          "bg-cyan-400",
  Client:            "bg-orange-400",
  Content:           "bg-purple-400",
};

const IMPORTANCE_COLOR: Record<string, string> = {
  Critical: "text-rose-400",
  High:     "text-amber-400",
  Medium:   "text-white/40",
  Low:      "text-white/25",
};

export default function MemoryWidget() {
  const [items, setItems] = useState<MemoryItem[]>([]);

  useEffect(() => {
    (async () => {
      const result = await getMemoryItems();
      setItems(result.items);
    })();
  }, []);

  const totalCount = items.length;
  const highCount  = items.filter(
    (i) => i.importance === "High" || i.importance === "Critical"
  ).length;

  const recent = [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div
      className="w-full rounded-xl border p-5 flex flex-col gap-4"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <span style={{ fontSize: 12 }}>🧠</span>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "rgba(139,92,246,0.7)" }}
          >
            Memory
          </span>
        </div>
        <Link
          href="/memory"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
          style={{ color: "rgba(139,92,246,0.5)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(139,92,246,0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(139,92,246,0.5)")}
        >
          Open →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg px-3 py-2.5 flex flex-col gap-0.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span className="text-xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
            {totalCount}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            total memories
          </span>
        </div>
        <div
          className="rounded-lg px-3 py-2.5 flex flex-col gap-0.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span className="text-xl font-bold tracking-tight" style={{ color: highCount > 0 ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.85)" }}>
            {highCount}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            high priority
          </span>
        </div>
      </div>

      {/* Recent items */}
      {recent.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.2)" }}>
            Recent
          </span>
          {recent.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 py-1.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[item.type] ?? "bg-white/20"}`} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate leading-snug"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {item.type}
                  </span>
                  {(item.importance === "High" || item.importance === "Critical") && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${IMPORTANCE_COLOR[item.importance]}`}>
                      {item.importance}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="text-xl opacity-20">🧠</span>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            No memories yet.{" "}
            <Link href="/memory" className="underline underline-offset-2 hover:opacity-80">
              Capture your first one →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
