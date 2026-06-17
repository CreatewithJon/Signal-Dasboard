"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./Card";
import { getRelevantMemoryContext, getPlannerContext, getVisionContext, getHabitContext, buildCombinedContext } from "@/lib/memory/context";
import type { PlannerData, VisionData, HabitEntry } from "@/lib/memory/context";
import type { MemoryItem, MemoryType, MemoryImportance } from "@/lib/types/memory";
import type { Project } from "@/lib/types/projects";
import { KEYS } from "@/lib/keys";

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

// ── Memory save helpers ────────────────────────────────────────────────────

const MEMORY_TYPES: MemoryType[] = [
  "Note", "Idea", "Decision", "Resource", "Content",
  "Person", "Project Context", "Meeting", "Client",
];

const MEMORY_IMPORTANCES: MemoryImportance[] = ["Low", "Medium", "High", "Critical"];

function autoTitle(text: string): string {
  const sentence = text.split(/[.!?\n]/)[0].trim();
  if (!sentence) return text.slice(0, 60);
  if (sentence.length <= 70) return sentence;
  const words = sentence.split(/\s+/).slice(0, 9);
  return words.join(" ") + "…";
}

function inferTags(prompt: string): string[] {
  const tags: string[] = ["ai-response"];
  if (/bitcoin|btc|sats|satoshi|lightning/i.test(prompt)) tags.push("bitcoin");
  if (/focus|deep.work|productivity|pomodoro|habit|routine|morning/i.test(prompt)) tags.push("focus");
  if (/wealth|money|invest|compound|asset|income|finance|revenue/i.test(prompt)) tags.push("wealth");
  if (/strategy|plan|framework|system|principle|approach/i.test(prompt)) tags.push("strategy");
  if (/\bai\b|automation|tool|software/i.test(prompt)) tags.push("ai");
  return tags;
}

// ── Save modal state shape ────────────────────────────────────────────────

interface SaveModal {
  messageIndex: number;
  title: string;
  type: MemoryType;
  importance: MemoryImportance;
  tags: string[];
  tagInput: string;
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  // null = idle, "" or string = actively streaming
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // How many memory items were injected for the most recent request
  const [activeMemoryCount, setActiveMemoryCount] = useState(0);
  // Whether planner context was included for the most recent request
  const [plannerIncluded, setPlannerIncluded] = useState(false);
  // Whether long-term vision context was included for the most recent request
  const [visionIncluded, setVisionIncluded] = useState(false);
  // Whether habit context was included for the most recent request
  const [habitsIncluded, setHabitsIncluded] = useState(false);
  // Save states per message index: "saved" | "duplicate" | undefined (idle)
  const [savedStates, setSavedStates] = useState<Record<number, "saved" | "duplicate">>({});
  // Active save modal
  const [saveModal, setSaveModal] = useState<SaveModal | null>(null);

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
    setActiveMemoryCount(0);
    setPlannerIncluded(false);
    setVisionIncluded(false);
    setHabitsIncluded(false);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage = text.trim();
    setInput("");
    setError(null);
    setActiveMemoryCount(0);
    setPlannerIncluded(false);
    setVisionIncluded(false);
    setHabitsIncluded(false);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setStreamingContent(""); // start streaming state

    // ── Build combined context (memory + planner) ─────────────────────────
    let memoryContext: string | undefined;
    let contextSources: string[] = [];
    let memoryCount = 0;
    let plannerUsed = false;
    let visionUsed = false;
    let habitsUsed = false;

    try {
      // Memory items
      const rawMemory = localStorage.getItem(KEYS.MEMORY_ITEMS);
      const rawProjects = localStorage.getItem(KEYS.PROJECTS);
      const memoryItems: MemoryItem[] = rawMemory ? (JSON.parse(rawMemory) as MemoryItem[]) : [];
      const projects: Project[] = rawProjects ? (JSON.parse(rawProjects) as Project[]) : [];

      const memResult =
        memoryItems.length > 0
          ? getRelevantMemoryContext(userMessage, memoryItems, projects)
          : { items: [], contextBlock: "" };
      memoryCount = memResult.items.length;

      // Planner data — parse each key's format safely
      const plannerData: PlannerData = {};

      try {
        const rawDaily = localStorage.getItem(KEYS.PLANNER_DAILY);
        if (rawDaily) {
          const parsed = JSON.parse(rawDaily) as { date?: string; items?: Array<{ text: string; done: boolean }> };
          if (Array.isArray(parsed.items)) {
            plannerData.daily = parsed.items.map(
              (it) => `${it.done ? "[x]" : "[ ]"} ${it.text}`
            );
          }
        }
      } catch { /* ignore */ }

      try {
        const rawWeekly = localStorage.getItem(KEYS.PLANNER_WEEKLY);
        if (rawWeekly) {
          const parsed = JSON.parse(rawWeekly) as { week?: string; items?: Array<{ text: string; done: boolean }> };
          if (Array.isArray(parsed.items)) {
            plannerData.weekly = parsed.items.map(
              (it) => `${it.done ? "[x]" : "[ ]"} ${it.text}`
            );
          }
        }
      } catch { /* ignore */ }

      try {
        const rawMonthly = localStorage.getItem(KEYS.PLANNER_MONTHLY);
        if (rawMonthly) {
          const parsed = JSON.parse(rawMonthly) as { month?: string; items?: string[] };
          if (Array.isArray(parsed.items)) {
            plannerData.monthly = parsed.items;
          }
        }
      } catch { /* ignore */ }

      const plannerBlock = getPlannerContext(userMessage, plannerData);
      plannerUsed = plannerBlock.length > 0;

      // Long-term vision data — stored as raw string[] (no date wrapper)
      const visionData: VisionData = {};

      try {
        const raw1yr = localStorage.getItem(KEYS.PLANNER_1YR);
        if (raw1yr) {
          const parsed = JSON.parse(raw1yr) as unknown;
          if (Array.isArray(parsed)) visionData.yr1 = parsed as string[];
        }
      } catch { /* ignore */ }

      try {
        const raw3yr = localStorage.getItem(KEYS.PLANNER_3YR);
        if (raw3yr) {
          const parsed = JSON.parse(raw3yr) as unknown;
          if (Array.isArray(parsed)) visionData.yr3 = parsed as string[];
        }
      } catch { /* ignore */ }

      try {
        const raw5yr = localStorage.getItem(KEYS.PLANNER_5YR);
        if (raw5yr) {
          const parsed = JSON.parse(raw5yr) as unknown;
          if (Array.isArray(parsed)) visionData.yr5 = parsed as string[];
        }
      } catch { /* ignore */ }

      const visionBlock = getVisionContext(userMessage, visionData);

      // Habit data — sovereign_habits: HabitEntry[], sovereign_habit_log: Record<string, string[]>
      let habitBlock = "";
      try {
        const rawHabits  = localStorage.getItem(KEYS.HABITS);
        const rawHabitLog = localStorage.getItem(KEYS.HABIT_LOG);
        const habits: HabitEntry[] = rawHabits   ? (JSON.parse(rawHabits)   as HabitEntry[])              : [];
        const habitLog: Record<string, string[]>  = rawHabitLog ? (JSON.parse(rawHabitLog) as Record<string, string[]>) : {};
        habitBlock = getHabitContext(userMessage, habits, habitLog);
      } catch { /* ignore */ }

      // Apply budget caps and combine — memory > planner > vision > habits
      const { combined, sources } = buildCombinedContext({
        memoryBlock:  memResult.contextBlock,
        plannerBlock,
        visionBlock,
        habitBlock,
      });

      if (combined) memoryContext = combined;
      plannerUsed = sources.includes("Planner");
      visionUsed  = sources.includes("Vision");
      habitsUsed  = sources.includes("Habits");
      // memoryCount already set above; reconcile with budget result
      if (!sources.includes("Memory")) memoryCount = 0;

      contextSources = sources;
    } catch {
      // Outer safety net — proceed without any context
    }

    setActiveMemoryCount(memoryCount);
    setPlannerIncluded(plannerUsed);
    setVisionIncluded(visionUsed);
    setHabitsIncluded(habitsUsed);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, memoryContext, contextSources }),
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

  function openSaveModal(messageIndex: number) {
    const msg = messages[messageIndex];
    if (!msg || msg.role !== "assistant" || msg.error || !msg.content) return;
    const precedingUser = messages[messageIndex - 1];
    const prompt = precedingUser?.role === "user" ? precedingUser.content : "";
    setSaveModal({
      messageIndex,
      title: autoTitle(msg.content),
      type: "Note",
      importance: "Medium",
      tags: inferTags(prompt),
      tagInput: "",
    });
  }

  function commitSave() {
    if (!saveModal) return;
    const msg = messages[saveModal.messageIndex];
    if (!msg?.content) { setSaveModal(null); return; }

    try {
      const raw = localStorage.getItem(KEYS.MEMORY_ITEMS);
      const existing: MemoryItem[] = raw ? (JSON.parse(raw) as MemoryItem[]) : [];

      // Duplicate check — exact content match
      const isDuplicate = existing.some(
        (item) => item.content.trim() === msg.content.trim()
      );
      if (isDuplicate) {
        setSavedStates((prev) => ({ ...prev, [saveModal.messageIndex]: "duplicate" }));
        setSaveModal(null);
        return;
      }

      const now = new Date().toISOString();
      const newItem: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: saveModal.title.trim() || autoTitle(msg.content),
        content: msg.content,
        type: saveModal.type,
        importance: saveModal.importance,
        tags: saveModal.tags,
        relatedProjectIds: [],
        relatedPeople: [],
        source: "AI",
        createdAt: now,
        updatedAt: now,
      };

      localStorage.setItem(KEYS.MEMORY_ITEMS, JSON.stringify([newItem, ...existing]));
      setSavedStates((prev) => ({ ...prev, [saveModal.messageIndex]: "saved" }));
    } catch {
      // localStorage write failed — silently dismiss
    }
    setSaveModal(null);
  }

  function clearChat() {
    stopStream();
    setMessages([]);
    setError(null);
    try { localStorage.removeItem(MESSAGES_KEY); } catch {}
  }

  return (
    <Card
      className="flex flex-col relative overflow-hidden"
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
          {(activeMemoryCount > 0 || plannerIncluded || visionIncluded || habitsIncluded) && (
            <p
              className="text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap"
              style={{ color: "rgba(139,92,246,0.6)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "rgba(139,92,246,0.7)" }}
              />
              {(() => {
                const parts: string[] = [];
                if (activeMemoryCount > 0) parts.push(`${activeMemoryCount} ${activeMemoryCount === 1 ? "memory" : "memories"}`);
                if (plannerIncluded) parts.push("planner");
                if (visionIncluded)  parts.push("vision");
                if (habitsIncluded)  parts.push("habits");
                return parts.map((p, i) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {i > 0 && <span style={{ color: "rgba(139,92,246,0.3)" }}>·</span>}
                    {p}
                  </span>
                ));
              })()}
              <span style={{ color: "rgba(139,92,246,0.4)" }}>in context</span>
            </p>
          )}
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
              {/* Save to Memory button — completed assistant messages only */}
              {msg.role === "assistant" && !msg.error && !isStreaming && (
                <div className="flex items-center gap-2">
                  {savedStates[i] === "saved" ? (
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: "rgba(139,92,246,0.65)" }}
                    >
                      <span>✓</span> Saved to memory
                    </span>
                  ) : savedStates[i] === "duplicate" ? (
                    <span
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Already saved
                    </span>
                  ) : (
                    <button
                      onClick={() => openSaveModal(i)}
                      className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
                      style={{
                        background: "rgba(139,92,246,0.07)",
                        border: "1px solid rgba(139,92,246,0.15)",
                        color: "rgba(139,92,246,0.5)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(139,92,246,0.13)";
                        e.currentTarget.style.color = "rgba(139,92,246,0.85)";
                        e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                        e.currentTarget.style.color = "rgba(139,92,246,0.5)";
                        e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)";
                      }}
                    >
                      🧠 Save to memory
                    </button>
                  )}
                </div>
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

      {/* ── Save to Memory modal ── */}
      {saveModal && (
        <div
          className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSaveModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "rgba(15,12,28,0.98)",
              border: "1px solid rgba(139,92,246,0.2)",
              boxShadow: "0 0 60px rgba(139,92,246,0.12)",
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "rgba(139,92,246,0.7)" }}
              >
                Save to Memory
              </span>
              <button
                onClick={() => setSaveModal(null)}
                className="text-[11px] leading-none"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Title
              </label>
              <input
                value={saveModal.title}
                onChange={(e) => setSaveModal((m) => m ? { ...m, title: e.target.value } : m)}
                className="w-full bg-transparent text-sm rounded-lg px-3 py-2 focus:outline-none"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.8)",
                  background: "rgba(255,255,255,0.04)",
                }}
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MEMORY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSaveModal((m) => m ? { ...m, type: t } : m)}
                    className="text-[10px] px-2.5 py-1 rounded-md transition-all"
                    style={{
                      background: saveModal.type === t ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                      border: saveModal.type === t ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      color: saveModal.type === t ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Importance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Importance
              </label>
              <div className="flex gap-1.5">
                {MEMORY_IMPORTANCES.map((imp) => {
                  const colors: Record<string, string> = {
                    Low: "rgba(255,255,255,0.4)", Medium: "rgba(99,102,241,0.8)",
                    High: "rgba(251,191,36,0.85)", Critical: "rgba(248,113,113,0.85)",
                  };
                  const active = saveModal.importance === imp;
                  return (
                    <button
                      key={imp}
                      onClick={() => setSaveModal((m) => m ? { ...m, importance: imp } : m)}
                      className="flex-1 text-[10px] py-1.5 rounded-md transition-all font-medium"
                      style={{
                        background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                        border: active ? `1px solid ${colors[imp]}44` : "1px solid rgba(255,255,255,0.06)",
                        color: active ? colors[imp] : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {imp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1">
                {saveModal.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "rgba(165,180,252,0.8)" }}
                  >
                    #{tag}
                    <button
                      onClick={() => setSaveModal((m) => m ? { ...m, tags: m.tags.filter((t) => t !== tag) } : m)}
                      className="leading-none opacity-50 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={saveModal.tagInput}
                onChange={(e) => setSaveModal((m) => m ? { ...m, tagInput: e.target.value } : m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = saveModal.tagInput.trim().replace(/^#/, "").replace(/,/g, "");
                    if (val && !saveModal.tags.includes(val)) {
                      setSaveModal((m) => m ? { ...m, tags: [...m.tags, val], tagInput: "" } : m);
                    } else {
                      setSaveModal((m) => m ? { ...m, tagInput: "" } : m);
                    }
                  }
                }}
                placeholder="Add tag, press Enter"
                className="w-full bg-transparent text-xs rounded-lg px-3 py-2 focus:outline-none"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.03)",
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSaveModal(null)}
                className="flex-1 text-xs py-2.5 rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={commitSave}
                className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-all"
                style={{
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  color: "rgba(167,139,250,0.95)",
                  boxShadow: "0 0 16px rgba(139,92,246,0.15)",
                }}
              >
                Save to Memory
              </button>
            </div>
          </div>
        </div>
      )}

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
