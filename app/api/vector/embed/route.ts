/**
 * app/api/vector/embed/route.ts
 *
 * On-demand embedding generator — Sovereign OS v5.6
 *
 * POST body: { text: string; memoryId: string }
 *
 * Returns:
 *   { status: "ok",      dimensions: N, model: "..." }  — embedding generated
 *   { status: "skipped", reason: "..." }                 — no provider configured
 *   { status: "error",   error: "..." }                  — API failure
 *
 * v5.6: The embedding is generated and returned but NOT persisted to Supabase
 * (the pgvector column doesn't exist until the migration in
 * docs/VECTOR_MEMORY_PLAN.md is applied). The client uses the result to
 * confirm that the embedding pipeline works end-to-end.
 */

import { NextRequest, NextResponse } from "next/server";
import { createEmbedding } from "@/lib/vector/embedding";

interface EmbedRequest {
  text:     string;
  memoryId: string;
}

interface EmbedResponse {
  status:     "ok" | "skipped" | "error";
  memoryId?:  string;
  dimensions?: number;
  model?:     string;
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

  return NextResponse.json({
    status:     "ok",
    memoryId,
    dimensions: result.dimensions,
    model:      result.model,
  });
}
