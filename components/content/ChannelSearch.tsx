"use client";

import { useState } from "react";
import { Card } from "@/components/Card";

export interface Channel {
  id: string;
  title: string;
  handle: string;
  subscribers: number;
  videoCount: number;
  thumbnail: string;
  description: string;
}

interface Props {
  onChannelFound: (channel: Channel) => void;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function ChannelSearch({ onChannelFound }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<Channel | null>(null);

  async function search() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setChannel(null);

    try {
      const res = await fetch("/api/youtube/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: input.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Channel not found.");
      } else {
        setChannel(data);
        onChannelFound(data);
        setInput("");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 md:p-7" glow="0 0 80px rgba(239,68,68,0.07)">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/60 mb-4">
        Search Channel
      </p>

      <div className="flex gap-3">
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <span className="text-white/25 text-sm font-semibold shrink-0">@</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="channel handle or name"
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none"
          />
        </div>
        <button
          onClick={search}
          disabled={!input.trim() || loading}
          className="px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, #dc2626, #ef4444)",
            color: "white",
            boxShadow:
              !loading && input.trim()
                ? "0 0 20px rgba(239,68,68,0.35)"
                : "none",
          }}
        >
          {loading ? "Scanning..." : "Scan →"}
        </button>
      </div>

      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}

      {!error && !channel && (
        <p className="text-white/15 text-xs mt-3">
          Try: MattWolfe · lexfridman · mkbhd · any handle
        </p>
      )}

      {/* Channel result card */}
      {channel && (
        <div
          className="mt-4 flex items-center gap-4 p-4 rounded-xl"
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          {channel.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.thumbnail}
              alt={channel.title}
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{channel.title}</p>
            <p className="text-white/35 text-xs">{channel.handle}</p>
          </div>
          <div className="flex gap-5 shrink-0">
            <div className="text-right">
              <p className="text-white font-bold text-sm">{formatNum(channel.subscribers)}</p>
              <p className="text-white/25 text-[10px]">subs</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-sm">{formatNum(channel.videoCount)}</p>
              <p className="text-white/25 text-[10px]">videos</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
