/**
 * lib/vector/semanticMemory.ts
 *
 * Vector Memory Foundation — Sovereign OS v5.6
 *
 * Semantic memory search using vector embeddings.
 * Falls back to the existing keyword search when not configured.
 *
 * Architecture:
 *   1. If no provider configured → return skipped + keyword fallback
 *   2. If Supabase vector not ready (pgvector not installed) → return skipped
 *   3. If both ready → perform cosine similarity search via Supabase RPC
 *
 * v5.6: Foundation only. Supabase vector search path returns "skipped" until
 * the pgvector migration (docs/VECTOR_MEMORY_PLAN.md) is applied.
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
  status:      SemanticSearchStatus;
  items:       MemoryItem[];   // Ranked results (empty on skip/error)
  source:      "semantic" | "keyword" | "none";
  reason?:     string;         // Why skipped/fallback was used
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
 * Simple keyword fallback: scores each memory item by query term overlap.
 * Used when semantic search is unavailable.
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
      const titleBonus = item.title.toLowerCase().includes(term) ? 3 : 0;
      const contentBonus = item.content.toLowerCase().includes(term) ? 1 : 0;
      const tagBonus = item.tags.some((t) => t.includes(term)) ? 2 : 0;
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
 * Generates and returns the embedding for a MemoryItem.
 *
 * v5.6: The embedding is returned but NOT stored anywhere yet (Supabase
 * pgvector column doesn't exist until the migration is applied).
 * The result can be used for one-off comparisons or logged for debugging.
 *
 * Future (v5.7+): Store in Supabase memory_items.embedding column.
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

  const text = formatMemoryForEmbedding(item);
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
 * Priority:
 *   1. If embedding not configured → skip, run keyword fallback
 *   2. If Supabase vector not available → skip, run keyword fallback
 *   3. Otherwise → cosine similarity search (v5.7+)
 *
 * v5.6: Always returns fallback, as the Supabase vector column doesn't exist yet.
 * This function is the placeholder for the semantic path; the keyword fallback
 * ensures existing search functionality is never degraded.
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

  // Guard: no embedding provider
  if (!isEmbeddingConfigured()) {
    return {
      status: "fallback",
      items:  keywordFallback(query, allItems, limit),
      source: "keyword",
      reason: "No embedding provider configured — using keyword search.",
    };
  }

  // v5.6: Supabase pgvector not yet available (migration pending).
  // Skip the semantic path and use keyword fallback.
  // TODO v5.7: Check if memory_items.embedding column exists; if so,
  //            generate query embedding + call Supabase RPC match_memories().
  const VECTOR_DB_READY = false; // Will flip to true after pgvector migration

  if (!VECTOR_DB_READY) {
    return {
      status: "fallback",
      items:  keywordFallback(query, allItems, limit),
      source: "keyword",
      reason: "Supabase pgvector not yet enabled — using keyword search. Apply the migration in docs/VECTOR_MEMORY_PLAN.md to activate semantic search.",
    };
  }

  // ── Future semantic path (v5.7+) ──────────────────────────────────────
  // Uncomment and complete when pgvector migration is applied:
  //
  // try {
  //   const queryEmbedding = await createEmbedding(query);
  //   if (queryEmbedding.status !== "ok" || !queryEmbedding.embedding) {
  //     throw new Error(queryEmbedding.error ?? "Embedding failed");
  //   }
  //   const { getSupabaseClient } = await import("@/lib/supabase/client");
  //   const supabase = getSupabaseClient();
  //   if (!supabase) throw new Error("Supabase not configured");
  //
  //   const { data, error } = await supabase.rpc("match_memories", {
  //     query_embedding: queryEmbedding.embedding,
  //     match_threshold: 0.7,
  //     match_count:     limit,
  //   });
  //   if (error) throw new Error(error.message);
  //
  //   const ids = new Set((data as { id: string }[]).map((r) => r.id));
  //   const matched = allItems.filter((i) => ids.has(i.id));
  //   return { status: "ok", items: matched, source: "semantic" };
  // } catch (err) {
  //   return {
  //     status: "fallback",
  //     items:  keywordFallback(query, allItems, limit),
  //     source: "keyword",
  //     reason: `Semantic search failed (${err instanceof Error ? err.message : "unknown"}), using keyword fallback.`,
  //   };
  // }

  // Should never reach here in v5.6
  return {
    status: "fallback",
    items:  keywordFallback(query, allItems, limit),
    source: "keyword",
    reason: "Semantic path not yet active.",
  };
}
