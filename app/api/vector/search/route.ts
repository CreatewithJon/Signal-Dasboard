/**
 * app/api/vector/search/route.ts
 *
 * Semantic memory search endpoint — Sovereign OS v5.7
 *
 * POST body: { query: string; limit?: number }
 *
 * Response:
 *   { status: "ok",       ids: string[], source: "semantic" }
 *   { status: "skipped",  ids: [],       source: "keyword",  reason: "..." }
 *   { status: "fallback", ids: [],       source: "keyword",  reason: "..." }
 *   { status: "error",    ids: [],       source: "none",     reason: "..." }
 *
 * Generates a query embedding server-side (OPENAI_API_KEY available here),
 * calls the match_memories Supabase RPC, and returns matching memory item IDs.
 * The client filters its in-memory item list by these IDs — no memory data
 * is transmitted in either direction, keeping the payload minimal.
 *
 * Falls back gracefully at every step when provider or pgvector is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { createEmbedding, isEmbeddingConfigured } from "@/lib/vector/embedding";
import { getSupabaseServer } from "@/lib/supabase/server";
import { probeVectorDb } from "@/lib/vector/vectorDb";

interface SearchRequest {
  query:  string;
  limit?: number;
}

interface SearchResponse {
  status:  "ok" | "skipped" | "error" | "fallback";
  ids:     string[];
  source:  "semantic" | "keyword" | "none";
  reason?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<SearchResponse>> {
  let body: SearchRequest;
  try {
    body = await req.json() as SearchRequest;
  } catch {
    return NextResponse.json(
      { status: "error", ids: [], source: "none", reason: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { query, limit = 10 } = body;

  if (!query?.trim()) {
    return NextResponse.json({ status: "skipped", ids: [], source: "none", reason: "Empty query." });
  }

  // Guard: embedding provider (OPENAI_API_KEY)
  if (!isEmbeddingConfigured()) {
    return NextResponse.json({
      status: "skipped",
      ids:    [],
      source: "keyword",
      reason: "No embedding provider configured. Set OPENAI_API_KEY to enable semantic search.",
    });
  }

  // Guard: Supabase configured
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json({
      status: "skipped",
      ids:    [],
      source: "keyword",
      reason: "Supabase not configured.",
    });
  }

  // Guard: pgvector migration applied
  const probe = await probeVectorDb(sb);
  if (!probe.ready) {
    return NextResponse.json({
      status: "skipped",
      ids:    [],
      source: "keyword",
      reason: "pgvector migration not yet applied. Apply the migration in supabase/schema.sql.",
    });
  }

  // Generate query embedding server-side
  const embeddingResult = await createEmbedding(query.trim());
  if (embeddingResult.status !== "ok" || !embeddingResult.embedding) {
    return NextResponse.json({
      status: "fallback",
      ids:    [],
      source: "keyword",
      reason: `Embedding generation failed: ${embeddingResult.error ?? embeddingResult.reason ?? "unknown error"}.`,
    });
  }

  // Call match_memories Supabase RPC
  try {
    const { data, error } = await sb.rpc("match_memories", {
      query_embedding: embeddingResult.embedding,
      match_threshold: 0.7,
      match_count:     limit,
    });

    if (error) {
      return NextResponse.json({
        status: "fallback",
        ids:    [],
        source: "keyword",
        reason: `RPC error: ${error.message}`,
      });
    }

    const ids = Array.isArray(data)
      ? (data as Array<{ id: string }>).map((r) => r.id)
      : [];

    return NextResponse.json({ status: "ok", ids, source: "semantic" });
  } catch (err) {
    return NextResponse.json({
      status: "fallback",
      ids:    [],
      source: "keyword",
      reason: `Unexpected RPC error: ${err instanceof Error ? err.message : "unknown"}.`,
    });
  }
}
