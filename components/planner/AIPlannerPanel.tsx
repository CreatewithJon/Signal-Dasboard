"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/Card";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const STARTERS = [
  "Plan my day",
  "Build my week",
  "What should I focus on today?",
  "Am I on track for my goals?",
  "Break down my 1-year goal into actions",
  "Review my progress",
];

export default function AIPlannerPanel() {
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

    try {
      const res = await fetch("/api/planner-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong.", error: true },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Check your network and try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className="flex flex-col h-full"
      glow="0 0 100px rgba(139,92,246,0.1)"
      style={{ minHeight: 520 }}
    >
      {/* Header */}
      <div
        className="px-5 md:px-7 py-4 md:py-5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-0.5">
            AI Planning Assistant
          </p>
          <p className="text-xs text-white/30">Goals · Execution · Momentum</p>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.22)",
            boxShadow: "0 0 16px rgba(139,92,246,0.15)",
          }}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 text-violet-400">
            <circle cx="7" cy="7" r="5.5" />
            <circle cx="7" cy="7" r="2" />
            <line x1="7" y1="1.5" x2="7" y2="3" strokeLinecap="round" />
            <line x1="7" y1="11" x2="7" y2="12.5" strokeLinecap="round" />
            <line x1="1.5" y1="7" x2="3" y2="7" strokeLinecap="round" />
            <line x1="11" y1="7" x2="12.5" y2="7" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/20 leading-relaxed">
              Your personal planning assistant. Ask me to plan your day, build your week, break down goals, or keep you on track.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-white/40 hover:text-white/70 px-3.5 py-2 rounded-full transition-all"
                  style={{
                    background: "rgba(139,92,246,0.07)",
                    border: "1px solid rgba(139,92,246,0.18)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                    e.currentTarget.style.border = "1px solid rgba(139,92,246,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                    e.currentTarget.style.border = "1px solid rgba(139,92,246,0.18)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  background: msg.error ? "rgba(248,113,113,0.15)" : "rgba(139,92,246,0.15)",
                  border: msg.error
                    ? "1px solid rgba(248,113,113,0.25)"
                    : "1px solid rgba(139,92,246,0.25)",
                }}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-3 h-3 ${msg.error ? "text-red-400" : "text-violet-400"}`}>
                  <circle cx="6" cy="6" r="4.5" />
                  <circle cx="6" cy="6" r="1.5" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={
                msg.role === "user"
                  ? {
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.85)",
                    }
                  : msg.error
                  ? {
                      background: "rgba(248,113,113,0.06)",
                      border: "1px solid rgba(248,113,113,0.12)",
                      color: "rgba(255,255,255,0.45)",
                    }
                  : {
                      background: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.14)",
                      color: "rgba(255,255,255,0.7)",
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
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-violet-400">
                <circle cx="6" cy="6" r="4.5" />
                <circle cx="6" cy="6" r="1.5" />
              </svg>
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.14)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "rgba(167,139,250,0.6)",
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-5 md:px-7 py-4 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your planner anything..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              boxShadow: input.trim() ? "0 0 12px rgba(139,92,246,0.4)" : "none",
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
