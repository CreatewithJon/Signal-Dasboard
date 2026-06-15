"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import type { Video } from "./VideoGrid";

interface Props {
  video: Video | null;
}

type TabKey =
  | "Hook Analysis"
  | "Content Framework"
  | "Keywords & Topics"
  | "Why It's an Outlier"
  | "Rewritten Script (My Voice)"
  | "LinkedIn Posts";

const ANALYSIS_TABS: { key: TabKey; label: string }[] = [
  { key: "Hook Analysis", label: "Hook" },
  { key: "Content Framework", label: "Framework" },
  { key: "Keywords & Topics", label: "Keywords" },
  { key: "Why It's an Outlier", label: "Why" },
  { key: "Rewritten Script (My Voice)", label: "Script" },
  { key: "LinkedIn Posts", label: "LinkedIn" },
];

export default function VideoAnalysisPanel({ video }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState<Record<string, string>>({});
  const [rawAnalysis, setRawAnalysis] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("Hook Analysis");
  const [copied, setCopied] = useState(false);

  // LinkedIn state
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInPosts, setLinkedInPosts] = useState<string[]>([]);
  const [linkedInError, setLinkedInError] = useState("");
  const [copiedPost, setCopiedPost] = useState<number | null>(null);

  useEffect(() => {
    if (!video) return;
    setLoading(true);
    setError("");
    setSections({});
    setRawAnalysis("");
    setActiveTab("Hook Analysis");
    setLinkedInPosts([]);
    setLinkedInError("");

    fetch("/api/content/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id,
        title: video.title,
        description: video.description,
        views: video.views,
        outlierScore: video.outlierScore,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setSections(data.sections ?? {});
        setRawAnalysis(data.analysis ?? "");
      })
      .catch(() => setError("Failed to analyze. Try again."))
      .finally(() => setLoading(false));
  }, [video]);

  // Generate LinkedIn posts when tab is opened
  useEffect(() => {
    if (activeTab !== "LinkedIn Posts") return;
    if (linkedInPosts.length > 0 || linkedInLoading) return;
    const script = sections["Rewritten Script (My Voice)"];
    if (!script) return;

    setLinkedInLoading(true);
    setLinkedInError("");

    fetch("/api/content/linkedin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, title: video?.title }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLinkedInError(data.error); return; }
        setLinkedInPosts(data.posts ?? []);
      })
      .catch(() => setLinkedInError("Failed to generate posts. Try again."))
      .finally(() => setLinkedInLoading(false));
  }, [activeTab, sections, video, linkedInPosts.length, linkedInLoading]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPost(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedPost(idx);
    setTimeout(() => setCopiedPost(null), 2000);
  }

  function openTeleprompter() {
    const script = sections["Rewritten Script (My Voice)"] ?? "";
    localStorage.setItem("sovereign_teleprompter_script", script);
    window.open("/teleprompter", "_blank");
  }

  // Empty state
  if (!video) {
    return (
      <Card
        className="p-6 flex flex-col items-center justify-center text-center gap-4"
        style={{ minHeight: 340 }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.14)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-rose-400/50">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.258a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-white/40 text-sm font-semibold mb-1">Select a video</p>
          <p className="text-white/20 text-xs leading-relaxed max-w-[200px] mx-auto">
            Click any video to analyze its hook, framework, keywords, and get a rewritten script.
          </p>
        </div>
      </Card>
    );
  }

  const hasSections = Object.keys(sections).length > 0;
  const hasScript = !!sections["Rewritten Script (My Voice)"];

  return (
    <Card
      className="p-5 md:p-6 flex flex-col gap-4"
      glow="0 0 80px rgba(239,68,68,0.08)"
      style={{ minHeight: 400 }}
    >
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/60 mb-2">
          Analysis
        </p>
        <p className="text-xs text-white/60 font-semibold leading-snug line-clamp-2">
          {video.title}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  background: "rgba(239,68,68,0.55)",
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
          <p className="text-white/25 text-xs">Analyzing with Claude...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-rose-400 text-sm">{error}</p>
      )}

      {/* Results */}
      {!loading && !error && hasSections && (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {ANALYSIS_TABS.map(({ key, label }) => {
              // LinkedIn tab only shows if script exists
              if (key === "LinkedIn Posts" && !hasScript) return null;
              // Other analysis tabs only show if section exists
              if (key !== "LinkedIn Posts" && !sections[key]) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-full transition-all"
                  style={{
                    background:
                      activeTab === key
                        ? key === "LinkedIn Posts"
                          ? "rgba(10,102,194,0.2)"
                          : "rgba(239,68,68,0.15)"
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      activeTab === key
                        ? key === "LinkedIn Posts"
                          ? "rgba(10,102,194,0.35)"
                          : "rgba(239,68,68,0.3)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    color:
                      activeTab === key
                        ? key === "LinkedIn Posts"
                          ? "rgba(147,197,253,0.95)"
                          : "rgba(252,165,165,0.95)"
                        : "rgba(255,255,255,0.3)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* LinkedIn Posts tab */}
          {activeTab === "LinkedIn Posts" && (
            <div className="flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-4">
              {linkedInLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: "rgba(10,102,194,0.6)", animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-white/25 text-xs">Generating LinkedIn posts...</p>
                </div>
              )}
              {linkedInError && !linkedInLoading && (
                <p className="text-rose-400 text-sm">{linkedInError}</p>
              )}
              {!linkedInLoading && linkedInPosts.map((post, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl flex flex-col gap-3"
                  style={{
                    background: "rgba(10,102,194,0.06)",
                    border: "1px solid rgba(10,102,194,0.15)",
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
                    Post {idx + 1}
                  </p>
                  <p className="text-xs text-white/65 leading-relaxed whitespace-pre-wrap">{post}</p>
                  <button
                    onClick={() => copyPost(post, idx)}
                    className="self-start px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: copiedPost === idx ? "rgba(52,211,153,0.1)" : "rgba(10,102,194,0.1)",
                      border: `1px solid ${copiedPost === idx ? "rgba(52,211,153,0.25)" : "rgba(10,102,194,0.25)"}`,
                      color: copiedPost === idx ? "#34d399" : "rgba(147,197,253,0.8)",
                    }}
                  >
                    {copiedPost === idx ? "Copied!" : "Copy Post"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Regular tab content */}
          {activeTab !== "LinkedIn Posts" && (
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                {sections[activeTab] ?? ""}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {activeTab !== "LinkedIn Posts" && (
            <div className="flex gap-2">
              {/* Teleprompter button — only on Script tab */}
              {activeTab === "Rewritten Script (My Voice)" && hasScript && (
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

              {/* Copy button */}
              <button
                onClick={() =>
                  copy(
                    activeTab === "Rewritten Script (My Voice)"
                      ? (sections[activeTab] ?? "")
                      : rawAnalysis
                  )
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: copied ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.2)"}`,
                  color: copied ? "#34d399" : "rgba(252,165,165,0.8)",
                }}
              >
                {copied
                  ? "Copied!"
                  : activeTab === "Rewritten Script (My Voice)"
                  ? "Copy Script"
                  : "Copy Full Analysis"}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
