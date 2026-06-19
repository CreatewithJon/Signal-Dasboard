"use client";

/**
 * components/settings/VectorMemorySettings.tsx
 *
 * Vector Memory Settings panel — Sovereign OS v5.6
 *
 * Shows:
 *   - Embedding provider configured yes/no
 *   - Supabase vector readiness yes/no
 *   - Current mode: deterministic only / semantic ready
 *   - "Test Embedding" button (only if provider configured)
 */

import { useState, useEffect } from "react";
import type { VectorStatus } from "@/app/api/vector/status/route";

type TestState = "idle" | "loading" | "ok" | "skipped" | "error";

interface TestResult {
  state:      TestState;
  dimensions?: number;
  model?:     string;
  message?:   string;
}

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: "test",
          text: "Sovereign OS vector memory test. This is a sample embedding to confirm the pipeline is working.",
        }),
      });
      const data = await res.json() as {
        status: string;
        dimensions?: number;
        model?: string;
        reason?: string;
        error?: string;
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

  const isConfigured  = status?.embeddingConfigured ?? false;
  const isVectorReady = status?.vectorDbReady ?? false;
  const mode          = status?.mode ?? "deterministic-only";

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
        background: isConfigured ? "rgba(99,102,241,0.02)" : "rgba(255,255,255,0.02)",
        border: isConfigured ? "1px solid rgba(99,102,241,0.14)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Mode badge */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: mode === "semantic-ready"
                ? "rgba(52,211,153,0.85)"
                : "rgba(255,255,255,0.2)",
            }}
          />
          <span
            className="text-sm font-semibold"
            style={{
              color: mode === "semantic-ready"
                ? "rgba(52,211,153,0.9)"
                : "rgba(255,255,255,0.5)",
            }}
          >
            {mode === "semantic-ready" ? "Semantic Ready" : "Deterministic Only"}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          {mode === "semantic-ready"
            ? "Embedding provider and Supabase vector database are both configured. Semantic memory search is active."
            : "Keyword-based context matching is active. Add an embedding provider and apply the pgvector migration to enable semantic search."}
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
            {isVectorReady ? "Ready" : "Migration pending"}
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

      {/* Test embedding button */}
      {isConfigured && (
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runTest}
              disabled={test.state === "loading"}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.22)",
                color: "rgba(165,180,252,0.85)",
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
              Pipeline confirmed. Embeddings are generating correctly.
              Apply the pgvector migration to enable semantic search.
            </p>
          )}
        </div>
      )}

      {/* Setup instructions if not configured */}
      {!isConfigured && (
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-2">
            To enable semantic memory
          </p>
          <ol className="space-y-1.5">
            {[
              "Add OPENAI_API_KEY to your Vercel environment variables",
              "Redeploy — this panel will show the provider as configured",
              "Apply the pgvector migration (docs/VECTOR_MEMORY_PLAN.md)",
              "Use the 'Generate embedding' button on memory items to index them",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold mt-0.5"
                  style={{ background: "rgba(99,102,241,0.1)", color: "rgba(165,180,252,0.6)" }}
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
