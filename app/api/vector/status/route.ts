/**
 * app/api/vector/status/route.ts
 *
 * Vector Memory status endpoint — Sovereign OS v5.7
 *
 * Returns configuration state for the embedding provider and Supabase vector
 * DB readiness. Exposes a 4-state operational mode so client components
 * (settings panel, memory page, AI panel) can adapt their UI without
 * reading server-only env vars directly.
 *
 * Mode progression:
 *   deterministic-only      → no embedding provider configured
 *   embedding-provider-ready → OPENAI_API_KEY set; pgvector not yet applied
 *   vector-db-ready          → pgvector column exists; no embedding provider
 *   semantic-active          → both configured; semantic search is live
 */

import { NextResponse } from "next/server";
import { isEmbeddingConfigured, getEmbeddingConfig } from "@/lib/vector/embedding";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSupabaseServer } from "@/lib/supabase/server";
import { probeVectorDb } from "@/lib/vector/vectorDb";

export type VectorMode =
  | "deterministic-only"
  | "embedding-provider-ready"
  | "vector-db-ready"
  | "semantic-active";

export interface VectorStatus {
  embeddingConfigured: boolean;
  provider:            string | null;
  model:               string | null;
  dimensions:          number | null;
  vectorDbReady:       boolean;
  mode:                VectorMode;
  supabaseConfigured:  boolean;
}

export async function GET(): Promise<NextResponse<VectorStatus>> {
  const embeddingConfigured = isEmbeddingConfigured();
  const config              = getEmbeddingConfig();
  const supabaseStatus      = getSupabaseStatus();

  // Probe pgvector availability when Supabase is configured
  let vectorDbReady = false;
  if (supabaseStatus.configured) {
    const sb = getSupabaseServer();
    if (sb) {
      const probe = await probeVectorDb(sb);
      vectorDbReady = probe.ready;
    }
  }

  // Derive 4-state mode
  let mode: VectorMode;
  if (embeddingConfigured && vectorDbReady) {
    mode = "semantic-active";
  } else if (embeddingConfigured && !vectorDbReady) {
    mode = "embedding-provider-ready";
  } else if (!embeddingConfigured && vectorDbReady) {
    mode = "vector-db-ready";
  } else {
    mode = "deterministic-only";
  }

  return NextResponse.json({
    embeddingConfigured,
    provider:           config?.provider   ?? null,
    model:              config?.model       ?? null,
    dimensions:         config?.dimensions  ?? null,
    vectorDbReady,
    mode,
    supabaseConfigured: supabaseStatus.configured,
  });
}
