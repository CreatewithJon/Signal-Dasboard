/**
 * lib/repositories/memoryRepository.ts
 *
 * Dual-write repository for MemoryItems — v4.1
 *
 * All write operations:
 *   1. Write to localStorage first (always, cannot fail silently)
 *   2. If Supabase is configured, upsert to Supabase in background
 *   3. Supabase failures are caught and returned — never thrown into UI
 *   4. Returns DualWriteResult so callers can show appropriate status
 *
 * Reads: NOT implemented here — components continue reading from localStorage.
 */

import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/supabase/syncHealth";
import { getCachedUserId } from "@/lib/supabase/authStatus";
import { isSupabaseReadEnabled } from "@/lib/supabase/readMode";
import type { MemoryItem } from "@/lib/types/memory";

// ── Result type ────────────────────────────────────────────────────────────

export interface DualWriteResult {
  local:    "success" | "failed";
  supabase: "success" | "skipped" | "failed";
  error?:   string;
}

// ── localStorage helpers ───────────────────────────────────────────────────

export function getMemoryItemsLocal(): MemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.MEMORY_ITEMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveMemoryItemsLocal(items: MemoryItem[]): "success" | "failed" {
  try {
    localStorage.setItem(KEYS.MEMORY_ITEMS, JSON.stringify(items));
    return "success";
  } catch {
    return "failed";
  }
}

/**
 * saveMemoryItemLocal
 * Upserts a single item into the local array (prepend if new, replace if existing).
 */
export function saveMemoryItemLocal(item: MemoryItem): "success" | "failed" {
  try {
    const existing = getMemoryItemsLocal();
    const idx = existing.findIndex((i) => i.id === item.id);
    const next =
      idx === -1
        ? [item, ...existing]          // new item — prepend
        : existing.map((i) => (i.id === item.id ? item : i)); // update
    return saveMemoryItemsLocal(next);
  } catch {
    return "failed";
  }
}

// ── Supabase row mapper ────────────────────────────────────────────────────

interface MemoryRow {
  id:                  string;
  user_id:             string | null;
  title:               string;
  content:             string;
  type:                string;
  importance:          string;
  source:              string;
  tags:                string[];
  related_project_ids: string[];
  related_people:      string[];
  metadata:            Record<string, unknown>;
  created_at:          string;
  updated_at:          string;
}

function toSupabaseRow(item: MemoryItem): MemoryRow {
  return {
    id:                  item.id,
    user_id:             getCachedUserId(), // null when anonymous; populated when signed in
    title:               item.title,
    content:             item.content,
    type:                item.type,
    importance:          item.importance,
    source:              item.source,
    tags:                item.tags,
    related_project_ids: item.relatedProjectIds,
    related_people:      item.relatedPeople,
    metadata:            {},
    created_at:          item.createdAt,
    updated_at:          item.updatedAt,
  };
}

// ── Supabase write helpers ─────────────────────────────────────────────────

export async function upsertMemoryItemSupabase(
  item: MemoryItem
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";

  const sb = getSupabaseClient();
  if (!sb) return "skipped";

  try {
    const { error } = await sb
      .from("memory_items")
      .upsert(toSupabaseRow(item), { onConflict: "id" });

    const result = error ? "failed" : "success";
    if (error) console.warn("[memoryRepository] Supabase upsert error:", error.message);
    recordSyncResult({
      module: "memory", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[memoryRepository] Supabase upsert threw:", err);
    recordSyncResult({
      module: "memory", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

export async function deleteMemoryItemSupabase(
  id: string
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";

  const sb = getSupabaseClient();
  if (!sb) return "skipped";

  try {
    const { error } = await sb
      .from("memory_items")
      .delete()
      .eq("id", id);

    const result = error ? "failed" : "success";
    if (error) console.warn("[memoryRepository] Supabase delete error:", error.message);
    recordSyncResult({
      module: "memory", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[memoryRepository] Supabase delete threw:", err);
    recordSyncResult({
      module: "memory", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

// ── Dual-write functions ───────────────────────────────────────────────────

/**
 * saveMemoryItemDual
 *
 * Primary dual-write function. Always writes localStorage first.
 * Supabase write happens in parallel only if configured.
 * Returns a result describing what happened — never throws.
 */
export async function saveMemoryItemDual(item: MemoryItem): Promise<DualWriteResult> {
  // 1. localStorage — always first, must succeed
  const local = saveMemoryItemLocal(item);

  // 2. Supabase — background, non-blocking, non-throwing
  const supabase = await upsertMemoryItemSupabase(item);

  return {
    local,
    supabase,
    error:
      local === "failed"
        ? "localStorage write failed"
        : supabase === "failed"
          ? "Supabase sync failed — saved locally"
          : undefined,
  };
}

// ── Supabase read helpers ──────────────────────────────────────────────────

export interface MemoryReadResult {
  items:    MemoryItem[];
  source:   "local" | "supabase";
  fallback: boolean;
  error?:   string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supabaseRowToMemoryItem(row: Record<string, any>): MemoryItem | null {
  if (typeof row.id !== "string" || !row.id) return null;
  if (typeof row.title !== "string" || !row.title) return null;
  return {
    id:                row.id,
    title:             row.title,
    content:           typeof row.content === "string" ? row.content : "",
    type:              row.type       ?? "Note",
    importance:        row.importance ?? "Medium",
    source:            row.source     ?? "Imported",
    tags:              Array.isArray(row.tags)                 ? row.tags                : [],
    relatedProjectIds: Array.isArray(row.related_project_ids) ? row.related_project_ids : [],
    relatedPeople:     Array.isArray(row.related_people)      ? row.related_people      : [],
    createdAt:         row.created_at ?? new Date().toISOString(),
    updatedAt:         row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * getMemoryItems
 *
 * Reads memory items from the configured source (local or Supabase).
 * - "local" mode: returns localStorage data immediately (synchronous under the hood).
 * - "supabase" mode: fetches from Supabase; falls back to localStorage if
 *   not authenticated, Supabase is unconfigured, or the fetch fails.
 *
 * Never modifies localStorage.
 */
export async function getMemoryItems(): Promise<MemoryReadResult> {
  const localItems = getMemoryItemsLocal();

  if (!isSupabaseReadEnabled("memory")) {
    return { items: localItems, source: "local", fallback: false };
  }

  const userId = getCachedUserId();
  if (!userId) {
    return {
      items: localItems, source: "local", fallback: true,
      error: "Not authenticated — reading from local storage.",
    };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return {
      items: localItems, source: "local", fallback: true,
      error: "Supabase not configured.",
    };
  }

  try {
    const { data, error } = await sb
      .from("memory_items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const converted = (data ?? [])
      .map(supabaseRowToMemoryItem)
      .filter(Boolean) as MemoryItem[];

    return { items: converted, source: "supabase", fallback: false };
  } catch (err) {
    console.warn("[memoryRepository] Supabase read failed:", err);
    return {
      items: localItems, source: "local", fallback: true,
      error: err instanceof Error ? err.message : "Supabase read failed.",
    };
  }
}

/**
 * deleteMemoryItemDual
 *
 * Removes item from localStorage and (if configured) deletes from Supabase.
 * localStorage deletion always runs first.
 */
export async function deleteMemoryItemDual(id: string): Promise<DualWriteResult> {
  // 1. localStorage
  let local: "success" | "failed" = "failed";
  try {
    const existing = getMemoryItemsLocal();
    const next = existing.filter((i) => i.id !== id);
    local = saveMemoryItemsLocal(next);
  } catch {
    local = "failed";
  }

  // 2. Supabase
  const supabase = await deleteMemoryItemSupabase(id);

  return {
    local,
    supabase,
    error:
      local === "failed"
        ? "localStorage delete failed"
        : supabase === "failed"
          ? "Supabase delete failed — removed locally"
          : undefined,
  };
}
