/**
 * lib/knowledgeGraph/engine.ts
 *
 * Knowledge Graph Engine — Sovereign OS v5.4
 *
 * Builds a deterministic relationship graph from all stored entities.
 * No embeddings — pure ID/name/tag matching.
 *
 * Entities: Person · Project · Opportunity · ContentItem · MemoryItem
 * Edges: related_to · supports · created_from · referenced_by · connected_to
 */

import type { Person } from "@/lib/types/relationships";
import type { Project } from "@/lib/types/projects";
import type { Opportunity } from "@/lib/types/opportunities";
import type { ContentItem } from "@/lib/types/content";
import type { MemoryItem } from "@/lib/types/memory";
import { safeStringArray } from "@/lib/utils/arrays";

// ── Types ──────────────────────────────────────────────────────────────────

export type NodeType = "Person" | "Project" | "Opportunity" | "Content" | "Memory";

export type EdgeType =
  | "related_to"
  | "supports"
  | "created_from"
  | "referenced_by"
  | "connected_to";

export interface GraphNode {
  id:     string;
  type:   NodeType;
  label:  string;
  meta:   Record<string, string>;
  weight: number; // populated after edges are built
}

export interface GraphEdge {
  source: string; // node id
  target: string; // node id
  type:   EdgeType;
  reason: string;
}

export interface GraphCluster {
  id:      string;
  label:   string;
  nodeIds: string[];
  summary: string;
}

export type InsightType =
  | "orphaned_opportunity"
  | "high_value_no_followup"
  | "project_multi_opportunity"
  | "content_from_shipped"
  | "relationship_leverage"
  | "isolated_memory"
  | "stalled_project_with_opps";

export type InsightPriority = "critical" | "high" | "medium";

export interface GraphInsight {
  id:             string;
  type:           InsightType;
  title:          string;
  description:    string;
  relatedNodeIds: string[];
  priority:       InsightPriority;
  action:         string;
}

export interface GraphStats {
  totalNodes:    number;
  totalEdges:    number;
  totalClusters: number;
  densityScore:  number; // avg edges per node, rounded to 1 decimal
  isolatedNodes: number; // nodes with no edges
}

export interface KnowledgeGraph {
  nodes:       GraphNode[];
  edges:       GraphEdge[];
  clusters:    GraphCluster[];
  insights:    GraphInsight[];
  stats:       GraphStats;
  generatedAt: string;
}

// ── Input ──────────────────────────────────────────────────────────────────

export interface GraphInput {
  people:       Person[];
  projects:     Project[];
  opportunities: Opportunity[];
  contentItems: ContentItem[];
  memoryItems:  MemoryItem[];
}

// ── ID helpers ─────────────────────────────────────────────────────────────

function pid(id: string):  string { return `person_${id}`; }
function pjid(id: string): string { return `project_${id}`; }
function oid(id: string):  string { return `opp_${id}`; }
function cid(id: string):  string { return `content_${id}`; }
function mid(id: string):  string { return `memory_${id}`; }

// ── Edge deduplication ─────────────────────────────────────────────────────

function edgeKey(source: string, target: string, type: EdgeType): string {
  // Canonical: sort source/target so A→B and B→A (same type) deduplicate
  const [a, b] = source < target ? [source, target] : [target, source];
  return `${a}|${b}|${type}`;
}

// ── Node construction ──────────────────────────────────────────────────────

function buildNodes(input: GraphInput): GraphNode[] {
  const nodes: GraphNode[] = [];

  for (const p of input.people) {
    if (p.status === "Archived") continue;
    nodes.push({
      id:     pid(p.id),
      type:   "Person",
      label:  p.name,
      meta: {
        type:     p.relationship_type,
        status:   p.status,
        priority: p.priority,
        org:      p.organization ?? "",
        role:     p.role ?? "",
      },
      weight: 0,
    });
  }

  for (const p of input.projects) {
    if (p.status === "Archived") continue;
    nodes.push({
      id:     pjid(p.id),
      type:   "Project",
      label:  p.title,
      meta: {
        status:   p.status,
        priority: p.priority,
        category: p.category,
      },
      weight: 0,
    });
  }

  for (const o of input.opportunities) {
    if (o.status === "Archived" || o.status === "Converted") continue;
    nodes.push({
      id:     oid(o.id),
      type:   "Opportunity",
      label:  o.title,
      meta: {
        type:   o.type,
        status: o.status,
        score:  String(o.score),
      },
      weight: 0,
    });
  }

  for (const c of input.contentItems) {
    if (c.status === "Archived") continue;
    nodes.push({
      id:     cid(c.id),
      type:   "Content",
      label:  c.title,
      meta: {
        status:   c.status,
        format:   c.format,
        priority: c.priority,
      },
      weight: 0,
    });
  }

  for (const m of input.memoryItems) {
    nodes.push({
      id:     mid(m.id),
      type:   "Memory",
      label:  m.title,
      meta: {
        type:       m.type,
        importance: m.importance,
        source:     m.source,
      },
      weight: 0,
    });
  }

  return nodes;
}

// ── Edge construction ──────────────────────────────────────────────────────

function buildEdges(input: GraphInput, nodeIds: Set<string>): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  function addEdge(source: string, target: string, type: EdgeType, reason: string) {
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    if (source === target) return;
    const key = edgeKey(source, target, type);
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target, type, reason });
  }

  // ── Person → Project ───────────────────────────────────────────────────
  for (const person of input.people) {
    if (person.status === "Archived") continue;
    for (const projId of (person.related_project_ids ?? [])) {
      addEdge(pid(person.id), pjid(projId), "related_to",
        `${person.name} is linked to this project`);
    }
    for (const oppId of (person.related_opportunity_ids ?? [])) {
      addEdge(pid(person.id), oid(oppId), "supports",
        `${person.name} is associated with this opportunity`);
    }
    for (const memId of (person.related_memory_ids ?? [])) {
      addEdge(pid(person.id), mid(memId), "referenced_by",
        `${person.name} is referenced in this memory`);
    }
  }

  // ── Opportunity → Project / Memory / People (by name) ─────────────────
  // Build name → person ID lookup
  const personByName = new Map<string, string>();
  for (const p of input.people) {
    if (p.status !== "Archived") {
      personByName.set(p.name.toLowerCase(), pid(p.id));
    }
  }

  for (const opp of input.opportunities) {
    if (opp.status === "Archived" || opp.status === "Converted") continue;
    for (const projId of (opp.related_project_ids ?? [])) {
      addEdge(oid(opp.id), pjid(projId), "supports",
        `Opportunity supports this project`);
    }
    for (const memId of (opp.related_memory_ids ?? [])) {
      addEdge(oid(opp.id), mid(memId), "referenced_by",
        `Opportunity is grounded in this memory`);
    }
    for (const name of (opp.related_people ?? [])) {
      const personNodeId = personByName.get(name.toLowerCase());
      if (personNodeId) {
        addEdge(oid(opp.id), personNodeId, "connected_to",
          `${name} is named in this opportunity`);
      }
    }
  }

  // ── ContentItem → Project ──────────────────────────────────────────────
  for (const item of input.contentItems) {
    if (item.status === "Archived" || !item.related_project_id) continue;
    addEdge(cid(item.id), pjid(item.related_project_id), "created_from",
      `Content piece was created from this project`);
  }

  // ── Memory → Project / People (by name) ───────────────────────────────
  for (const mem of input.memoryItems) {
    for (const projId of (mem.relatedProjectIds ?? [])) {
      addEdge(mid(mem.id), pjid(projId), "referenced_by",
        `Memory references this project`);
    }
    for (const name of (mem.relatedPeople ?? [])) {
      const personNodeId = personByName.get(name.toLowerCase());
      if (personNodeId) {
        addEdge(mid(mem.id), personNodeId, "referenced_by",
          `Memory references ${name}`);
      }
    }
  }

  // ── Shared tags — Person ↔ Content, Person ↔ Opportunity ──────────────
  // Only connect when there is at least one shared tag (and both have tags)
  const personTags = new Map<string, string[]>();
  for (const p of input.people) {
    if (p.status !== "Archived" && (p.tags ?? []).length > 0) {
      personTags.set(pid(p.id), (p.tags ?? []).map((t) => t.toLowerCase()));
    }
  }

  // Person ↔ Memory by shared tags
  for (const mem of input.memoryItems) {
    if ((mem.tags ?? []).length === 0) continue;
    const memTagSet = new Set((mem.tags ?? []).map((t) => t.toLowerCase()));
    for (const [personNodeId, pTags] of personTags) {
      const shared = pTags.filter((t) => memTagSet.has(t));
      if (shared.length >= 2) {
        addEdge(mid(mem.id), personNodeId, "connected_to",
          `Shared tags: ${shared.slice(0, 2).join(", ")}`);
      }
    }
  }

  // Content ↔ Memory by shared tags (2+ shared tags)
  const memTagsList: { id: string; tags: string[] }[] = input.memoryItems
    .filter((m) => safeStringArray(m.tags).length > 0)
    .map((m) => ({ id: mid(m.id), tags: safeStringArray(m.tags).map((t) => t.toLowerCase()) }));

  for (const item of input.contentItems) {
    if (item.status === "Archived" || item.status === "Published") continue;
    // ContentItem doesn't have a tags field; skip tag-based content edges
  }
  void memTagsList; // suppress unused warning — reserved for future tag expansion

  return edges;
}

// ── Weight computation ─────────────────────────────────────────────────────

function computeWeights(nodes: GraphNode[], edges: GraphEdge[]): void {
  const weightMap = new Map<string, number>();
  for (const edge of edges) {
    weightMap.set(edge.source, (weightMap.get(edge.source) ?? 0) + 1);
    weightMap.set(edge.target, (weightMap.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    node.weight = weightMap.get(node.id) ?? 0;
  }
}

// ── Cluster construction ───────────────────────────────────────────────────

function buildClusters(nodes: GraphNode[], edges: GraphEdge[]): GraphCluster[] {
  // Build adjacency map
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) adj.set(node.id, new Set());
  for (const edge of edges) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  // BFS connected components
  const visited  = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      component.push(id);
      for (const neighbor of adj.get(id) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return components
    .filter((c) => c.length >= 3)
    .sort((a, b) => b.length - a.length) // largest first
    .slice(0, 8)
    .map((ids, i) => {
      const members = ids.map((id) => nodeMap.get(id)).filter(Boolean) as GraphNode[];
      // Anchor = highest-weight node
      const anchor = [...members].sort((a, b) => b.weight - a.weight)[0];

      const typeCount: Partial<Record<NodeType, number>> = {};
      for (const n of members) {
        typeCount[n.type] = (typeCount[n.type] ?? 0) + 1;
      }
      const summary = (Object.entries(typeCount) as [NodeType, number][])
        .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
        .join(" · ");

      return {
        id:      `cluster_${i}`,
        label:   anchor?.label ?? `Network ${i + 1}`,
        nodeIds: ids,
        summary,
      };
    });
}

// ── Insights engine ────────────────────────────────────────────────────────

function buildInsights(
  input: GraphInput,
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphInsight[] {
  const insights: GraphInsight[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency for quick weight lookups
  const weightMap = new Map(nodes.map((n) => [n.id, n.weight]));

  let insightIdx = 0;
  function nextId() { return `insight_${insightIdx++}`; }

  // ── 1. Orphaned opportunities ──────────────────────────────────────────
  for (const opp of input.opportunities) {
    if (opp.status === "Archived" || opp.status === "Converted") continue;
    const nodeId = oid(opp.id);
    const weight = weightMap.get(nodeId) ?? 0;
    if (weight === 0) {
      insights.push({
        id:             nextId(),
        type:           "orphaned_opportunity",
        title:          `Orphaned: "${opp.title}"`,
        description:    `This opportunity has no linked people, projects, or memories. It exists in isolation — high risk of being forgotten.`,
        relatedNodeIds: [nodeId],
        priority:       opp.score >= 50 ? "high" : "medium",
        action:         "Link it to a project, person, or memory to activate it.",
      });
    }
  }

  // ── 2. High-value people with no follow-up ─────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const person of input.people) {
    if (person.status === "Archived") continue;
    if (person.priority !== "High" && person.priority !== "Critical") continue;
    if (person.next_follow_up_at) continue; // already has a follow-up
    insights.push({
      id:             nextId(),
      type:           "high_value_no_followup",
      title:          `No follow-up: ${person.name}`,
      description:    `${person.name} (${person.relationship_type}, ${person.priority} priority) has no follow-up date set. High-priority contacts without structure drift.`,
      relatedNodeIds: [pid(person.id)],
      priority:       person.priority === "Critical" ? "critical" : "high",
      action:         `Open ${person.name}'s profile and set a follow-up date this week.`,
    });
  }

  // ── 3. Projects generating multiple opportunities ───────────────────────
  const oppCountByProject = new Map<string, string[]>();
  for (const opp of input.opportunities) {
    if (opp.status === "Archived" || opp.status === "Converted") continue;
    for (const projId of (opp.related_project_ids ?? [])) {
      const list = oppCountByProject.get(projId) ?? [];
      list.push(oid(opp.id));
      oppCountByProject.set(projId, list);
    }
  }
  for (const [projId, oppIds] of oppCountByProject) {
    if (oppIds.length < 2) continue;
    const project = input.projects.find((p) => p.id === projId);
    if (!project || project.status === "Archived") continue;
    insights.push({
      id:             nextId(),
      type:           "project_multi_opportunity",
      title:          `"${project.title}" generating ${oppIds.length} opportunities`,
      description:    `This project is producing multiple tracked opportunities. It may be your highest-leverage active initiative.`,
      relatedNodeIds: [pjid(projId), ...oppIds],
      priority:       "high",
      action:         `Review all ${oppIds.length} opportunities and prioritize the highest-score one for immediate action.`,
    });
  }

  // ── 4. Content from shipped work ───────────────────────────────────────
  const contentProjectIds = new Set(
    input.contentItems
      .filter((c) => c.status !== "Archived")
      .map((c) => c.related_project_id)
      .filter(Boolean)
  );
  for (const project of input.projects) {
    if (project.status !== "Shipped") continue;
    if (contentProjectIds.has(project.id)) continue;
    insights.push({
      id:             nextId(),
      type:           "content_from_shipped",
      title:          `No content from: "${project.title}"`,
      description:    `"${project.title}" shipped but has no content piece referencing it. Shipped work is free social proof — document it.`,
      relatedNodeIds: [pjid(project.id)],
      priority:       "medium",
      action:         `Create a Content item (post, case study, or breakdown) linked to this project.`,
    });
  }

  // ── 5. Relationship leverage ───────────────────────────────────────────
  for (const person of input.people) {
    if (person.status === "Archived") continue;
    if (person.relationship_type !== "Prospect" && person.relationship_type !== "Client") continue;
    const personNodeId = pid(person.id);
    const totalConnections = weightMap.get(personNodeId) ?? 0;
    if (totalConnections < 3) continue;
    // Also check if last contact is stale (> 30 days)
    const daysSinceContact = person.last_contacted_at
      ? Math.floor((Date.now() - new Date(person.last_contacted_at).getTime()) / 86_400_000)
      : 999;
    if (daysSinceContact < 14) continue; // recently contacted — no insight needed
    const relatedNodes = edges
      .filter((e) => e.source === personNodeId || e.target === personNodeId)
      .map((e) => (e.source === personNodeId ? e.target : e.source))
      .filter((id) => nodeMap.has(id));
    insights.push({
      id:             nextId(),
      type:           "relationship_leverage",
      title:          `Leverage gap: ${person.name}`,
      description:    `${person.name} (${person.relationship_type}) is connected to ${totalConnections} entities in your graph but hasn't been contacted in ${daysSinceContact === 999 ? "an unknown period" : `${daysSinceContact} days`}.`,
      relatedNodeIds: [personNodeId, ...relatedNodes.slice(0, 4)],
      priority:       daysSinceContact > 60 ? "high" : "medium",
      action:         `Reach out to ${person.name} — this relationship has compounding context that could unlock multiple opportunities.`,
    });
  }

  // ── 6. Isolated important memories ────────────────────────────────────
  for (const mem of input.memoryItems) {
    if (mem.importance !== "High" && mem.importance !== "Critical") continue;
    if ((mem.relatedProjectIds ?? []).length > 0 || (mem.relatedPeople ?? []).length > 0) continue;
    const memNodeId = mid(mem.id);
    const weight = weightMap.get(memNodeId) ?? 0;
    if (weight > 0) continue; // has connections, fine
    insights.push({
      id:             nextId(),
      type:           "isolated_memory",
      title:          `Isolated memory: "${mem.title}"`,
      description:    `A ${mem.importance.toLowerCase()}-importance memory has no linked projects or people. Important context risks being unreachable.`,
      relatedNodeIds: [memNodeId],
      priority:       mem.importance === "Critical" ? "high" : "medium",
      action:         `Link this memory to a person, project, or opportunity to make it retrievable in context.`,
    });
  }

  // ── 7. Stalled projects with linked opportunities ──────────────────────
  for (const project of input.projects) {
    if (project.status !== "Paused" && project.status !== "Active") continue;
    const projectNodeId = pjid(project.id);
    const oppIds = oppCountByProject.get(project.id) ?? [];
    if (oppIds.length === 0) continue;
    // Check if stalled: Paused status or no next_action
    const isStalled = project.status === "Paused" || !project.next_action;
    if (!isStalled) continue;
    insights.push({
      id:             nextId(),
      type:           "stalled_project_with_opps",
      title:          `"${project.title}" stalled — ${oppIds.length} opportunity${oppIds.length > 1 ? "s" : ""} waiting`,
      description:    `This project is stalled (${project.status}) but has ${oppIds.length} linked opportunity${oppIds.length > 1 ? "s" : ""}. Unblocking it could unlock multiple paths.`,
      relatedNodeIds: [projectNodeId, ...oppIds.slice(0, 3)],
      priority:       "high",
      action:         `Define a next action for "${project.title}" to unblock it.`,
    });
  }

  // Sort: critical > high > medium, then by relevance count (more related nodes = more important)
  const PRIORITY_RANK: Record<InsightPriority, number> = { critical: 3, high: 2, medium: 1 };
  insights.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (rankDiff !== 0) return rankDiff;
    return b.relatedNodeIds.length - a.relatedNodeIds.length;
  });

  // Deduplicate by type (max 2 of same type except orphaned_opportunity)
  const typeCounts: Partial<Record<InsightType, number>> = {};
  const deduped: GraphInsight[] = [];
  for (const insight of insights) {
    const cap = insight.type === "orphaned_opportunity" ? 3 : 2;
    const count = typeCounts[insight.type] ?? 0;
    if (count >= cap) continue;
    typeCounts[insight.type] = count + 1;
    deduped.push(insight);
    if (deduped.length >= 8) break; // hard cap
  }

  void todayStr; // used above — suppress lint

  return deduped.slice(0, 5); // return top 5
}

// ── Stats ──────────────────────────────────────────────────────────────────

function buildStats(
  nodes: GraphNode[],
  edges: GraphEdge[],
  clusters: GraphCluster[]
): GraphStats {
  const isolated = nodes.filter((n) => n.weight === 0).length;
  const density =
    nodes.length > 0
      ? Math.round(((edges.length * 2) / nodes.length) * 10) / 10
      : 0;

  return {
    totalNodes:    nodes.length,
    totalEdges:    edges.length,
    totalClusters: clusters.length,
    densityScore:  density,
    isolatedNodes: isolated,
  };
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeKnowledgeGraph(input: GraphInput): KnowledgeGraph {
  const nodes = buildNodes(input);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(input, nodeIds);

  computeWeights(nodes, edges);

  const clusters = buildClusters(nodes, edges);
  const insights = buildInsights(input, nodes, edges);
  const stats    = buildStats(nodes, edges, clusters);

  return {
    nodes,
    edges,
    clusters,
    insights,
    stats,
    generatedAt: new Date().toISOString(),
  };
}
