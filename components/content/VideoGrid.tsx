"use client";

import { Card } from "@/components/Card";

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  outlierScore: number;
  description: string;
  duration: string;
}

interface Props {
  videos: Video[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (video: Video) => void;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function outlierBadge(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 5)
    return { label: `${score}x 🔥`, color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.22)" };
  if (score >= 2)
    return { label: `${score}x ↑`, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.22)" };
  if (score >= 1)
    return { label: `${score}x`, color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)" };
  return { label: `${score}x`, color: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.05)" };
}

export default function VideoGrid({ videos, loading, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <Card className="p-5 md:p-6 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/60 mb-1">
          Scanning Videos...
        </p>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-[68px] rounded-xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.04)", animationDelay: `${i * 60}ms` }}
          />
        ))}
      </Card>
    );
  }

  if (!videos.length) {
    return (
      <Card className="p-6 text-center" style={{ minHeight: 200 }}>
        <p className="text-white/25 text-sm">No videos found.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-3" glow="0 0 60px rgba(239,68,68,0.05)">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/60">
          {videos.length} Videos · Outlier Ranked
        </p>
        <p className="text-[10px] text-white/20">Click to analyze</p>
      </div>

      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
        {videos.map((video) => {
          const badge = outlierBadge(video.outlierScore);
          const selected = video.id === selectedId;
          return (
            <button
              key={video.id}
              onClick={() => onSelect(video)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                background: selected ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.025)",
                border: selected
                  ? "1px solid rgba(239,68,68,0.22)"
                  : "1px solid rgba(255,255,255,0.05)",
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              }}
            >
              {/* Thumbnail */}
              <div className="w-[72px] h-[50px] rounded-lg overflow-hidden shrink-0 bg-zinc-800/60">
                {video.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/80 leading-tight line-clamp-2 mb-1">
                  {video.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-white/35">{formatNum(video.views)} views</span>
                  <span className="text-white/15 text-[10px]">·</span>
                  <span className="text-[10px] text-white/25">{timeAgo(video.publishedAt)}</span>
                  {video.duration && (
                    <>
                      <span className="text-white/15 text-[10px]">·</span>
                      <span className="text-[10px] text-white/25">{video.duration}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Outlier badge */}
              <div
                className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
                style={{
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.color,
                }}
              >
                {badge.label}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
