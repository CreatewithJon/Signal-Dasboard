"use client";

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";

interface Props {
  hasAIKey: boolean;
  marketDataLive: boolean;
}

type Status = "ok" | "warn" | "error";

interface StatusItem {
  label: string;
  value: string;
  status: Status;
}

const DOT_COLORS: Record<Status, string> = {
  ok:   "#10b981",
  warn: "#f59e0b",
  error: "#ef4444",
};

export default function SystemStatus({ hasAIKey, marketDataLive }: Props) {
  const [migrated, setMigrated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setMigrated(localStorage.getItem(KEYS.MIGRATION_V1) === "true");
    } catch {
      setMigrated(false);
    }
  }, []);

  const items: StatusItem[] = [
    {
      label: "AI",
      value: hasAIKey ? "Online" : "API key missing",
      status: hasAIKey ? "ok" : "error",
    },
    {
      label: "Storage",
      value: migrated === null ? "Checking…" : migrated ? "Migrated" : "Pending",
      status: migrated === null ? "warn" : migrated ? "ok" : "warn",
    },
    {
      label: "Market Data",
      value: marketDataLive ? "Live" : "Using fallback",
      status: marketDataLive ? "ok" : "warn",
    },
  ];

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-[0.22em] shrink-0"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >
        System
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: DOT_COLORS[item.status],
              boxShadow: item.status === "ok" ? `0 0 5px ${DOT_COLORS.ok}80` : "none",
            }}
          />
          <span
            className="text-[10px] font-semibold"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            {item.label}
          </span>
          <span
            className="text-[10px]"
            style={{
              color: item.status === "ok"
                ? "rgba(16,185,129,0.65)"
                : item.status === "warn"
                ? "rgba(245,158,11,0.65)"
                : "rgba(239,68,68,0.65)",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
