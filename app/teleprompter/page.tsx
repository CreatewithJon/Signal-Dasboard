"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function TeleprompterPage() {
  const [script, setScript] = useState("");
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(32);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("signal_teleprompter_script");
    if (saved) setScript(saved);
  }, []);

  useEffect(() => {
    if (scrolling) {
      intervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += speed;
          // Stop at bottom
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 10) {
            setScrolling(false);
          }
        }
      }, 30);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [scrolling, speed]);

  function reset() {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setScrolling(false);
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-lg">No script loaded.</p>
        <p className="text-white/20 text-sm">Go back to Content Engine, select a video, and click &quot;Open Teleprompter&quot;.</p>
        <Link href="/content" className="text-rose-400 text-sm underline mt-2">← Back to Content</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ fontFamily: "Georgia, serif" }}>

      {/* Controls bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 gap-4"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/content" className="text-white/30 hover:text-white/60 text-xs transition-colors">
          ← Back
        </Link>

        <div className="flex items-center gap-4">
          {/* Font size */}
          <div className="flex items-center gap-2">
            <span className="text-white/25 text-[10px] uppercase tracking-wider">Size</span>
            <button
              onClick={() => setFontSize((f) => Math.max(18, f - 4))}
              className="w-6 h-6 rounded text-white/40 hover:text-white/80 text-sm font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >−</button>
            <span className="text-white/40 text-xs w-6 text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(72, f + 4))}
              className="w-6 h-6 rounded text-white/40 hover:text-white/80 text-sm font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >+</button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <span className="text-white/25 text-[10px] uppercase tracking-wider">Speed</span>
            <button
              onClick={() => setSpeed((s) => Math.max(1, s - 1))}
              className="w-6 h-6 rounded text-white/40 hover:text-white/80 text-sm font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >−</button>
            <span className="text-white/40 text-xs w-4 text-center">{speed}</span>
            <button
              onClick={() => setSpeed((s) => Math.min(8, s + 1))}
              className="w-6 h-6 rounded text-white/40 hover:text-white/80 text-sm font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >+</button>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="text-white/30 hover:text-white/60 text-xs transition-colors px-3 py-1.5 rounded"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            Reset
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setScrolling((s) => !s)}
            className="px-5 py-1.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: scrolling ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, #dc2626, #ef4444)",
              border: scrolling ? "1px solid rgba(239,68,68,0.3)" : "none",
              color: scrolling ? "rgba(252,165,165,0.9)" : "white",
              boxShadow: scrolling ? "none" : "0 0 20px rgba(239,68,68,0.35)",
            }}
          >
            {scrolling ? "⏸ Pause" : "▶ Play"}
          </button>
        </div>
      </div>

      {/* Script content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pt-20 pb-32 px-8 md:px-0"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Red guide line */}
        <div
          className="fixed left-0 right-0 pointer-events-none z-40"
          style={{
            top: "50%",
            height: "2px",
            background: "rgba(239,68,68,0.2)",
          }}
        />

        <div className="max-w-3xl mx-auto">
          <p
            className="text-white leading-relaxed whitespace-pre-wrap"
            style={{
              fontSize: fontSize,
              lineHeight: 1.7,
              textShadow: "0 0 40px rgba(255,255,255,0.1)",
            }}
          >
            {script}
          </p>
          <div className="h-[50vh]" />
        </div>
      </div>
    </div>
  );
}
