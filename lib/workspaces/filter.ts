/**
 * lib/workspaces/filter.ts — Sovereign OS v7.4
 *
 * Workspace-aware filtering for all data types.
 *
 * Rules:
 *  - activeWorkspaceId === "all"       → return everything (no filter)
 *  - activeWorkspaceId === "personal"  → return items where workspace_id is
 *    "personal" OR workspace_id is missing/undefined (legacy records)
 *  - any other workspace               → return items where workspace_id
 *    exactly matches activeWorkspaceId
 *
 * This is backwards-compatible: records created before v7.4 have no
 * workspace_id and are treated as belonging to the Personal workspace.
 */

type WithWorkspace = { workspace_id?: string };

export function filterByWorkspace<T extends WithWorkspace>(
  items: T[],
  activeWorkspaceId: string
): T[] {
  // "all" mode — show everything
  if (activeWorkspaceId === "all") return items;

  // Personal workspace — show items with matching id OR no id (legacy)
  if (activeWorkspaceId === "personal") {
    return items.filter(
      (item) => !item.workspace_id || item.workspace_id === "personal"
    );
  }

  // Named workspace — exact match only
  return items.filter((item) => item.workspace_id === activeWorkspaceId);
}
