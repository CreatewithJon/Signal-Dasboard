"use client";

import { useState } from "react";
import ChannelSearch, { type Channel } from "@/components/content/ChannelSearch";
import VideoGrid, { type Video } from "@/components/content/VideoGrid";
import VideoAnalysisPanel from "@/components/content/VideoAnalysisPanel";
import BrandRoadmap from "@/components/content/BrandRoadmap";
import ContentDraftTool from "@/components/content/ContentDraftTool";
import BRollPipeline from "@/components/content/BRollPipeline";
import IdeasVault from "@/components/content/IdeasVault";
import ContentPipeline from "@/components/content/ContentPipeline";

type Tab = "pipeline" | "research" | "brand" | "draft" | "ideas" | "broll";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "pipeline",  label: "Pipeline",     description: "Ideas · Drafts · Publishing · Repurposing" },
  { id: "research",  label: "Research",     description: "Find outliers · Extract frameworks · Rewrite scripts" },
  { id: "brand",     label: "Brand Plan",   description: "Step-by-step brand build roadmap" },
  { id: "draft",     label: "Draft",        description: "AI-powered LinkedIn · X · YouTube writer" },
  { id: "ideas",     label: "Ideas",        description: "Capture hooks, angles, and content ideas" },
  { id: "broll",     label: "B-Roll",       description: "Upload video · Auto-transcribe · Generate clips" },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);

  async function handleChannelFound(ch: Channel) {
    setChannel(ch);
    setSelectedVideo(null);
    setVideos([]);
    setLoadingVideos(true);

    try {
      const res = await fetch("/api/youtube/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: ch.id }),
      });
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
    } catch {
      // silently fail — VideoGrid shows empty state
    } finally {
      setLoadingVideos(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(239,68,68,0.12) 0%, rgba(139,92,246,0.06) 55%, transparent 75%)",
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-rose-400/60 mb-4 relative">
          Content Engine
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-4 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Research. Plan. Draft.<br />Publish.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Find outlier videos, build your brand step by step, and draft platform-specific content — all in one place.
        </p>
      </section>

      {/* ── Tab Navigation ── */}
      <div
        className="mb-6 p-1 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="grid grid-cols-6 gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center py-3 px-2 rounded-xl transition-all"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                }}
              >
                <span
                  className="text-xs font-bold mb-0.5 transition-colors"
                  style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
                >
                  {tab.label}
                </span>
                <span className="text-[9px] text-white/20 text-center leading-tight hidden sm:block">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: Pipeline ── */}
      {activeTab === "pipeline" && (
        <ContentPipeline />
      )}

      {/* ── Tab: Research ── */}
      {activeTab === "research" && (
        <>
          {/* Flow pills */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6">
            {["Search Channel", "Find Outliers", "Extract Framework", "Rewrite Script"].map((label, i, arr) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="text-[9px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.16)",
                    color: "rgba(252,165,165,0.65)",
                  }}
                >
                  {label}
                </span>
                {i < arr.length - 1 && <span className="text-white/15 text-xs">→</span>}
              </div>
            ))}
          </div>

          <ChannelSearch onChannelFound={handleChannelFound} />

          {(channel || loadingVideos) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="col-span-1 md:col-span-7">
                <VideoGrid
                  videos={videos}
                  loading={loadingVideos}
                  selectedId={selectedVideo?.id ?? null}
                  onSelect={setSelectedVideo}
                />
              </div>
              <div className="col-span-1 md:col-span-5">
                <VideoAnalysisPanel video={selectedVideo} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Brand Plan ── */}
      {activeTab === "brand" && (
        <BrandRoadmap />
      )}

      {/* ── Tab: Draft Content ── */}
      {activeTab === "draft" && (
        <div className="max-w-2xl mx-auto">
          <ContentDraftTool />
        </div>
      )}

      {/* ── Tab: Ideas ── */}
      {activeTab === "ideas" && (
        <IdeasVault />
      )}

      {/* ── Tab: B-Roll ── */}
      {activeTab === "broll" && (
        <BRollPipeline />
      )}

      <div className="h-10" />
    </div>
  );
}
