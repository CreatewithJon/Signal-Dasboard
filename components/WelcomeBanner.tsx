"use client";

/**
 * components/WelcomeBanner.tsx — Sovereign OS v7.1
 *
 * Subtle one-liner shown on the homepage when sovereign_welcome_seen is not set.
 * Dismissible (sets the key). Does not force redirect.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";

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

export default function WelcomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = safeRead<boolean>(KEYS.WELCOME_SEEN, false);
    setVisible(!seen);
  }, []);

  function dismiss() {
    safeWrite(KEYS.WELCOME_SEEN, true);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-6"
      style={{
        background: "rgba(99,102,241,0.07)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      {/* Pulse dot */}
      <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: "rgba(139,92,246,0.8)" }} />

      <p className="flex-1 text-[11px] text-white/50 leading-none">
        New here?{" "}
        <Link
          href="/welcome"
          className="font-semibold transition-colors"
          style={{ color: "rgba(165,180,252,0.8)" }}
        >
          Start with the Welcome Guide
        </Link>
        {" "}— set up your first project, memory, and daily rhythm in 15 minutes.
      </p>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss welcome banner"
        className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-all hover:bg-white/[0.06]"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
          <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
