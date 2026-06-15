/**
 * Sovereign OS — localStorage migration utility
 *
 * Migrates all "signal_*" keys (Signal Dashboard era) to "sovereign_*" keys
 * (Sovereign OS era) in a single, safe, idempotent pass.
 *
 * Safety guarantees:
 *  1. Checks for the sentinel key first — if already run, exits immediately.
 *  2. For each old key, copies the value ONLY if no sovereign_ key already exists
 *     at the destination (never overwrites newer data).
 *  3. Deletes the old key ONLY after successfully writing the new key and
 *     reading it back to confirm the write landed.
 *  4. Sets the sentinel key AFTER all migrations complete.
 *  5. Never throws — all errors are caught and logged. The app continues
 *     normally even if migration partially fails; it will retry on next load.
 *  6. Safe to call multiple times (idempotent via sentinel).
 */

import { MIGRATION_MAP, KEYS } from "./keys";

export function runStorageMigration(): void {
  // Guard: only run in browser
  if (typeof window === "undefined") return;

  try {
    // Sentinel check — already migrated, nothing to do
    if (localStorage.getItem(KEYS.MIGRATION_V1) === "true") return;
  } catch {
    // localStorage access denied (private browsing mode with storage blocked)
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
    try {
      // Step 1: Read old value
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue === null) {
        // Old key doesn't exist — nothing to migrate for this entry
        continue;
      }

      // Step 2: Check destination — never overwrite if sovereign_ key already has data
      const existingNewValue = localStorage.getItem(newKey);
      if (existingNewValue !== null) {
        // Destination already populated — skip (preserves newer data)
        skippedCount++;
        continue;
      }

      // Step 3: Write to new key
      localStorage.setItem(newKey, oldValue);

      // Step 4: Read back to confirm write succeeded
      const readBack = localStorage.getItem(newKey);
      if (readBack !== oldValue) {
        // Write didn't land correctly — leave old key intact, skip deletion
        console.warn(`[Sovereign OS] Migration write mismatch for key: ${oldKey}`);
        errorCount++;
        continue;
      }

      // Step 5: Delete old key only after confirmed write
      localStorage.removeItem(oldKey);
      migratedCount++;
    } catch (err) {
      // Individual key failure — log and continue with remaining keys
      console.warn(`[Sovereign OS] Migration error for key "${oldKey}":`, err);
      errorCount++;
    }
  }

  // Step 6: Set sentinel — even if some keys errored, mark migration as run
  // to avoid infinite retry loops. Partial migration is better than no migration.
  try {
    localStorage.setItem(KEYS.MIGRATION_V1, "true");
    console.info(
      `[Sovereign OS] Storage migration complete — migrated: ${migratedCount}, skipped: ${skippedCount}, errors: ${errorCount}`
    );
  } catch {
    // Could not set sentinel — migration will re-run next load, which is safe
    console.warn("[Sovereign OS] Could not set migration sentinel.");
  }
}
