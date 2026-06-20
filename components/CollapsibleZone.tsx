"use client";

/**
 * components/CollapsibleZone.tsx
 *
 * Collapsible dashboard zone — Sovereign OS v6.3
 * Renders a labelled section header with accent line and chevron toggle.
 * Persists open/closed state in sessionStorage so it survives navigation
 * within the session but resets on page reload.
 */

import { useState, useEffect } from "react";

interface CollapsibleZoneProps {
  id:          string;
  label:       string;
  accent:      string;     // CSS color string
  defaultOpen?: boolean;
  extra?:      React.ReactNode;  // right-side extras in the header
  children:    React.ReactNode;
}

export default function CollapsibleZone({
  id,
  label,
  accent,
  defaultOpen = true,
  extra,
  children,
}: CollapsibleZoneProps) {
  const storageKey = `sovereign_zone_${id}`;

  // Start with defaultOpen to match SSR; read sessionStorage after mount
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== null) setOpen(stored === "1");
  }, [storageKey]);

  // Keep sessionStorage in sync whenever open changes
  useEffect(() => {
    sessionStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  return (
    <div className="mb-8">
      {/* Zone header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 pt-8 pb-4 group"
        aria-expanded={open}
      >
        <span
          className="text-[9px] font-bold uppercase tracking-[0.28em] shrink-0 transition-opacity"
          style={{ color: accent, opacity: open ? 1 : 0.55 }}
        >
          {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: `linear-gradient(to right, ${accent}44, transparent)` }}
        />
        {extra && <div className="shrink-0">{extra}</div>}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
          style={{
            color: accent,
            opacity: 0.55,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsible content */}
      {open && <div>{children}</div>}
    </div>
  );
}
