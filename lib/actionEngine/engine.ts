/**
 * lib/actionEngine/engine.ts
 *
 * Action Engine — Sovereign OS v5.5
 *
 * Converts graph insights, opportunities, relationship signals, project state,
 * and content gaps into scored, concrete recommended actions.
 * Pure computation — no AI calls.
 */

import type { GraphInsight } from "@/lib/knowledgeGraph/engine";
import type { Opportunity } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { Project, ProjectTask } from "@/lib/types/projects";
import type { ContentItem } from "@/lib/types/content";
import { isFollowUpDue } from "@/lib/relationships/store";

// ── Types ──────────────────────────────────────────────────────────────────

export type ActionSourceType =
  | "graph_insight"
  | "opportunity"
  | "relationship"
  | "project"
  | "content"
  | "risk";

export type ActionPriority = "critical" | "high" | "medium" | "low";

export type ActionImpact = "transformative" | "high" | "medium" | "low";

export type ActionEffort = "15min" | "1hr" | "half-day" | "multi-day";

export interface Action {
  id:                string;
  title:             string;
  description:       string;
  reason:            string;
  sourceType:        ActionSourceType;
  priority:          ActionPriority;
  estimatedImpact:   ActionImpact;
  estimatedEffort:   ActionEffort;
  relatedEntityIds:  string[];         // prefixed: person_x, project_x, opp_x, etc.
  suggestedDueDate:  string;           // YYYY-MM-DD
  score:             number;           // 0–100
}

export interface ActionEngineResult {
  actions:             Action[];   // top 10, sorted by score
  urgentActions:       Action[];   // priority critical + overdue follow-ups
  strategicActions:    Action[];   // sourceType opportunity | project
  relationshipActions: Action[];   // sourceType relationship
  contentActions:      Action[];   // sourceType content
  generatedAt:         string;
}

// ── Input ──────────────────────────────────────────────────────────────────

export interface ActionInput {
  graphInsights:  GraphInsight[];
  opportunities:  Opportunity[];
  people:         Person[];
  projects:       Project[];
  projectTasks:   ProjectTask[];
  contentItems:   ContentItem[];
  todayStr:       string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueDateFromPriority(priority: ActionPriority, todayStr: string): string {
  const offsets: Record<ActionPriority, number> = {
    critical: 0,
    high:     2,
    medium:   7,
    low:      14,
  };
  return addDays(todayStr, offsets[priority]);
}

// ── Scoring ────────────────────────────────────────────────────────────────

const IMPACT_SCORES: Record<ActionImpact, number>  = { transformative: 100, high: 75, medium: 50, low: 25 };
const EFFORT_SCORES: Record<ActionEffort, number>  = { "15min": 100, "1hr": 75, "half-day": 50, "multi-day": 25 };
const PRIORITY_SCORES: Record<ActionPriority, number> = { critical: 100, high: 75, medium: 50, low: 25 };

function scoreAction(action: Omit<Action, "score">): number {
  const impact   = IMPACT_SCORES[action.estimatedImpact];
  const urgency  = PRIORITY_SCORES[action.priority];
  const effort   = EFFORT_SCORES[action.estimatedEffort];
  return Math.round(impact * 0.4 + urgency * 0.4 + effort * 0.2);
}

// ── Deduplication helper ───────────────────────────────────────────────────

function makeKey(sourceType: ActionSourceType, entityId: string): string {
  return `${sourceType}|${entityId}`;
}

// ── ID generators (match graph engine format) ──────────────────────────────

function pid(id: string):  string { return `person_${id}`; }
function pjid(id: string): string { return `project_${id}`; }
function oid(id: string):  string { return `opp_${id}`; }
function cid(id: string):  string { return `content_${id}`; }

// ── Action generators ──────────────────────────────────────────────────────

function actionsFromGraphInsights(
  insights: GraphInsight[],
  todayStr: string
): Array<Omit<Action, "score">> {
  const actions: Array<Omit<Action, "score">> = [];

  for (const insight of insights) {
    switch (insight.type) {

      case "orphaned_opportunity":
        actions.push({
          id:               `act_${insight.id}`,
          title:            insight.title,
          description:      insight.description,
          reason:           "Orphaned opportunities have no context — they stall without structure.",
          sourceType:       "graph_insight",
          priority:         insight.priority === "critical" ? "critical" : "high",
          estimatedImpact:  "high",
          estimatedEffort:  "15min",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("high", todayStr),
        });
        break;

      case "high_value_no_followup":
        actions.push({
          id:               `act_${insight.id}`,
          title:            insight.title,
          description:      insight.description,
          reason:           "High-priority contacts without a scheduled follow-up drift toward cold.",
          sourceType:       "relationship",
          priority:         insight.priority === "critical" ? "critical" : "high",
          estimatedImpact:  "high",
          estimatedEffort:  "15min",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("high", todayStr),
        });
        break;

      case "project_multi_opportunity":
        actions.push({
          id:               `act_${insight.id}`,
          title:            `Review pipeline: ${insight.title.replace("generating ", "")}`,
          description:      insight.description,
          reason:           "A project producing multiple opportunities is your highest-leverage initiative. Focus here first.",
          sourceType:       "opportunity",
          priority:         "high",
          estimatedImpact:  "transformative",
          estimatedEffort:  "1hr",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("high", todayStr),
        });
        break;

      case "content_from_shipped":
        actions.push({
          id:               `act_${insight.id}`,
          title:            insight.title,
          description:      insight.description,
          reason:           "Shipped work with no content is missed leverage — it already happened, just needs to be documented.",
          sourceType:       "content",
          priority:         "medium",
          estimatedImpact:  "medium",
          estimatedEffort:  "1hr",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("medium", todayStr),
        });
        break;

      case "relationship_leverage":
        actions.push({
          id:               `act_${insight.id}`,
          title:            `Reach out: ${insight.title.replace("Leverage gap: ", "")}`,
          description:      insight.description,
          reason:           "Relationships with multiple graph connections are compounding assets. Consistent contact unlocks them.",
          sourceType:       "relationship",
          priority:         insight.priority === "high" ? "high" : "medium",
          estimatedImpact:  "high",
          estimatedEffort:  "15min",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("high", todayStr),
        });
        break;

      case "isolated_memory":
        actions.push({
          id:               `act_${insight.id}`,
          title:            insight.title,
          description:      insight.description,
          reason:           "Important context that isn't linked can't be retrieved when it matters most.",
          sourceType:       "graph_insight",
          priority:         insight.priority === "high" ? "medium" : "low",
          estimatedImpact:  "medium",
          estimatedEffort:  "15min",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("medium", todayStr),
        });
        break;

      case "stalled_project_with_opps":
        actions.push({
          id:               `act_${insight.id}`,
          title:            `Unblock: ${insight.title.split('"')[1] ?? insight.title}`,
          description:      insight.description,
          reason:           "Stalled projects with linked opportunities are blocking multiple paths forward simultaneously.",
          sourceType:       "project",
          priority:         "high",
          estimatedImpact:  "transformative",
          estimatedEffort:  "15min",
          relatedEntityIds: insight.relatedNodeIds,
          suggestedDueDate: dueDateFromPriority("high", todayStr),
        });
        break;
    }
  }

  return actions;
}

function actionsFromOpportunities(
  opps: Opportunity[],
  todayStr: string
): Array<Omit<Action, "score">> {
  const actions: Array<Omit<Action, "score">> = [];

  for (const opp of opps) {
    if (opp.status === "Archived" || opp.status === "Converted") continue;

    if (opp.status === "Active" && opp.score >= 60) {
      actions.push({
        id:               `act_opp_advance_${opp.id}`,
        title:            `Advance: "${opp.title}"`,
        description:      opp.suggested_action || opp.description,
        reason:           `Score ${opp.score}/100 — this opportunity is active and high-scoring. Momentum matters here.`,
        sourceType:       "opportunity",
        priority:         opp.score >= 80 ? "critical" : "high",
        estimatedImpact:  "transformative",
        estimatedEffort:  "1hr",
        relatedEntityIds: [oid(opp.id), ...(opp.related_project_ids ?? []).map(pjid)],
        suggestedDueDate: dueDateFromPriority("high", todayStr),
      });
    }

    if (opp.status === "Reviewing") {
      // Check if reviewing for too long (created > 7 days ago)
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(opp.created_at).getTime()) / 86_400_000
      );
      if (daysSinceCreated >= 7 || opp.score >= 40) {
        actions.push({
          id:               `act_opp_decide_${opp.id}`,
          title:            `Decide on: "${opp.title}"`,
          description:      `This opportunity has been in "Reviewing" for ${daysSinceCreated} days. Make a call: pursue it or archive it.`,
          reason:           "Indecision is a decision. Reviewing forever creates cognitive overhead without returns.",
          sourceType:       "opportunity",
          priority:         "medium",
          estimatedImpact:  "high",
          estimatedEffort:  "15min",
          relatedEntityIds: [oid(opp.id)],
          suggestedDueDate: dueDateFromPriority("medium", todayStr),
        });
      }
    }
  }

  return actions;
}

function actionsFromRelationships(
  people: Person[],
  todayStr: string
): Array<Omit<Action, "score">> {
  const actions: Array<Omit<Action, "score">> = [];

  const overduePeople = people
    .filter((p) => p.status !== "Archived" && isFollowUpDue(p, todayStr))
    .sort((a, b) => {
      const priorityRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
    });

  for (const person of overduePeople.slice(0, 5)) {
    const priority: ActionPriority =
      person.priority === "Critical" ? "critical" :
      person.priority === "High"     ? "high"     :
      "medium";

    actions.push({
      id:               `act_followup_${person.id}`,
      title:            `Follow up with ${person.name}`,
      description:      `Follow-up was due ${person.next_follow_up_at}. ${person.organization ? `(${person.organization})` : ""} ${person.role ? `— ${person.role}` : ""}`.trim(),
      reason:           `${person.relationship_type} relationship, ${person.priority} priority. Overdue follow-up erodes trust.`,
      sourceType:       "relationship",
      priority,
      estimatedImpact:  person.priority === "Critical" ? "transformative" : "high",
      estimatedEffort:  "15min",
      relatedEntityIds: [pid(person.id)],
      suggestedDueDate: todayStr,
    });
  }

  return actions;
}

function actionsFromProjects(
  projects: Project[],
  tasks: ProjectTask[],
  todayStr: string
): Array<Omit<Action, "score">> {
  const actions: Array<Omit<Action, "score">> = [];
  const today = new Date(todayStr + "T00:00:00");

  // Critical overdue tasks
  const criticalOverdue = tasks.filter(
    (t) => t.status !== "Done" && t.due_date &&
    new Date(t.due_date + "T00:00:00") < today &&
    t.priority === "Critical"
  );
  for (const task of criticalOverdue.slice(0, 3)) {
    const proj = projects.find((p) => p.id === task.project_id);
    const daysOverdue = Math.floor((Date.now() - new Date(task.due_date + "T00:00:00").getTime()) / 86_400_000);
    actions.push({
      id:               `act_task_${task.id}`,
      title:            `Clear: "${task.title}"`,
      description:      `Critical task overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}${proj ? ` — ${proj.title}` : ""}.`,
      reason:           "Critical overdue tasks compound drag on every metric. Clearing one restores momentum.",
      sourceType:       "risk",
      priority:         "critical",
      estimatedImpact:  "high",
      estimatedEffort:  "1hr",
      relatedEntityIds: [task.project_id ? pjid(task.project_id) : `task_${task.id}`],
      suggestedDueDate: todayStr,
    });
  }

  // Paused projects
  const paused = projects.filter((p) => p.status === "Paused");
  for (const proj of paused.slice(0, 2)) {
    actions.push({
      id:               `act_unblock_${proj.id}`,
      title:            `Unblock: "${proj.title}"`,
      description:      `"${proj.title}" is paused. Define what needs to happen to reactivate it.`,
      reason:           "Paused projects with no reactivation plan become zombie work — consuming mental energy while delivering nothing.",
      sourceType:       "project",
      priority:         proj.priority === "Critical" ? "high" : "medium",
      estimatedImpact:  "high",
      estimatedEffort:  "15min",
      relatedEntityIds: [pjid(proj.id)],
      suggestedDueDate: dueDateFromPriority("medium", todayStr),
    });
  }

  // Active projects with no open tasks
  const activeWithNoTasks = projects.filter((p) => {
    if (p.status !== "Active") return false;
    const openTasks = tasks.filter((t) => t.project_id === p.id && t.status !== "Done");
    return openTasks.length === 0;
  });
  for (const proj of activeWithNoTasks.slice(0, 2)) {
    actions.push({
      id:               `act_notasks_${proj.id}`,
      title:            `Add next action: "${proj.title}"`,
      description:      `"${proj.title}" is Active but has no open tasks. Projects without tasks don't move.`,
      reason:           "Active projects need open tasks to generate momentum and occupy focus sessions.",
      sourceType:       "project",
      priority:         proj.priority === "Critical" || proj.priority === "High" ? "high" : "medium",
      estimatedImpact:  "medium",
      estimatedEffort:  "15min",
      relatedEntityIds: [pjid(proj.id)],
      suggestedDueDate: dueDateFromPriority("medium", todayStr),
    });
  }

  return actions;
}

function actionsFromContent(
  contentItems: ContentItem[],
  projects: Project[],
  todayStr: string
): Array<Omit<Action, "score">> {
  const actions: Array<Omit<Action, "score">> = [];

  // Ready content sitting idle > 5 days
  const staleReady = contentItems.filter((c) => {
    if (c.status !== "Ready") return false;
    const daysSince = Math.floor(
      (Date.now() - new Date(c.updated_at).getTime()) / 86_400_000
    );
    return daysSince >= 5;
  });
  for (const item of staleReady.slice(0, 2)) {
    const daysSince = Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86_400_000);
    actions.push({
      id:               `act_publish_${item.id}`,
      title:            `Publish: "${item.title}"`,
      description:      `This ${item.format} has been Ready for ${daysSince} days. Publish it now.`,
      reason:           `Ready content that sits decays in relevance. Publishing now is maximum return for zero additional work.`,
      sourceType:       "content",
      priority:         item.priority === "Critical" ? "critical" : item.priority === "High" ? "high" : "medium",
      estimatedImpact:  "high",
      estimatedEffort:  "15min",
      relatedEntityIds: [cid(item.id), ...(item.related_project_id ? [pjid(item.related_project_id)] : [])],
      suggestedDueDate: todayStr,
    });
  }

  // High-priority drafts
  const highDrafts = contentItems.filter(
    (c) => c.status === "Drafting" && (c.priority === "High" || c.priority === "Critical")
  );
  for (const item of highDrafts.slice(0, 2)) {
    actions.push({
      id:               `act_draft_${item.id}`,
      title:            `Complete draft: "${item.title}"`,
      description:      `High-priority ${item.format} in Drafting. Finishing it moves it to Ready.`,
      reason:           "High-priority drafts sitting unfinished block your content pipeline momentum.",
      sourceType:       "content",
      priority:         item.priority === "Critical" ? "high" : "medium",
      estimatedImpact:  "medium",
      estimatedEffort:  "half-day",
      relatedEntityIds: [cid(item.id), ...(item.related_project_id ? [pjid(item.related_project_id)] : [])],
      suggestedDueDate: dueDateFromPriority("medium", todayStr),
    });
  }

  // Shipped projects with no content
  const contentProjectIds = new Set(contentItems.filter((c) => c.status !== "Archived").map((c) => c.related_project_id).filter(Boolean));
  const shippedNoContent  = projects.filter((p) => p.status === "Shipped" && !contentProjectIds.has(p.id));
  for (const proj of shippedNoContent.slice(0, 2)) {
    actions.push({
      id:               `act_content_${proj.id}`,
      title:            `Document: "${proj.title}"`,
      description:      `"${proj.title}" shipped but has no content piece. Turn the work into a post, case study, or breakdown.`,
      reason:           "Shipped work is social proof you're not using. One post creates compounding authority.",
      sourceType:       "content",
      priority:         "medium",
      estimatedImpact:  "medium",
      estimatedEffort:  "1hr",
      relatedEntityIds: [pjid(proj.id)],
      suggestedDueDate: dueDateFromPriority("medium", todayStr),
    });
  }

  return actions;
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeActionEngine(input: ActionInput): ActionEngineResult {
  const {
    graphInsights, opportunities, people,
    projects, projectTasks, contentItems, todayStr,
  } = input;

  const seen = new Set<string>();

  function dedup<T extends { id: string; relatedEntityIds: string[]; sourceType: ActionSourceType }>(
    raw: T[]
  ): T[] {
    return raw.filter((a) => {
      const key = makeKey(a.sourceType, a.relatedEntityIds[0] ?? a.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Generate from all sources
  const rawGraphActions  = actionsFromGraphInsights(graphInsights, todayStr);
  const rawOppActions    = actionsFromOpportunities(opportunities, todayStr);
  const rawRelActions    = actionsFromRelationships(people, todayStr);
  const rawProjActions   = actionsFromProjects(projects, projectTasks, todayStr);
  const rawContentActions = actionsFromContent(contentItems, projects, todayStr);

  // Score and deduplicate all actions
  const scoreAndBuild = (raw: Array<Omit<Action, "score">>): Action[] =>
    dedup(raw).map((a) => ({ ...a, score: scoreAction(a) }));

  const allRaw: Array<Omit<Action, "score">> = [
    ...rawGraphActions,
    ...rawOppActions,
    ...rawRelActions,
    ...rawProjActions,
    ...rawContentActions,
  ];

  // Score, deduplicate, sort
  const seenForAll = new Set<string>();
  const allScored: Action[] = allRaw
    .filter((a) => {
      const key = makeKey(a.sourceType, a.relatedEntityIds[0] ?? a.id);
      if (seenForAll.has(key)) return false;
      seenForAll.add(key);
      return true;
    })
    .map((a) => ({ ...a, score: scoreAction(a) }))
    .sort((a, b) => b.score - a.score);

  const PRIORITY_RANK: Record<ActionPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  const top10 = allScored.slice(0, 10);

  const urgentActions       = top10.filter((a) => a.priority === "critical" || (a.priority === "high" && a.sourceType !== "content"));
  const strategicActions    = top10.filter((a) => a.sourceType === "opportunity" || a.sourceType === "project" || a.sourceType === "graph_insight");
  const relationshipActions = top10.filter((a) => a.sourceType === "relationship");
  const contentActions      = top10.filter((a) => a.sourceType === "content");

  // Re-sort each bucket by priority then score
  const sortBucket = (bucket: Action[]): Action[] =>
    [...bucket].sort((a, b) => {
      const pdiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return pdiff !== 0 ? pdiff : b.score - a.score;
    });

  void scoreAndBuild; // suppress unused warning — used inline above

  return {
    actions:             top10,
    urgentActions:       sortBucket(urgentActions),
    strategicActions:    sortBucket(strategicActions),
    relationshipActions: sortBucket(relationshipActions),
    contentActions:      sortBucket(contentActions),
    generatedAt:         new Date().toISOString(),
  };
}
