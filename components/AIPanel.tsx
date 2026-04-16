"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "./Card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const starters = [
  "What's the Bitcoin market reading right now?",
  "Give me a focus insight for this week",
  "One principle for compounding wealth",
];

const mockResponses = [
  "Bitcoin is holding strong accumulation structure at current levels. The 30-day trend shows a healthy pullback from the $72K high — typical pre-breakout behavior. Institutional flows remain positive. Key support at $65K, next resistance at $71.5K. Patience is the edge here.",
  "Your focus metrics are trending well: 4h 20m today, 15% above your weekly baseline. Your sharpest window appears to be 9–11am — protect it aggressively. One optimization: eliminate all incoming communication before noon and batch it post-lunch.",
  "Asymmetric positioning. Take small, high-conviction bets where downside is fixed but upside is open-ended. Bitcoin was that bet for the last decade. The discipline isn't finding the idea — it's sizing correctly and holding through noise.",
  "Sovereignty compounds. Every tool you own instead of rent, every skill you build instead of outsource, every asset you self-custody — they reduce your dependency surface and increase your leverage over time. Stack them intentionally.",
];

let responseIndex = 0;

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const reply = mockResponses[responseIndex % mockResponses.length];
    responseIndex++;
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  return (
    <Card
      className="flex flex-col"
      id="ai"
      glow="0 0 80px rgba(99, 102, 241, 0.06)"
      style={{ minHeight: 400 }}
    >
      {/* Header */}
      <div
        className="px-7 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-0.5">
            AI Assistant
          </p>
          <p className="text-sm text-white/40">Ask about Bitcoin, focus, or wealth.</p>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 0 16px rgba(99,102,241,0.15)",
          }}
        >
          <svg viewBox="0 0 14 14" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
            <path d="M7 1l1.3 3.9L12.5 7l-4.2 1.3L7 12.5l-1.3-4.2L1.5 7l4.2-1.3L7 1z" />
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs text-white/35 hover:text-white/70 px-3.5 py-2 rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  boxShadow: "0 0 8px rgba(99,102,241,0.2)",
                }}
              >
                <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-indigo-400">
                  <path d="M6 1l1.2 3.5L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2L6 1z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={
                msg.role === "user"
                  ? {
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.85)",
                    }
                  : {
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.12)",
                      color: "rgba(255,255,255,0.65)",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div
              className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-indigo-400">
                <path d="M6 1l1.2 3.5L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2L6 1z" />
              </svg>
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.12)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-7 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: input.trim() ? "0 0 12px rgba(99,102,241,0.4)" : "none",
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M7 11.5V2.5M3 6.5l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </Card>
  );
}
