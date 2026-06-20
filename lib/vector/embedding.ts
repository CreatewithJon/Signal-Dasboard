/**
 * lib/vector/embedding.ts
 *
 * Vector Memory Foundation — Sovereign OS v5.6
 *
 * Embedding utility for semantic memory retrieval.
 * Server-side only — never call directly from client components.
 * Use /api/vector/status and /api/vector/embed route handlers instead.
 *
 * Design principles:
 *   - If no provider is configured, all functions return a safe "skipped" state.
 *   - Does NOT replace the existing deterministic keyword context engine.
 *   - Does NOT require vectors for the app to work.
 *   - Foundation only — no auto-embedding, no bulk runs.
 *
 * Supported provider: OpenAI (text-embedding-3-small, 1536 dimensions)
 * Why OpenAI: already referenced in codebase (Whisper), well-documented,
 *   cost-effective ($0.02/1M tokens), synchronous, deterministic.
 * Anthropic: does not expose a public embeddings API as of v5.6.
 */

import type { MemoryItem } from "@/lib/types/memory";
import { safeStringArray } from "@/lib/utils/arrays";

// ── Provider detection ─────────────────────────────────────────────────────

export type EmbeddingProvider = "openai" | "none";

export interface EmbeddingConfig {
  provider:   EmbeddingProvider;
  model:      string;
  dimensions: number;
}

/**
 * Returns true if an embedding provider is available.
 * Server-side only — reads process.env at runtime.
 */
export function isEmbeddingConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Returns the active embedding configuration, or null if not configured.
 */
export function getEmbeddingConfig(): EmbeddingConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider:   "openai",
      model:      "text-embedding-3-small",
      dimensions: 1536,
    };
  }
  return null;
}

// ── Text formatter ─────────────────────────────────────────────────────────

/**
 * Formats a MemoryItem into a single text string optimized for embedding.
 * Title is weighted first (most semantically significant), then type context,
 * then full content, then tags as comma-separated keywords.
 */
export function formatMemoryForEmbedding(item: MemoryItem): string {
  const parts: string[] = [
    item.title,
    `Type: ${item.type}. Importance: ${item.importance}.`,
  ];

  if (item.content.trim()) {
    parts.push(item.content.trim());
  }

  if (safeStringArray(item.tags).length > 0) {
    parts.push(`Tags: ${safeStringArray(item.tags).join(", ")}`);
  }

  if (safeStringArray(item.relatedPeople).length > 0) {
    parts.push(`People: ${safeStringArray(item.relatedPeople).join(", ")}`);
  }

  return parts.join("\n").slice(0, 8000); // Stay well within token limits
}

// ── Embedding result types ─────────────────────────────────────────────────

export type EmbeddingStatus = "ok" | "skipped" | "error";

export interface EmbeddingResult {
  status:     EmbeddingStatus;
  embedding?: number[];          // 1536-dimensional float array (OpenAI)
  model?:     string;
  dimensions?: number;
  reason?:    string;            // Set when status === "skipped"
  error?:     string;            // Set when status === "error"
}

// ── Core embedding call ────────────────────────────────────────────────────

/**
 * Generates an embedding vector for the given text string.
 *
 * Returns:
 *   { status: "skipped" }           — if no provider is configured
 *   { status: "ok", embedding: [...] } — on success
 *   { status: "error", error: "..." }  — on API failure
 *
 * Never throws. All errors are caught and returned as { status: "error" }.
 */
export async function createEmbedding(text: string): Promise<EmbeddingResult> {
  const config = getEmbeddingConfig();

  if (!config) {
    return {
      status: "skipped",
      reason: "No embedding provider configured. Set OPENAI_API_KEY to enable semantic memory.",
    };
  }

  const truncated = text.slice(0, 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: truncated,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        status: "error",
        error:  `OpenAI API error ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
      model: string;
    };

    const embedding = data.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      return { status: "error", error: "OpenAI returned unexpected embedding format." };
    }

    return {
      status:     "ok",
      embedding,
      model:      data.model ?? config.model,
      dimensions: embedding.length,
    };
  } catch (err) {
    return {
      status: "error",
      error:  err instanceof Error ? err.message : "Unknown error during embedding.",
    };
  }
}
