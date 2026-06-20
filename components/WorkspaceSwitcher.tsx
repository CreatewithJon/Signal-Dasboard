"use client";

/**
 * components/WorkspaceSwitcher.tsx — Sovereign OS v7.4
 *
 * Compact sidebar switcher for the active workspace.
 * - Reads workspaces from localStorage (KEYS.WORKSPACES).
 * - Ensures the Personal default workspace always exists.
 * - First option is always "All Workspaces" (id: "all") — shows everything.
 * - Switching updates KEYS.ACTIVE_WORKSPACE_ID.
 * - Data filtering via filterByWorkspace() is applied in each module.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";

// Virtual "All Workspaces" entry — not stored, always prepended
const ALL_WORKSPACES: Workspace = {
  id: "all",
  name: "All Workspaces",
  type: "Personal",
  description: "Show everything across all workspaces.",
  color: "#64748b",
  archived: false,
  created_at: "",
  updated_at: "",
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

export default function WorkspaceSwitcher() {
  const [workspaces,  setWorkspaces]  = useState<Workspace[]>([]);
  const [activeId,    setActiveId]    = useState<string>("personal");
  const [open,        setOpen]        = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load workspaces; seed Personal default if empty
    const stored = safeRead<Workspace[]>(KEYS.WORKSPACES, []);
    const hasPersonal = stored.some((w) => w.id === "personal");
    const all = hasPersonal ? stored : [DEFAULT_WORKSPACE, ...stored];
    if (!hasPersonal) safeWrite(KEYS.WORKSPACES, all);

    setWorkspaces(all);
    setActiveId(safeRead<string>(KEYS.ACTIVE_WORKSPACE_ID, "personal"));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = activeId === "all"
    ? ALL_WORKSPACES
    : (workspaces.find((w) => w.id === activeId) ?? DEFAULT_WORKSPACE);

  // Dropdown options: All Workspaces + every non-archived workspace except the active one
  const available = [
    ALL_WORKSPACES,
    ...workspaces.filter((w) => !w.archived),
  ].filter((w) => w.id !== activeId);

  const canSwitch = available.length > 0;

  function switchTo(ws: Workspace) {
    setActiveId(ws.id);
    safeWrite(KEYS.ACTIVE_WORKSPACE_ID, ws.id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        disabled={!canSwitch}
        className="w-full flex items-center gap-2 px-1 py-1 rounded-lg transition-all group"
        style={{ cursor: canSwitch ? "pointer" : "default" }}
        aria-label="Switch workspace"
        aria-expanded={open}
      >
        {/* Color dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: active.color, boxShadow: `0 0 6px ${active.color}80` }}
        />
        {/* Name */}
        <span
          className="flex-1 text-left text-[10px] font-semibold truncate transition-all"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {active.name}
        </span>
        {/* Chevron — only when switchable */}
        {canSwitch && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            className="w-3 h-3 shrink-0 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          >
            <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && canSwitch && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl py-1 overflow-hidden"
          style={{
            background: "rgba(10,10,20,0.97)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          }}
        >
          {available.map((ws) => (
            <button
              key={ws.id}
              onClick={() => switchTo(ws)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.04]"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: ws.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/65 truncate">{ws.name}</p>
                <p className="text-[9px] text-white/25 truncate">{ws.type}</p>
              </div>
            </button>
          ))}
          <div className="px-3 pt-1.5 pb-2 mt-1 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[8px] text-white/15 leading-relaxed">
              All Workspaces shows everything.
            </p>
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="text-[8px] font-semibold shrink-0 transition-colors"
              style={{ color: "rgba(99,102,241,0.5)" }}
            >
              Analytics →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
