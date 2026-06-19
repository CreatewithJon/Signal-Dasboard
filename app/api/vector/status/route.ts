/**
 * app/api/vector/status/route.ts
 *
 * Vector Memory status endpoint — Sovereign OS v5.6
 *
 * Returns configuration state for embedding provider and Supabase vector readiness.
 * Called by client components (settings page, memory page) that can't read
 * server-only env vars directly.
 */

import { NextResponse } from "next/server";
import { isEmbeddingConfigured, getEmbeddingConfig } from "@/lib/vector/embedding";
import { getSupabaseStatus } from "@/lib/supabase/status";

export interface VectorStatus {
  embeddingConfigured: boolean;
  provider:            string | null;
  model:               string | null;
  dimensions:          number | null;
  vectorDbReady:       boolean;        // true when pgvector migration has been applied
  mode:                "semantic-ready" | "deterministic-only";
  supabaseConfigured:  boolean;
}

export async function GET(): Promise<NextResponse<VectorStatus>> {
  const embeddingConfigured = isEmbeddingConfigured();
  const config              = getEmbeddingConfig();
  const supabase            = getSupabaseStatus();

  // v5.6: pgvector migration has not been applied yet.
  // vectorDbReady will flip to true once memory_items.embedding column exists.
  const vectorDbReady = false;

  const status: VectorStatus = {
    embeddingConfigured,
    provider:           config?.provider ?? null,
    model:              config?.model    ?? null,
    dimensions:         config?.dimensions ?? null,
    vectorDbReady,
    mode:               (embeddingConfigured && vectorDbReady) ? "semantic-ready" : "deterministic-only",
    supabaseConfigured: supabase.configured,
  };

  return NextResponse.json(status);
}
