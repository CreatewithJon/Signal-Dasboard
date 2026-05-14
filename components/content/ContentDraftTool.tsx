"use client";

import { useState } from "react";
import { Card } from "@/components/Card";

type Platform = "linkedin" | "x" | "youtube";

interface ContentType {
  id: string;
  label: string;
  description: string;
}

const CONTENT_TYPES: Record<Platform, ContentType[]> = {
  linkedin: [
    { id: "post", label: "Post", description: "150–250 word post with hook, value, and CTA" },
    { id: "about", label: "About Section", description: "Full profile bio — story-driven, ends with DM CTA" },
  ],
  x: [
    { id: "thread", label: "Thread", description: "8–12 tweet thread on any topic" },
    { id: "post", label: "Single Post", description: "One sharp tweet under 280 characters" },
    { id: "bio", label: "Bio", description: "160-character profile bio" },
  ],
  youtube: [
    { id: "script", label: "Video Script", description: "Full 8–12 min script with hook, content, CTA" },
    { id: "titles", label: "Title & Thumbnail Ideas", description: "10 title options + 5 thumbnail text ideas" },
    { id: "description", label: "Video Description", description: "SEO-optimized description with timestamps" },
  ],
};

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string; border: string; glow: string }> = {
  linkedin: {
    label: "LinkedIn",
    color: "rgba(147,197,253,0.95)",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    glow: "rgba(59,130,246,0.08)",
  },
  x: {
    label: "X / Twitter",
    color: "rgba(255,255,255,0.85)",
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.14)",
    glow: "rgba(255,255,255,0.04)",
  },
  youtube: {
    label: "YouTube",
    color: "rgba(252,165,165,0.95)",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.08)",
  },
};

const STARTER_TOPICS = [
  "How I built an AI lead system for a local business (full walkthrough)",
  "What Bitcoin actually is — explained without the hype",
  "The AI tools I use every day to run my business",
  "From East LA to building AI systems — my origin story",
  "5 AI automations every small business should have",
  "What I learned about money working in banking",
  "Building in public: what I shipped this week",
  "Why most businesses don't need more traffic — they need a better system",
];

export default function ContentDraftTool() {
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [contentType, setContentType] = useState<string>("post");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const cfg = PLATFORM_CONFIG[platform];
  const types = CONTENT_TYPES[platform];

  function selectPlatform(p: Platform) {
    setPlatform(p);
    setContentType(CONTENT_TYPES[p][0].id);
    setDraft("");
    setError("");
  }

  async function generate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setDraft("");

    try {
      const res = await fetch("/api/content/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, contentType, topic: topic.trim(), context: context.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setDraft(data.draft ?? "");
    } catch {
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openTeleprompter() {
    localStorage.setItem("signal_teleprompter_script", draft);
    window.open("/teleprompter", "_blank");
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Platform selector */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3">Platform</p>
        <div className="flex gap-2">
          {(["linkedin", "x", "youtube"] as Platform[]).map((p) => {
            const c = PLATFORM_CONFIG[p];
            const active = platform === p;
            return (
              <button
                key={p}
                onClick={() => selectPlatform(p)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: active ? c.bg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? c.border : "rgba(255,255,255,0.06)"}`,
                  color: active ? c.color : "rgba(255,255,255,0.3)",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content type selector */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3">Content Type</p>
        <div className="flex flex-col gap-2">
          {types.map((t) => {
            const active = contentType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setContentType(t.id); setDraft(""); setError(""); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  background: active ? cfg.bg : "rgba(255,255,255,0.02)",
                  border: `1px solid ${active ? cfg.border : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: active ? cfg.color : "rgba(255,255,255,0.5)" }}>{t.label}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{t.description}</p>
                </div>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic input */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3">Topic / What to Write About</p>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Describe what you want to write about..."
          rows={3}
          className="w-full bg-transparent text-sm text-white/75 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        />

        {/* Starter topics */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STARTER_TOPICS.slice(0, 4).map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="text-[9px] text-white/25 hover:text-white/50 px-2 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              {t.length > 40 ? t.slice(0, 40) + "..." : t}
            </button>
          ))}
        </div>
      </div>

      {/* Optional context */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3">
          Additional Context <span className="normal-case text-white/15">(optional)</span>
        </p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Any specific details, results, tools used, or tone notes..."
          rows={2}
          className="w-full bg-transparent text-sm text-white/75 placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={!topic.trim() || loading}
        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
        style={{
          background: loading || !topic.trim() ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${cfg.border.replace("0.25", "0.6")}, ${cfg.border.replace("0.25", "0.3")})`,
          border: `1px solid ${cfg.border}`,
          color: cfg.color,
          boxShadow: topic.trim() && !loading ? `0 0 20px ${cfg.glow}` : "none",
        }}
      >
        {loading ? "Writing with Claude..." : `Generate ${types.find(t => t.id === contentType)?.label ?? "Content"} →`}
      </button>

      {/* Error */}
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {/* Loading dots */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: cfg.color.replace("0.95", "0.5"), animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* Draft output */}
      {draft && !loading && (
        <Card
          className="p-5 flex flex-col gap-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: cfg.color }}>
              {cfg.label} · {types.find(t => t.id === contentType)?.label}
            </p>
            <p className="text-[10px] text-white/20">{draft.split(" ").length} words</p>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{draft}</p>
          </div>

          <div className="flex gap-2">
            {contentType === "script" && (
              <button
                onClick={openTeleprompter}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "rgba(196,181,253,0.9)",
                }}
              >
                Open Teleprompter ↗
              </button>
            )}
            <button
              onClick={copy}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: copied ? "rgba(52,211,153,0.1)" : cfg.bg,
                border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : cfg.border}`,
                color: copied ? "#34d399" : cfg.color,
              }}
            >
              {copied ? "Copied!" : "Copy Content"}
            </button>
          </div>
        </Card>
      )}

      <div className="h-4" />
    </div>
  );
}
