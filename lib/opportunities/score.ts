/**
 * lib/opportunities/score.ts
 *
 * Opportunity scoring — Sovereign OS v5.1
 *
 * Scores an opportunity 0–100 based on:
 *   - Type weight (Revenue/Client highest)
 *   - Status momentum (Active > Reviewing > Detected)
 *   - Related context depth (people, projects, memories)
 *   - Description richness
 *   - Whether a next action is defined
 *   - Recency (recently updated = higher)
 */

import type { Opportunity, OpportunityType, OpportunityStatus } from "@/lib/types/opportunities";

// ── Type weights (max 35 pts) ──────────────────────────────────────────────

const TYPE_WEIGHTS: Record<OpportunityType, number> = {
  Revenue:     35,
  Client:      32,
  Partnership: 28,
  Product:     25,
  Content:     20,
  Event:       18,
  Education:   15,
  Personal:    12,
};

// ── Status momentum (max 20 pts) ───────────────────────────────────────────

const STATUS_WEIGHTS: Record<OpportunityStatus, number> = {
  Active:    20,
  Reviewing: 14,
  Detected:  10,
  Converted:  0,
  Archived:   0,
};

// ── Score a single opportunity ─────────────────────────────────────────────

export function scoreOpportunity(opp: Opportunity): { score: number; reasoning: string } {
  const parts: string[] = [];

  // Type weight (max 35)
  const typePts = TYPE_WEIGHTS[opp.type] ?? 15;
  parts.push(`${opp.type} type: ${typePts}pts`);

  // Status momentum (max 20)
  const statusPts = STATUS_WEIGHTS[opp.status] ?? 0;
  if (statusPts > 0) parts.push(`status ${opp.status}: ${statusPts}pts`);

  // Context depth (max 20): people + projects + memories
  const peoplePts  = Math.min(opp.related_people.length  * 4, 8);
  const projectPts = Math.min(opp.related_project_ids.length * 4, 8);
  const memoryPts  = Math.min(opp.related_memory_ids.length * 2, 4);
  const contextPts = peoplePts + projectPts + memoryPts;
  if (contextPts > 0) parts.push(`context depth: ${contextPts}pts`);

  // Description richness (max 10): >100 chars = 10, >40 = 6, else 3
  const descPts =
    opp.description.length > 100 ? 10 :
    opp.description.length > 40  ?  6 : 3;
  parts.push(`description: ${descPts}pts`);

  // Next action defined (max 10)
  const actionPts = opp.suggested_action.trim().length > 10 ? 10 : 0;
  if (actionPts > 0) parts.push(`action defined: ${actionPts}pts`);

  // Recency bonus (max 5): updated within last 7 days
  const daysSince = (Date.now() - new Date(opp.updated_at).getTime()) / 86_400_000;
  const recencyPts = daysSince <= 7 ? 5 : daysSince <= 30 ? 2 : 0;
  if (recencyPts > 0) parts.push(`recently updated: ${recencyPts}pts`);

  const raw   = typePts + statusPts + contextPts + descPts + actionPts + recencyPts;
  const score = Math.min(100, Math.max(0, raw));

  return { score, reasoning: parts.join("; ") };
}
