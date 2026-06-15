"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./Card";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  retryText?: string; // original user text that caused this error, for retry
}

const MESSAGES_KEY = "sovereign_ai_messages";
const MAX_STORED = 40;

const STARTERS = [
  "What makes Bitcoin a sovereign money asset?",
  "Give me a focus protocol for deep work mornings",
  "One principle for asymmetric wealth building",
];

function AvatarDot({ error, pulse }: { error?: boolean; pulse?: boolean }) {
  return (
    <div
      className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
      style={{
        background: error ? "rgba(248,113,113,0.15)" : "rgba(99,102,241,0.15)",
        border: error ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(99,102,241,0.25)",
        boxShadow: error ? "0 0 8px rgba(248,113,113,0.2)" : "0 0 8px rgba(99,102,241,0.2)",
      }}
    >
      <svg
        viewBox="0 0 12 12"
        fill="currentColor"
        className={`w-3 h-3 ${error ? "text-red-400" : "text-indigo-400"} ${pulse ? "animate-pulse" : ""}`}
      >
        <path d="M6 1l1.2 3.5L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2L6 1z" />
      </svg>
    </div>
  );
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  // null = idle, "" or string = actively streaming
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  // AbortController so we can cancel an in-flight stream
  const abortRef = useRef<AbortController | null>(null);

  const isStreaming = streamingContent !== null;

  // Load persisted messages on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Message[];
        if (Array.isArray(saved) && saved.length > 0) setMessages(saved);
      }
    } catch {}
    setMounted(true);
  }, []);

  // Persist messages whenever they change (after mount)
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {}
  }, [messages, mounted]);

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const stopStream = useCallback(() => {
    // Cancel the in-flight request — no partial content is saved.
    // The AbortError thrown in send() is caught and returns early.
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingContent(null);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage = text.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setStreamingContent(""); // start streaming state

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      });

      // Non-streaming error response (e.g. 503, 400)
      if (!res.ok || !res.body) {
        let errMsg = "Something went wrong. Try again.";
        try {
          const data = await res.json() as { error?: string };
          if (data.error) errMsg = data.error;
        } catch {}
        setStreamingContent(null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errMsg, error: true, retryText: userMessage },
        ]);
        return;
      }

      // ── Read the text stream ──────────────────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      // Stream complete — commit to message history
      setStreamingContent(null);
      if (accumulated.length > 0) {
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — already handled by stopStream()
        return;
      }
      console.error("Chat stream error:", err);
      setStreamingContent(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Check your network and try again.", error: true, retryText: userMessage },
      ]);
    } finally {
      abortRef.current = null;
    }
  }, [isStreaming]);

  function clearChat() {
    stopStream();
    setMessages([]);
    setError(null);
    try { localStorage.removeItem(MESSAGES_KEY); } catch {}
  }

  return (
    <Card
      className="flex flex-col"
      id="ai"
      glow="0 0 100px rgba(99, 102, 241, 0.08)"
      style={{ minHeight: 460 }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 md:px-8 py-4 md:py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/50 mb-0.5">
            AI Assistant
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {isStreaming ? (
              <span className="text-indigo-400/60 animate-pulse">Thinking…</span>
            ) : (
              "Bitcoin · Focus · Wealth strategy"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stop button while streaming */}
          {isStreaming && (
            <button
              onClick={stopStream}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.18)",
                color: "rgba(248,113,113,0.75)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-sm" style={{ background: "rgba(248,113,113,0.8)" }} />
              Stop
            </button>
          )}
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearChat}
              className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              Clear
            </button>
          )}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: isStreaming ? "0 0 20px rgba(99,102,241,0.3)" : "0 0 16px rgba(99,102,241,0.15)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <svg
              viewBox="0 0 14 14"
              fill="currentColor"
              className={`w-3.5 h-3.5 text-indigo-400 ${isStreaming ? "animate-pulse" : ""}`}
            >
              <path d="M7 1l1.3 3.9L12.5 7l-4.2 1.3L7 12.5l-1.3-4.2L1.5 7l4.2-1.3L7 1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 space-y-4">

        {/* Empty state + starters */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
              Intelligence, on demand. Ask anything about Bitcoin, focus, or wealth strategy.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-4 py-2.5 rounded-full transition-all"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.13)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.07)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation history */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <AvatarDot error={msg.error} />}
            <div className={`max-w-[78%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }
                    : msg.error
                    ? { background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)", color: "rgba(255,255,255,0.45)" }
                    : { background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.12)", color: "rgba(255,255,255,0.65)" }
                }
              >
                {msg.content}
              </div>
              {/* Retry button on error messages */}
              {msg.error && msg.retryText && (
                <button
                  onClick={() => {
                    // Remove this error message, re-send the original text
                    setMessages((prev) => prev.filter((_, idx) => idx !== i));
                    send(msg.retryText!);
                  }}
                  disabled={isStreaming}
                  className="text-[10px] font-semibold px-3 py-1 rounded-lg transition-all disabled:opacity-30"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.15)",
                    color: "rgba(248,113,113,0.65)",
                  }}
                >
                  ↺ Retry
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message — shows as it arrives */}
        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <AvatarDot pulse />
            <div
              className="max-w-[78%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.12)",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {streamingContent === "" ? (
                /* Typing dots — shown while waiting for first token */
                <span className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              ) : (
                /* Token-by-token text with blinking cursor */
                <span>
                  {streamingContent}
                  <span
                    className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-indigo-400/70 animate-pulse"
                    style={{ verticalAlign: "text-bottom" }}
                  />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error banner (non-message errors) */}
        {error && (
          <p className="text-xs text-center" style={{ color: "rgba(248,113,113,0.6)" }}>
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
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
            placeholder={isStreaming ? "Waiting for response…" : "Ask anything..."}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed"
            style={{ color: isStreaming ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: input.trim() && !isStreaming ? "0 0 12px rgba(99,102,241,0.4)" : "none",
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
