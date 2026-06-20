"use client";

/**
 * components/DemoModeBadge.tsx — Sovereign OS v7.2
 *
 * Fixed badge shown throughout the app when demo mode is active.
 * Visible in screen recordings, Looms, and live walkthroughs.
 * Includes an "Exit Demo" button that restores real data and reloads.
 *
 * Mounted in app/layout.tsx (always present, renders nothing when demo is off).
 */

import { useState, useEffect } from "react";
import { isDemoMode, exitDemoMode } from "@/lib/demo/demoMode";

export default function DemoModeBadge() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoMode());
  }, []);

  if (!active) return null;

  function handleExit() {
    exitDemoMode();
    window.location.reload();
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2.5 px-3 py-2 rounded-xl md:bottom-6"
      style={{
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Pulse dot */}
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
        style={{ background: "rgba(239,68,68,0.85)" }}
      />

      <span
        className="text-[9px] font-bold uppercase tracking-[0.2em] shrink-0"
        style={{ color: "rgba(252,165,165,0.9)" }}
      >
        Demo Mode
      </span>

      <div className="w-px h-3 shrink-0" style={{ background: "rgba(239,68,68,0.25)" }} />

      <button
        onClick={handleExit}
        className="text-[9px] font-semibold transition-opacity hover:opacity-100"
        style={{ color: "rgba(252,165,165,0.6)" }}
      >
        Exit
      </button>
    </div>
  );
}
