/**
 * lib/repositories/contentRepository.ts
 *
 * Dual-write repository for ContentItems — v4.2
 *
 * Strategy (identical to memoryRepository):
 *   1. Write to localStorage first (always)
 *   2. If Supabase is configured, upsert in background
 *   3. Supabase failures caught and returned — never thrown into UI
 *
 * Reads: NOT implemented here — components read from localStorage directly.
 * Archive: implemented as an upsert with status = "Archived".
 */

import { KEYS } from "@/lib/keys";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/supabase/syncHealth";
import { getCachedUserId } from "@/lib/supabase/authStatus";
import { isSupabaseReadEnabled } from "@/lib/supabase/readMode";
import type { ContentItem } from "@/lib/types/content";

// ── Result type ────────────────────────────────────────────────────────────

export interface DualWriteResult {
  local:    "success" | "failed";
  supabase: "success" | "skipped" | "failed";
  error?:   string;
}

// ── localStorage helpers ───────────────────────────────────────────────────

export function getContentItemsLocal(): ContentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.CONTENT_ITEMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContentItem[]) : [];
  } catch {
    return [];
  }
}

export function saveContentItemLocal(item: ContentItem): "success" | "failed" {
  try {
    const existing = getContentItemsLocal();
    const idx = existing.findIndex((i) => i.id === item.id);
    const next =
      idx === -1
        ? [item, ...existing]
        : existing.map((i) => (i.id === item.id ? item : i));
    localStorage.setItem(KEYS.CONTENT_ITEMS, JSON.stringify(next));
    return "success";
  } catch {
    return "failed";
  }
}

export function deleteContentItemLocal(id: string): "success" | "failed" {
  try {
    const existing = getContentItemsLocal();
    localStorage.setItem(
      KEYS.CONTENT_ITEMS,
      JSON.stringify(existing.filter((i) => i.id !== id))
    );
    return "success";
  } catch {
    return "failed";
  }
}

// ── Supabase row mapper ────────────────────────────────────────────────────

interface ContentItemRow {
  id:                 string;
  user_id:            string | null;
  title:              string;
  status:             string;
  platforms:          string[];
  priority:           string;
  format:             string;
  description:        string;
  notes:              string;
  related_project_id: string | null;
  publish_date:       string;
  metadata:           Record<string, unknown>;
  created_at:         string;
  updated_at:         string;
}

function toContentItemRow(item: ContentItem): ContentItemRow {
  return {
    id:                 item.id,
    user_id:            getCachedUserId(),
    title:              item.title,
    status:             item.status,
    platforms:          item.platforms,
    priority:           item.priority,
    format:             item.format,
    description:        item.description,
    notes:              item.notes,
    // Empty string → null for the FK column
    related_project_id: item.related_project_id || null,
    publish_date:       item.publish_date,
    metadata:           {},
    created_at:         item.created_at,
    updated_at:         item.updated_at,
  };
}

// ── Supabase write helpers ─────────────────────────────────────────────────

export async function upsertContentItemSupabase(
  item: ContentItem
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb
      .from("content_items")
      .upsert(toContentItemRow(item), { onConflict: "id" });
    const result = error ? "failed" : "success";
    if (error) console.warn("[contentRepository] Supabase upsert error:", error.message);
    recordSyncResult({
      module: "content", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[contentRepository] Supabase upsert threw:", err);
    recordSyncResult({
      module: "content", operation: "upsert",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

export async function deleteContentItemSupabase(
  id: string
): Promise<"success" | "skipped" | "failed"> {
  const status = getSupabaseStatus();
  if (!status.configured) return "skipped";
  const sb = getSupabaseClient();
  if (!sb) return "skipped";
  try {
    const { error } = await sb.from("content_items").delete().eq("id", id);
    const result = error ? "failed" : "success";
    if (error) console.warn("[contentRepository] Supabase delete error:", error.message);
    recordSyncResult({
      module: "content", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: result,
      error: error?.message,
    });
    return result;
  } catch (err) {
    console.warn("[contentRepository] Supabase delete threw:", err);
    recordSyncResult({
      module: "content", operation: "delete",
      timestamp: new Date().toISOString(),
      local: "success", supabase: "failed",
      error: String(err),
    });
    return "failed";
  }
}

// ── Dual-write functions ───────────────────────────────────────────────────

export async function saveContentItemDual(item: ContentItem): Promise<DualWriteResult> {
  const local    = saveContentItemLocal(item);
  const supabase = await upsertContentItemSupabase(item);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage write failed"
      : supabase === "failed" ? "Supabase sync failed — saved locally"
      : undefined,
  };
}

export async function deleteContentItemDual(id: string): Promise<DualWriteResult> {
  const local    = deleteContentItemLocal(id);
  const supabase = await deleteContentItemSupabase(id);
  return {
    local,
    supabase,
    error:
      local === "failed"     ? "localStorage delete failed"
      : supabase === "failed" ? "Supabase delete failed — removed locally"
      : undefined,
  };
}

// ── Supabase read helpers ──────────────────────────────────────────────────

export interface ContentReadResult {
  items:    ContentItem[];
  source:   "local" | "supabase";
  fallback: boolean;
  error?:   string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supabaseRowToContentItem(row: Record<string, any>): ContentItem | null {
  if (typeof row.id !== "string" || !row.id) return null;
  if (typeof row.title !== "string" || !row.title) return null;
  return {
    id:                 row.id,
    title:              row.title,
    status:             row.status      ?? "Idea",
    platforms:          Array.isArray(row.platforms) ? row.platforms : [],
    priority:           row.priority    ?? "Medium",
    format:             row.format      ?? "Other",
    description:        row.description ?? "",
    notes:              row.notes       ?? "",
    related_project_id: row.related_project_id ?? "",
    publish_date:       row.publish_date ?? "",
    created_at:         row.created_at  ?? new Date().toISOString(),
    updated_at:         row.updated_at  ?? new Date().toISOString(),
  };
}

/**
 * getContentItems
 * Reads content items from localStorage or Supabase based on read mode config.
 * Falls back to localStorage on auth/config/fetch failure.
 * Not yet wired to the content page UI — prepared for future wiring.
 */
export async function getContentItems(): Promise<ContentReadResult> {
  const localItems = getContentItemsLocal();

  if (!isSupabaseReadEnabled("content")) {
    return { items: localItems, source: "local", fallback: false };
  }

  const userId = getCachedUserId();
  if (!userId) {
    return { items: localItems, source: "local", fallback: true, error: "Not authenticated." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return { items: localItems, source: "local", fallback: true, error: "Supabase not configured." };
  }

  try {
    const { data, error } = await sb
      .from("content_items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const converted = (data ?? [])
      .map(supabaseRowToContentItem)
      .filter(Boolean) as ContentItem[];

    return { items: converted, source: "supabase", fallback: false };
  } catch (err) {
    console.warn("[contentRepository] Supabase read failed:", err);
    return {
      items: localItems, source: "local", fallback: true,
      error: err instanceof Error ? err.message : "Supabase read failed.",
    };
  }
}
