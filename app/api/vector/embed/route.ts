/**
 * app/api/vector/embed/route.ts
 *
 * On-demand embedding generator — Sovereign OS v5.7
 *
 * POST body: { text: string; memoryId: string }
 *
 * Returns:
 *   { status: "ok",      dimensions: N, model: "...", persisted: boolean }
 *   { status: "skipped", reason: "..." }
 *   { status: "error",   error: "..." }
 *
 * v5.7: When the pgvector migration has been applied (embedding column exists
 * on memory_items), the embedding is persisted to Supabase immediately after
 * generation. Falls back gracefully if persistence fails — the embedding
 * dimensions are always returned regardless.
 */

import { NextRequest, NextResponse } from "next/server";
import { createEmbedding } from "@/lib/vector/embedding";
import { getSupabaseServer } from "@/lib/supabase/server";
import { probeVectorDb } from "@/lib/vector/vectorDb";

interface EmbedRequest {
  text:     string;
  memoryId: string;
}

interface EmbedResponse {
  status:     "ok" | "skipped" | "error";
  memoryId?:  string;
  dimensions?: number;
  model?:     string;
  persisted?: boolean;   // true when embedding was saved to Supabase
  reason?:    string;
  error?:     string;
}

export async function POST(req: NextRequest): Promise<NextResponse<EmbedResponse>> {
  let body: EmbedRequest;

  try {
    body = await req.json() as EmbedRequest;
  } catch {
    return NextResponse.json({ status: "error", error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, memoryId } = body;

  if (!text?.trim()) {
    return NextResponse.json({ status: "error", error: "text is required." }, { status: 400 });
  }

  const result = await createEmbedding(text);

  if (result.status === "skipped") {
    return NextResponse.json({ status: "skipped", reason: result.reason, memoryId });
  }

  if (result.status === "error") {
    return NextResponse.json({ status: "error", error: result.error, memoryId }, { status: 500 });
  }

  // ── Attempt Supabase persistence (v5.7) ──────────────────────────────────
  let persisted = false;

  // Only persist when memoryId looks like a real memory ID (not a test call)
  if (memoryId && memoryId !== "test" && result.embedding) {
    const sb = getSupabaseServer();
    if (sb) {
      // Probe first — silently skip persistence if column doesn't exist
      const probe = await probeVectorDb(sb);
      if (probe.ready) {
        const { error: updateError } = await sb
          .from("memory_items")
          .update({
            embedding:       result.embedding,
            embedding_model: result.model ?? null,
            embedded_at:     new Date().toISOString(),
          })
          .eq("id", memoryId);

        persisted = !updateError;
      }
    }
  }

  return NextResponse.json({
    status:     "ok",
    memoryId,
    dimensions: result.dimensions,
    model:      result.model,
    persisted,
  });
}
