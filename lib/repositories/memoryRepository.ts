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
