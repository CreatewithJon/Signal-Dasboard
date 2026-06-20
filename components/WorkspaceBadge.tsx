"use client";

/**
 * components/WorkspaceBadge.tsx — Sovereign OS v7.4
 *
 * Compact badge showing workspace color + name.
 * Reads workspace list from localStorage on mount.
 *
 * Renders nothing if:
 *  - workspace_id is absent (legacy item — belongs to Personal, no badge needed)
 *  - workspace_id === "personal" (default — badge is optional, hidden by default)
 *  - workspace not found in localStorage
 *
 * Usage:
 *   <WorkspaceBadge workspaceId={item.workspace_id} />
 *   <WorkspaceBadge workspaceId={item.workspace_id} showPersonal />
 */

import { useState, useEffect } from "react";
import { KEYS } from "@/lib/keys";
import { DEFAULT_WORKSPACE } from "@/lib/types/workspace";
import type { Workspace } from "@/lib/types/workspace";

interface Props {
  workspaceId?: string;
  showPersonal?: boolean; // if true, also renders badge for Personal workspace
}

export default function WorkspaceBadge({ workspaceId, showPersonal = false }: Props) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    if (workspaceId === "personal" && !showPersonal) return;

    try {
      const raw = localStorage.getItem(KEYS.WORKSPACES);
      const all: Workspace[] = raw ? (JSON.parse(raw) as Workspace[]) : [DEFAULT_WORKSPACE];
      const found = all.find((w) => w.id === workspaceId);
      setWorkspace(found ?? null);
    } catch {
      setWorkspace(null);
    }
  }, [workspaceId, showPersonal]);

  if (!workspace) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
      style={{
        background: `${workspace.color}14`,
        border: `1px solid ${workspace.color}30`,
        color: `${workspace.color}cc`,
      }}
      title={`Workspace: ${workspace.name}`}
    >
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ background: workspace.color }}
      />
      {workspace.name}
    </span>
  );
}
