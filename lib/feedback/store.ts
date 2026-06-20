/**
 * lib/feedback/store.ts
 *
 * Feedback CRUD — Sovereign OS v8.1
 *
 * All reads/writes go to localStorage key "sovereign_feedback".
 */

import { KEYS } from "@/lib/keys";
import { getActiveWorkspaceId } from "@/lib/workspaces/activeWorkspace";
import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackConversionTarget,
} from "@/lib/types/feedback";

// ── Read ───────────────────────────────────────────────────────────────────

export function loadFeedback(): FeedbackItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.FEEDBACK);
    if (!raw) return [];
    return JSON.parse(raw) as FeedbackItem[];
  } catch {
    return [];
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

function persist(items: FeedbackItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ── Create ─────────────────────────────────────────────────────────────────

export function createFeedback(
  draft: Omit<FeedbackItem, "id" | "created_at" | "updated_at">
): FeedbackItem {
  const now = new Date().toISOString();
  const item: FeedbackItem = {
    ...draft,
    id:           crypto.randomUUID(),
    workspace_id: draft.workspace_id ?? getActiveWorkspaceId() ?? undefined,
    created_at:   now,
    updated_at:   now,
  };
  const all = loadFeedback();
  persist([item, ...all]);
  return item;
}

// ── Update ─────────────────────────────────────────────────────────────────

export function updateFeedback(
  id: string,
  patch: Partial<Omit<FeedbackItem, "id" | "created_at">>
): FeedbackItem | null {
  const all = loadFeedback();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;

  const updated: FeedbackItem = {
    ...all[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  all[idx] = updated;
  persist(all);
  return updated;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deleteFeedback(id: string): void {
  persist(loadFeedback().filter((f) => f.id !== id));
}

// ── Status helper ──────────────────────────────────────────────────────────

export function setFeedbackStatus(id: string, status: FeedbackStatus): FeedbackItem | null {
  return updateFeedback(id, { status });
}

// ── Convert ────────────────────────────────────────────────────────────────

export function markFeedbackConverted(
  id: string,
  target: FeedbackConversionTarget,
  target_id: string
): FeedbackItem | null {
  return updateFeedback(id, {
    status: "Completed",
    conversion: { target, target_id, converted_at: new Date().toISOString() },
  });
}
