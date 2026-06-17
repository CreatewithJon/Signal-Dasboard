"use client";

import { useEffect, useState } from "react";
import { getMemoryItemsLocal } from "@/lib/repositories/memoryRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function MemorySyncStatus() {
  const [count, setCount] = useState(0);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setCount(getMemoryItemsLocal().length);
    setSupabaseReady(isSupabaseConfigured());
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
          Memory Items
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          {count} item{count !== 1 ? "s" : ""} stored locally
          {supabaseReady ? " · dual-write enabled" : " · local-only mode"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: supabaseReady ? "rgba(52,211,153,0.8)" : "rgba(245,158,11,0.8)" }}
        />
        <span className="text-[10px] font-semibold" style={{ color: supabaseReady ? "rgba(52,211,153,0.7)" : "rgba(245,158,11,0.7)" }}>
          {supabaseReady ? "Syncing" : "Local only"}
        </span>
      </div>
    </div>
  );
}
