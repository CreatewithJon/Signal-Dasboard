/**
 * lib/supabase/readMode.ts
 *
 * Read Mode Configuration — Sovereign OS v4.8
 *
 * Allows authenticated users to opt into Supabase as the read source for
 * selected modules. All modules default to "local" — nothing changes without
 * explicit user action.
 *
 * Safety:
 *   - Defaults all modules to "local".
 *   - Supabase read is opt-in, reversible from Settings.
 *   - localStorage is always the fallback — never deleted or overwritten during reads.
 *   - Never auto-enabled.
 *   - If Supabase fails, repositories silently fall back to localStorage.
 */

import { KEYS } from "@/lib/keys";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReadModeModule =
  | "memory"
  | "projects"
  | "projectTasks"
  | "content"
  | "focusSessions";

export type ReadModeValue = "local" | "supabase";

export interface ReadModeConfig {
  memory:        ReadModeValue;
  projects:      ReadModeValue;
  projectTasks:  ReadModeValue;
  content:       ReadModeValue;
  focusSessions: ReadModeValue;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ReadModeConfig = {
  memory:        "local",
  projects:      "local",
  projectTasks:  "local",
  content:       "local",
  focusSessions: "local",
};

// ── Accessors ──────────────────────────────────────────────────────────────

/**
 * getReadModeConfig
 * Reads the current config from localStorage.
 * Merges with defaults so new keys introduced in future versions are always
 * present. Safe to call from server context (returns defaults).
 */
export function getReadModeConfig(): ReadModeConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(KEYS.READ_MODE_CONFIG);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ReadModeConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * setReadMode
 * Persists a read mode change for a single module.
 */
export function setReadMode(module: ReadModeModule, mode: ReadModeValue): void {
  if (typeof window === "undefined") return;
  const config = getReadModeConfig();
  config[module] = mode;
  localStorage.setItem(KEYS.READ_MODE_CONFIG, JSON.stringify(config));
}

/**
 * isSupabaseReadEnabled
 * Sync check used by repositories to decide read source.
 */
export function isSupabaseReadEnabled(module: ReadModeModule): boolean {
  return getReadModeConfig()[module] === "supabase";
}

/**
 * resetReadModeToLocal
 * Resets all modules to "local". Used by the Reset button in Settings.
 */
export function resetReadModeToLocal(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.READ_MODE_CONFIG, JSON.stringify(DEFAULT_CONFIG));
}
