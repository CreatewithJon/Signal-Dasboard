"use client";

/**
 * components/settings/VectorMemorySettings.tsx
 *
 * Vector Memory Settings panel — Sovereign OS v5.7
 *
 * Shows 4-state operational mode:
 *   deterministic-only       → no embedding provider
 *   embedding-provider-ready → OPENAI_API_KEY set, pgvector not applied
 *   vector-db-ready          → pgvector exists, no embedding provider
 *   semantic-active          → both configured; semantic search live
 */

import { useState, useEffect } from "react";
import type { VectorStatus, VectorMode } from "@/app/api/vector/status/route";

type TestState = "idle" | "loading" | "ok" | "skipped" | "error";

interface TestResult {
  state:       TestState;
  dimensions?: number;
  model?:      string;
  message?:    string;
}

const MODE_CONFIG: Record<VectorMode, {
  label: string;
  description: string;
  dotColor: string;
  textColor: string;
}> = {
  "deterministic-only": {
    label:       "Deterministic Only",
    description: "Keyword-based context matching is active. Set OPENAI_API_KEY and apply the pgvector migration to enable semantic search.",
    dotColor:    "rgba(255,255,255,0.18)",
    textColor:   "rgba(255,255,255,0.45)",
  },
  "embedding-provider-ready": {
    label:       "Embedding Provider Ready",
    description: "OPENAI_API_KEY is configured. Apply the pgvector migration (supabase/schema.sql) to activate semantic search.",
    dotColor:    "rgba(245,158,11,0.8)",
    textColor:   "rgba(245,158,11,0.85)",
  },
  "vector-db-ready": {
    label:       "Vector DB Ready",
    description: "pgvector migration has been applied. Add OPENAI_API_KEY to your environment to activate semantic search.",
    dotColor:    "rgba(99,102,241,0.8)",
    textColor:   "rgba(165,180,252,0.85)",
  },
  "semantic-active": {
    label:       "Semantic Active",
    description: "Embedding provider and Supabase vector database are both configured. Semantic memory search is live.",
    dotColor:    "rgba(52,211,153,0.85)",
    textColor:   "rgba(52,211,153,0.9)",
  },
};

const SETUP_STEPS: Record<VectorMode, string[]> = {
  "deterministic-only": [
    "Add OPENAI_API_KEY to your Vercel environment variables",
    "Redeploy — this panel will show 'Embedding Provider Ready'",
    "Apply the pgvector migration from supabase/schema.sql",
    "Use 'Batch Embed' on the Memory page to index your items",
  ],
  "embedding-provider-ready": [
    "In Supabase SQL Editor, run the v5.6 migration block from supabase/schema.sql",
    "This adds: embedding column, match_memories() RPC, IVFFlat index",
    "Return here — mode will show 'Semantic Active'",
    "Go to /memory and use 'Batch Embed' to index your memories",
  ],
  "vector-db-ready": [
    "Add OPENAI_API_KEY to your Vercel environment variables",
    "Redeploy — mode will show 'Semantic Active'",
    "Go to /memory and use 'Batch Embed' to index your memories",
  ],
  "semantic-active": [
    "Go to /memory and use 'Batch Embed' to index Critical and High importance memories",
    "Run 'Test Embedding' below to confirm the pipeline end-to-end",
    "Semantic results appear in the AI panel with a ⚡ semantic badge",
  ],
};

export default function VectorMemorySettings() {
  const [status,  setStatus]  = useState<VectorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [test,    setTest]    = useState<TestResult>({ state: "idle" });

  useEffect(() => {
    fetch("/api/vector/status")
      .then((r) => r.json())
      .then((data: VectorStatus) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  async function runTest() {
    setTest({ state: "loading" });
    try {
      const res = await fetch("/api/vector/embed", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          memoryId: "test",
          text:     "Sovereign OS vector memory test. This is a sample embedding to confirm the pipeline is working end-to-end.",
        }),
      });
      const data = await res.json() as {
        status:      string;
        dimensions?: number;
        model?:      string;
        reason?:     string;
        error?:      string;
      };

      if (data.status === "ok") {
        setTest({ state: "ok", dimensions: data.dimensions, model: data.model });
      } else if (data.status === "skipped") {
        setTest({ state: "skipped", message: data.reason });
      } else {
        setTest({ state: "error", message: data.error ?? "Unknown error" });
      }
    } catch (err) {
      setTest({ state: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl px-5 py-4 animate-pulse"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", height: 120 }}
      />
    );
  }

  const mode          = (status?.mode ?? "deterministic-only") as VectorMode;
  const isConfigured  = status?.embeddingConfigured ?? false;
  const isVectorReady = status?.vectorDbReady ?? false;
  const isActive      = mode === "semantic-active";
  const modeCfg       = MODE_CONFIG[mode];
  const setupSteps    = SETUP_STEPS[mode];

  function StatusDot({ ok }: { ok: boolean }) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ background: ok ? "rgba(52,211,153,0.85)" : "rgba(239,68,68,0.7)" }}
      />
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isActive
          ? "rgba(52,211,153,0.02)"
          : isConfigured
          ? "rgba(99,102,241,0.02)"
          : "rgba(255,255,255,0.02)",
        border: isActive
          ? "1px solid rgba(52,211,153,0.14)"
          : isConfigured
          ? "1px solid rgba(99,102,241,0.14)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Mode badge */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: modeCfg.dotColor }}
          />
          <span className="text-sm font-semibold" style={{ color: modeCfg.textColor }}>
            {modeCfg.label}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          {modeCfg.description}
        </p>
      </div>

      {/* Detail rows */}
      <div className="px-5 py-1">
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <StatusDot ok={isConfigured} />
          <span className="text-xs text-white/40 flex-1">Embedding provider</span>
          <span
            className="text-xs font-mono"
            style={{ color: isConfigured ? "rgba(52,211,153,0.75)" : "rgba(255,255,255,0.18)" }}
          >
            {isConfigured ? `${status?.provider ?? "openai"} · ${status?.model ?? ""}` : "Not configured"}
          </span>
        </div>

        <div className="flex items-center gap-2 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <StatusDot ok={isVectorReady} />
          <span className="text-xs text-white/40 flex-1">Supabase pgvector</span>
          <span
            className="text-xs font-mono"
            style={{ color: isVectorReady ? "rgba(52,211,153,0.75)" : "rgba(255,255,255,0.18)" }}
          >
            {isVectorReady ? "Migration applied" : "Migration pending"}
          </span>
        </div>

        <div className="flex items-center gap-2 py-3">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: "rgba(99,102,241,0.7)" }}
          />
          <span className="text-xs text-white/40 flex-1">Dimensions</span>
          <span className="text-xs font-mono text-white/30">
            {isConfigured ? `${status?.dimensions ?? 1536}` : "—"}
          </span>
        </div>
      </div>

      {/* Test embedding button — only when provider is configured */}
      {isConfigured && (
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runTest}
              disabled={test.state === "loading"}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: "rgba(99,102,241,0.1)",
                border:     "1px solid rgba(99,102,241,0.22)",
                color:      "rgba(165,180,252,0.85)",
              }}
            >
              {test.state === "loading" ? "Testing…" : "Test Embedding"}
            </button>

            {test.state === "ok" && (
              <span className="text-[10px] font-semibold" style={{ color: "rgba(52,211,153,0.8)" }}>
                ✓ {test.dimensions}-dim vector · {test.model}
              </span>
            )}
            {test.state === "skipped" && (
              <span className="text-[10px]" style={{ color: "rgba(245,158,11,0.7)" }}>
                Skipped — {test.message}
              </span>
            )}
            {test.state === "error" && (
              <span className="text-[10px]" style={{ color: "rgba(239,68,68,0.7)" }}>
                Error — {test.message}
              </span>
            )}
          </div>

          {test.state === "ok" && (
            <p className="text-[9px] text-white/20 mt-2 leading-relaxed">
              {isActive
                ? "Pipeline confirmed. Semantic search is active — use /memory to batch embed your items."
                : "Pipeline confirmed. Apply the pgvector migration to enable semantic search."}
            </p>
          )}
        </div>
      )}

      {/* Next steps */}
      {setupSteps.length > 0 && (
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-2">
            {isActive ? "Recommended next steps" : "To activate semantic memory"}
          </p>
          <ol className="space-y-1.5">
            {setupSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold mt-0.5"
                  style={{
                    background: isActive ? "rgba(52,211,153,0.1)" : "rgba(99,102,241,0.1)",
                    color:      isActive ? "rgba(52,211,153,0.7)" : "rgba(165,180,252,0.6)",
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-[10px] text-white/25 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
