/**
 * lib/demo/demoMode.ts — Sovereign OS v7.2
 *
 * Demo mode mechanics.
 *
 * Strategy: backup-and-swap.
 *   enterDemoMode()  — backs up real data for 5 keys → injects demo data
 *   exitDemoMode()   — restores real data from backup → clears demo flag
 *   resetDemoData()  — re-injects demo data (backup unchanged)
 *   isDemoMode()     — reads the flag
 *
 * The backup is a single JSON object at KEYS.DEMO_BACKUP:
 *   { "sovereign_projects": "<raw localStorage string>", ... }
 *
 * "Raw localStorage string" = exactly what localStorage.getItem() returns,
 * so we never double-serialize. If a key was absent, its backup value is null.
 *
 * SAFETY: Real data is never lost as long as the backup key is present.
 * exitDemoMode() always restores before clearing the backup.
 */

import { KEYS } from "@/lib/keys";
import {
  DEMO_PROJECTS,
  DEMO_PROJECT_TASKS,
  DEMO_MEMORY_ITEMS,
  DEMO_RELATIONSHIPS,
  DEMO_OPPORTUNITIES,
  DEMO_TASKS,
} from "./data";

// Keys whose content is swapped during demo mode
const SWAPPED_KEYS = [
  KEYS.PROJECTS,
  KEYS.PROJECT_TASKS,
  KEYS.MEMORY_ITEMS,
  KEYS.RELATIONSHIPS,
  KEYS.OPPORTUNITIES,
  KEYS.TASKS,
] as const;

type BackupMap = Record<string, string | null>;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch { /* noop */ }
}

function writeDemo(): void {
  safeSet(KEYS.PROJECTS,      JSON.stringify(DEMO_PROJECTS));
  safeSet(KEYS.PROJECT_TASKS, JSON.stringify(DEMO_PROJECT_TASKS));
  safeSet(KEYS.MEMORY_ITEMS,  JSON.stringify(DEMO_MEMORY_ITEMS));
  safeSet(KEYS.RELATIONSHIPS, JSON.stringify(DEMO_RELATIONSHIPS));
  safeSet(KEYS.OPPORTUNITIES, JSON.stringify(DEMO_OPPORTUNITIES));
  safeSet(KEYS.TASKS,         JSON.stringify(DEMO_TASKS));
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEYS.DEMO_MODE);
    return raw === "true" || raw === JSON.stringify(true);
  } catch { return false; }
}

export function enterDemoMode(): void {
  if (typeof window === "undefined") return;

  // Only backup if no backup already exists (prevents double-backup)
  const existingBackup = safeGet(KEYS.DEMO_BACKUP);
  if (!existingBackup) {
    const backup: BackupMap = {};
    for (const key of SWAPPED_KEYS) {
      backup[key] = safeGet(key);
    }
    safeSet(KEYS.DEMO_BACKUP, JSON.stringify(backup));
  }

  writeDemo();
  safeSet(KEYS.DEMO_MODE, "true");
}

export function exitDemoMode(): void {
  if (typeof window === "undefined") return;

  const backupRaw = safeGet(KEYS.DEMO_BACKUP);
  if (backupRaw) {
    try {
      const backup = JSON.parse(backupRaw) as BackupMap;
      for (const key of SWAPPED_KEYS) {
        safeSet(key, backup[key] ?? null);
      }
    } catch { /* backup corrupted — leave as-is */ }
  }

  safeSet(KEYS.DEMO_MODE, null);
  safeSet(KEYS.DEMO_BACKUP, null);
}

export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  // Re-inject demo data. Backup is untouched — real data is still safe.
  writeDemo();
}
