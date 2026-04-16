"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "./Card";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const starters = [
  "What makes Bitcoin a sovereign money asset?",
  "Give me a focus protocol for deep work mornings",
  "One principle for asymmetric wealth building",
];

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

    try {
      const res = await fetch("/api/chat", {
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Check your network and try again.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className="flex flex-col"
      id="ai"
      glow="0 0 100px rgba(99, 102, 241, 0.08)"
      style={{ minHeight: 460 }}
    >
      {/* Header */}
      <div
        className="px-5 md:px-8 py-4 md:py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-0.5">
            AI Assistant
          </p>
          <p className="text-sm text-white/40">Bitcoin · Focus · Wealth strategy</p>
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
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-[11px] text-white/20 leading-relaxed">
              Intelligence, on demand. Ask anything about Bitcoin, focus, or wealth strategy.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-white/40 hover:text-white/75 px-4 py-2.5 rounded-full transition-all"
                  style={{
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.13)";
                    e.currentTarget.style.border = "1px solid rgba(99,102,241,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.07)";
                    e.currentTarget.style.border = "1px solid rgba(99,102,241,0.18)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  background: msg.error ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)",
                  border: msg.error ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(99,102,241,0.25)",
                  boxShadow: msg.error ? "0 0 8px rgba(248,113,113,0.2)" : "0 0 8px rgba(99,102,241,0.2)",
                }}
              >
                <svg viewBox="0 0 12 12" fill="currentColor" className={`w-3 h-3 ${msg.error ? "text-red-400" : "text-indigo-400"}`}>
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
                  : msg.error
                  ? {
                      background: "rgba(248,113,113,0.06)",
                      border: "1px solid rgba(248,113,113,0.12)",
                      color: "rgba(255,255,255,0.45)",
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
        className="px-5 md:px-8 py-4 md:py-5"
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
