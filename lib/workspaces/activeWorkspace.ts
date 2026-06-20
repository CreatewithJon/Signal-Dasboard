/**
 * lib/workspaces/activeWorkspace.ts — Sovereign OS v7.4
 *
 * Helpers for reading/writing the active workspace ID.
 *
 * Rules:
 *  - Never returns null. Falls back to "personal" if nothing is stored.
 *  - "all" is a valid active workspace ID (means "show everything").
 *  - "personal" is the default / Personal workspace ID.
 *  - These functions are safe to call during SSR (window guard included).
 */

import { KEYS } from "@/lib/keys";

const DEFAULT_ID = "personal";

export function getDefaultWorkspaceId(): string {
  return DEFAULT_ID;
}

export function getActiveWorkspaceId(): string {
  if (typeof window === "undefined") return DEFAULT_ID;
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_WORKSPACE_ID);
    if (!raw) return DEFAULT_ID;
    const parsed = JSON.parse(raw) as string;
    return parsed || DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function setActiveWorkspaceId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.ACTIVE_WORKSPACE_ID, JSON.stringify(id));
  } catch { /* noop */ }
}
