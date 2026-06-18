/**
 * lib/opportunities/store.ts
 *
 * Opportunity CRUD — Sovereign OS v5.1
 *
 * All reads/writes go to localStorage key "sovereign_opportunities".
 * Scoring is recomputed on every save.
 */

import { KEYS } from "@/lib/keys";
import type { Opportunity, OpportunityStatus, OpportunityConversionTarget } from "@/lib/types/opportunities";
import { scoreOpportunity } from "@/lib/opportunities/score";

// ── Read ───────────────────────────────────────────────────────────────────

export function loadOpportunities(): Opportunity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.OPPORTUNITIES);
    if (!raw) return [];
    return JSON.parse(raw) as Opportunity[];
  } catch {
    return [];
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

function persist(items: Opportunity[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.OPPORTUNITIES, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ── Create ─────────────────────────────────────────────────────────────────

export function createOpportunity(
  draft: Omit<Opportunity, "id" | "score" | "score_reasoning" | "created_at" | "updated_at">
): Opportunity {
  const now = new Date().toISOString();
  const opp: Opportunity = {
    ...draft,
    id:              crypto.randomUUID(),
    score:           0,
    score_reasoning: "",
    created_at:      now,
    updated_at:      now,
  };
  const { score, reasoning } = scoreOpportunity(opp);
  opp.score           = score;
  opp.score_reasoning = reasoning;

  const all = loadOpportunities();
  persist([opp, ...all]);
  return opp;
}

// ── Update ─────────────────────────────────────────────────────────────────

export function updateOpportunity(
  id: string,
  patch: Partial<Omit<Opportunity, "id" | "created_at">>
): Opportunity | null {
  const all = loadOpportunities();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  const updated: Opportunity = {
    ...all[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { score, reasoning } = scoreOpportunity(updated);
  updated.score           = score;
  updated.score_reasoning = reasoning;

  all[idx] = updated;
  persist(all);
  return updated;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deleteOpportunity(id: string): void {
  persist(loadOpportunities().filter((o) => o.id !== id));
}

// ── Status helpers ─────────────────────────────────────────────────────────

export function setOpportunityStatus(id: string, status: OpportunityStatus): Opportunity | null {
  return updateOpportunity(id, { status });
}

// ── Convert ────────────────────────────────────────────────────────────────

export function markConverted(
  id: string,
  target: OpportunityConversionTarget,
  target_id: string
): Opportunity | null {
  return updateOpportunity(id, {
    status: "Converted",
    conversion: { target, target_id, converted_at: new Date().toISOString() },
  });
}
