/**
 * lib/vector/vectorDb.ts
 *
 * Server-side Supabase vector DB readiness probe — Sovereign OS v5.7
 *
 * Checks whether the pgvector migration has been applied to memory_items
 * by probing for the `embedding` column via PostgREST schema validation.
 * Used by the status endpoint and embed route without a standalone RPC.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface VectorDbProbeResult {
  columnExists: boolean;
  ready:        boolean;
}

/**
 * Probes whether the pgvector migration has been applied.
 *
 * Sends a zero-row SELECT for the `embedding` column.
 * PostgREST validates column names against the schema, so this will fail
 * with a PostgreSQL error code 42703 ("undefined column") when the
 * pgvector ALTER TABLE migration hasn't been run yet.
 *
 * Never throws — returns `{ ready: false }` on any unexpected error.
 */
export async function probeVectorDb(
  supabase: SupabaseClient
): Promise<VectorDbProbeResult> {
  try {
    const { error } = await supabase
      .from("memory_items")
      .select("embedding")
      .limit(0);

    if (!error) {
      // Column exists and query succeeded
      return { columnExists: true, ready: true };
    }

    // 42703 = undefined_column in PostgreSQL
    // PostgREST also surfaces this with "does not exist" in the message
    const isColumnMissing =
      error.code === "42703" ||
      error.message.toLowerCase().includes("does not exist") ||
      (error.message.toLowerCase().includes("embedding") && error.code?.startsWith("4"));

    if (isColumnMissing) {
      return { columnExists: false, ready: false };
    }

    // Other error (network, RLS, auth) — can't determine; assume not ready
    return { columnExists: false, ready: false };
  } catch {
    return { columnExists: false, ready: false };
  }
}
