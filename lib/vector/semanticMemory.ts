/**
 * lib/vector/semanticMemory.ts
 *
 * Vector Memory Search — Sovereign OS v5.7
 *
 * Semantic memory search using vector embeddings.
 * Falls back to keyword search when not configured or on any error.
 *
 * Architecture (v5.7):
 *   - `searchMemorySemantic()` tries embedding + Supabase RPC when both are
 *     configured. On the server (route handlers), OPENAI_API_KEY is available
 *     so the semantic path activates automatically. On the browser client,
 *     OPENAI_API_KEY is absent, so it falls back to keyword search without
 *     any error surfaced to the user.
 *   - Server-side callers (e.g. a route handler processing context) can
 *     import this function directly.
 *   - Client components use the `/api/vector/search` POST endpoint instead
 *     of calling this function, since they can't read OPENAI_API_KEY.
 *   - `generateMemoryEmbedding()` is used by the `/api/vector/embed` route
 *     for on-demand per-item embedding with optional Supabase persistence.
 *
 * Fallback table:
 *   OPENAI_API_KEY absent        → keyword search (no error)
 *   Supabase not configured      → keyword search (no error)
 *   pgvector column absent       → keyword search (no error)
 *   Embedding API error          → keyword search, logs reason
 *   Supabase RPC error           → keyword search, logs reason
 *   Empty query                  → all items (unranked)
 */

import {
  isEmbeddingConfigured,
  createEmbedding,
  formatMemoryForEmbedding,
  type EmbeddingResult,
} from "@/lib/vector/embedding";
import type { MemoryItem } from "@/lib/types/memory";

// ── Types ──────────────────────────────────────────────────────────────────

export type SemanticSearchStatus = "ok" | "skipped" | "error" | "fallback";

export interface SemanticSearchResult {
  status:  SemanticSearchStatus;
  items:   MemoryItem[];   // Ranked results (empty on skip/error)
  source:  "semantic" | "keyword" | "none";
  reason?: string;         // Why fallback/skip was used
}

export interface GenerateEmbeddingResult {
  status:      "ok" | "skipped" | "error";
  memoryId:    string;
  dimensions?: number;
  model?:      string;
  reason?:     string;
  error?:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Keyword fallback scorer — used when semantic search is unavailable.
 * Scores items by term overlap across title, content, tags, and people.
 */
function keywordFallback(query: string, items: MemoryItem[], limit: number): MemoryItem[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return items.slice(0, limit);

  const scored = items.map((item) => {
    const haystack = [
      item.title,
      item.content,
      item.tags.join(" "),
      item.relatedPeople.join(" "),
      item.type,
    ].join(" ").toLowerCase();

    const score = terms.reduce((sum, term) => {
      const titleBonus   = item.title.toLowerCase().includes(term) ? 3 : 0;
      const contentBonus = item.content.toLowerCase().includes(term) ? 1 : 0;
      const tagBonus     = item.tags.some((t) => t.includes(term)) ? 2 : 0;
      return sum + (haystack.includes(term) ? 1 : 0) + titleBonus + contentBonus + tagBonus;
    }, 0);

    return { item, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

// ── Generate embedding for a single memory item ────────────────────────────

/**
 * Generates the embedding for a MemoryItem.
 *
 * v5.7: Returns the embedding result. Persistence to Supabase (when pgvector
 * migration is applied) is handled by the /api/vector/embed route, not here.
 */
export async function generateMemoryEmbedding(
  item: MemoryItem
): Promise<GenerateEmbeddingResult> {
  if (!isEmbeddingConfigured()) {
    return {
      status:   "skipped",
      memoryId: item.id,
      reason:   "No embedding provider configured. Set OPENAI_API_KEY to enable.",
    };
  }

  const text              = formatMemoryForEmbedding(item);
  const result: EmbeddingResult = await createEmbedding(text);

  if (result.status === "skipped") {
    return { status: "skipped", memoryId: item.id, reason: result.reason };
  }

  if (result.status === "error") {
    return { status: "error", memoryId: item.id, error: result.error };
  }

  return {
    status:     "ok",
    memoryId:   item.id,
    dimensions: result.dimensions,
    model:      result.model,
  };
}

// ── Semantic search ────────────────────────────────────────────────────────

/**
 * Performs semantic search across memory items.
 *
 * On the server (route handlers): activates the full semantic path when
 * OPENAI_API_KEY is set and Supabase + pgvector are configured.
 * On the browser client: OPENAI_API_KEY is absent, so `createEmbedding()`
 * returns "skipped" and this function falls back to keyword search.
 *
 * For client-side semantic search, call the /api/vector/search endpoint
 * instead (which runs this logic server-side).
 */
export async function searchMemorySemantic(
  query: string,
  allItems: MemoryItem[],
  limit = 10
): Promise<SemanticSearchResult> {
  // Guard: empty query
  if (!query.trim()) {
    return {
      status: "skipped",
      items:  allItems.slice(0, limit),
      source: "none",
      reason: "Empty query.",
    };
  }

  // Guard: no embedding provider (includes client-side where OPENAI_API_KEY is absent)
  if (!isEmbeddingConfigured()) {
    return {
      status: "fallback",
      items:  keywordFallback(query, allItems, limit),
      source: "keyword",
      reason: "No embedding provider configured — using keyword search.",
    };
  }

  // Attempt full semantic path
  try {
    const queryEmbedding = await createEmbedding(query.trim());

    if (queryEmbedding.status !== "ok" || !queryEmbedding.embedding) {
      // Embedding generation skipped or failed — keyword fallback
      return {
        status: "fallback",
        items:  keywordFallback(query, allItems, limit),
        source: "keyword",
        reason: queryEmbedding.status === "skipped"
          ? (queryEmbedding.reason ?? "Embedding skipped.")
          : (queryEmbedding.error ?? "Embedding generation failed."),
      };
    }

    // Import Supabase browser client dynamically to avoid breaking builds
    // when Supabase env vars are absent (deferred import pattern)
    const { getSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        status: "fallback",
        items:  keywordFallback(query, allItems, limit),
        source: "keyword",
        reason: "Supabase not configured — using keyword search.",
      };
    }

    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding.embedding,
      match_threshold: 0.7,
      match_count:     limit,
    });

    if (error) {
      // RPC may not exist if pgvector migration hasn't been applied
      return {
        status: "fallback",
        items:  keywordFallback(query, allItems, limit),
        source: "keyword",
        reason: `Supabase RPC error: ${error.message}`,
      };
    }

    const ids     = new Set((data as Array<{ id: string }>).map((r) => r.id));
    const matched = allItems.filter((i) => ids.has(i.id));

    return { status: "ok", items: matched, source: "semantic" };
  } catch (err) {
    return {
      status: "fallback",
      items:  keywordFallback(query, allItems, limit),
      source: "keyword",
      reason: `Semantic search failed (${err instanceof Error ? err.message : "unknown"}), using keyword fallback.`,
    };
  }
}
