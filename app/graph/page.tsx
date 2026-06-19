"use client";

/**
 * app/graph/page.tsx
 *
 * Knowledge Graph — Sovereign OS v5.4
 *
 * Text-first graph intelligence view:
 *   Stats · Insights (AI explore) · Clusters · Top connected nodes
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/keys";
import { computeKnowledgeGraph } from "@/lib/knowledgeGraph/engine";
import type { KnowledgeGraph, GraphInsight, GraphNode, NodeType, InsightPriority } from "@/lib/knowledgeGraph/engine";
import type { Person } from "@/lib/types/relationships";
import type { Project } from "@/lib/types/projects";
import type { Opportunity } from "@/lib/types/opportunities";
import type { ContentItem } from "@/lib/types/content";
import type { MemoryItem } from "@/lib/types/memory";

// ── Helpers ────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Design tokens ──────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, { color: string; bg: string; border: string }> = {
  Person:      { color: "rgba(52,211,153,0.9)",  bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  Project:     { color: "rgba(99,102,241,0.9)",  bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.2)"  },
  Opportunity: { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)" },
  Content:     { color: "rgba(239,68,68,0.85)",  bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)"  },
  Memory:      { color: "rgba(167,139,250,0.85)", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
};

const PRIORITY_META: Record<InsightPriority, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "rgba(239,68,68,0.9)",   bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)",   label: "Critical" },
  high:     { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)", label: "High"     },
  medium:   { color: "rgba(167,139,250,0.75)", bg: "rgba(99,102,241,0.05)", border: "rgba(99,102,241,0.15)", label: "Medium"   },
};

// ── Node pill ──────────────────────────────────────────────────────────────

function NodePill({ node }: { node: GraphNode }) {
  const c = NODE_COLORS[node.type];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
    >
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c.color }} />
      {node.type}
      <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>
        {node.label.length > 22 ? node.label.slice(0, 22) + "…" : node.label}
      </span>
    </span>
  );
}

// ── AI Explore Panel ───────────────────────────────────────────────────────

function ExplorePanel({
  insight,
  nodes,
  onClose,
}: {
  insight: GraphInsight;
  nodes: GraphNode[];
  onClose: () => void;
}) {
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const relatedNodes = insight.relatedNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as GraphNode[];

  const context = [
    `Knowledge Graph Insight — ${insight.priority.toUpperCase()} priority`,
    `Type: ${insight.type}`,
    `Title: ${insight.title}`,
    `Description: ${insight.description}`,
    `Action: ${insight.action}`,
    relatedNodes.length > 0
      ? `Related entities: ${relatedNodes.map((n) => `${n.type}:"${n.label}"`).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context }),
      });
      const data: { reply?: string; error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const SUGGESTIONS = [
    "Why does this matter?",
    "What's the fastest path forward?",
    "What's the hidden risk here?",
    "How do I unlock this connection?",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: "rgba(8,8,14,0.98)",
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "0 0 80px rgba(99,102,241,0.12)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(99,102,241,0.6)" }}>
              Explore Connection
            </p>
            <p className="text-xs font-semibold text-white/75 leading-snug">
              {insight.title}
            </p>
            <p className="text-[10px] text-white/35 mt-1 leading-relaxed">
              {insight.description}
            </p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors text-base shrink-0 mt-0.5">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-xl px-3 py-2"
                style={{
                  background: m.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: m.role === "user" ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.65)" }}>
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-1 items-center py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {error && <p className="text-[10px] text-red-400/70">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about this connection…"
              rows={2}
              className="flex-1 rounded-xl px-3 py-2.5 text-[11px] resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 shrink-0"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "rgba(165,180,252,0.9)",
              }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function GraphPage() {
  const [graph,    setGraph]    = useState<KnowledgeGraph | null>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [explore,  setExplore]  = useState<GraphInsight | null>(null);

  useEffect(() => {
    const people        = safeRead<Person[]>(KEYS.RELATIONSHIPS, []);
    const projects      = safeRead<Project[]>(KEYS.PROJECTS, []);
    const opportunities = safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []);
    const contentItems  = safeRead<ContentItem[]>(KEYS.CONTENT_ITEMS, []);
    const memoryItems   = safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []);

    const result = computeKnowledgeGraph({ people, projects, opportunities, contentItems, memoryItems });
    setGraph(result);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-16 space-y-4">
        {[120, 200, 160].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse"
            style={{ height: h, background: "rgba(255,255,255,0.025)" }} />
        ))}
      </div>
    );
  }

  if (!graph) return null;

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const topNodes = [...graph.nodes]
    .filter((n) => n.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  const isolatedNodes = graph.nodes.filter((n) => n.weight === 0);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">

      {/* Hero */}
      <div className="pt-10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.22)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="rgba(165,180,252,0.85)" strokeWidth="1.3" className="w-3.5 h-3.5">
              <circle cx="3" cy="8" r="2" />
              <circle cx="13" cy="4" r="2" />
              <circle cx="13" cy="12" r="2" />
              <circle cx="8" cy="2" r="1.5" />
              <path d="M5 8h3.5M11 4.5L8 3M11 11.5L5 8.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.25)" }}>
            Knowledge Graph
          </p>
        </div>
        <h1 className="text-2xl font-bold text-white/85 tracking-tight leading-tight">
          Graph Intelligence
        </h1>
        <p className="text-[10px] text-white/25 mt-1">
          Generated at {formatTime(graph.generatedAt)} · deterministic · {graph.stats.totalNodes} entities mapped
        </p>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-4 gap-px rounded-2xl overflow-hidden mb-6"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        {[
          { label: "Nodes",    value: graph.stats.totalNodes,    color: "rgba(99,102,241,0.85)"   },
          { label: "Edges",    value: graph.stats.totalEdges,    color: "rgba(52,211,153,0.85)"   },
          { label: "Clusters", value: graph.stats.totalClusters, color: "rgba(245,158,11,0.85)"   },
          { label: "Density",  value: graph.stats.densityScore,  color: "rgba(167,139,250,0.85)"  },
        ].map(({ label, value, color }) => (
          <div key={label}
            className="flex flex-col items-center py-4 gap-1"
            style={{ background: "rgba(8,8,14,0.95)" }}
          >
            <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Node type breakdown */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => {
          const count = graph.nodes.filter((n) => n.type === type).length;
          if (count === 0) return null;
          const c = NODE_COLORS[type];
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
              {count} {type}{count > 1 ? "s" : ""}
            </div>
          );
        })}
        {graph.stats.isolatedNodes > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }}
          >
            {graph.stats.isolatedNodes} isolated
          </div>
        )}
      </div>

      <div className="space-y-6">

        {/* ── Insights ──────────────────────────────────────────────────── */}
        {graph.insights.length > 0 && (
          <section>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
              Graph Intelligence · {graph.insights.length} insight{graph.insights.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {graph.insights.map((insight) => {
                const pm = PRIORITY_META[insight.priority];
                const relatedNodes = insight.relatedNodeIds
                  .map((id) => nodeMap.get(id))
                  .filter(Boolean) as GraphNode[];
                return (
                  <div
                    key={insight.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: `1px solid ${pm.border}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ background: pm.bg, border: `1px solid ${pm.border}`, color: pm.color }}
                          >
                            {pm.label}
                          </span>
                          <p className="text-xs font-semibold text-white/80 leading-snug">
                            {insight.title}
                          </p>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed mb-2">
                          {insight.description}
                        </p>
                        {/* Action */}
                        <p className="text-[10px] font-medium" style={{ color: pm.color }}>
                          → {insight.action}
                        </p>
                        {/* Related nodes */}
                        {relatedNodes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {relatedNodes.slice(0, 4).map((node) => (
                              <NodePill key={node.id} node={node} />
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setExplore(insight)}
                        className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                        style={{
                          background: "rgba(99,102,241,0.08)",
                          border: "1px solid rgba(99,102,241,0.18)",
                          color: "rgba(165,180,252,0.7)",
                        }}
                      >
                        Explore →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Clusters ──────────────────────────────────────────────────── */}
        {graph.clusters.length > 0 && (
          <section>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
              Connected Networks · {graph.clusters.length} cluster{graph.clusters.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {graph.clusters.slice(0, 5).map((cluster) => {
                const members = cluster.nodeIds
                  .map((id) => nodeMap.get(id))
                  .filter(Boolean) as GraphNode[];
                const topMember = [...members].sort((a, b) => b.weight - a.weight)[0];
                // Group by type for display
                const byType: Partial<Record<NodeType, GraphNode[]>> = {};
                for (const n of members) {
                  (byType[n.type] = byType[n.type] ?? []).push(n);
                }
                return (
                  <div
                    key={cluster.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.012)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-white/75">{cluster.label}</p>
                        <p className="text-[9px] text-white/25 mt-0.5">{cluster.summary}</p>
                      </div>
                      <div
                        className="text-[10px] font-bold tabular-nums px-2 py-1 rounded-lg shrink-0"
                        style={{ background: "rgba(99,102,241,0.08)", color: "rgba(165,180,252,0.6)" }}
                      >
                        {members.length} nodes
                      </div>
                    </div>
                    {/* Node groups by type */}
                    <div className="space-y-1.5">
                      {(Object.entries(byType) as [NodeType, GraphNode[]][]).map(([type, typeNodes]) => {
                        const c = NODE_COLORS[type];
                        return (
                          <div key={type} className="flex items-start gap-2">
                            <span
                              className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                              style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                            >
                              {type}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {typeNodes.slice(0, 4).map((n) => (
                                <span
                                  key={n.id}
                                  className="text-[9px] font-medium"
                                  style={{ color: n.id === topMember?.id ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}
                                >
                                  {n.label.length > 20 ? n.label.slice(0, 20) + "…" : n.label}
                                  {n.id === topMember?.id && (
                                    <span className="ml-1 text-[7px]" style={{ color: "rgba(245,158,11,0.6)" }}>★</span>
                                  )}
                                </span>
                              ))}
                              {typeNodes.length > 4 && (
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                                  +{typeNodes.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Top Connected ─────────────────────────────────────────────── */}
        {topNodes.length > 0 && (
          <section>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
              Highest Leverage Nodes
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {topNodes.map((node, i) => {
                const c = NODE_COLORS[node.type];
                const isLast = i === topNodes.length - 1;
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span
                      className="text-[10px] font-bold tabular-nums w-5 text-right shrink-0"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      {i + 1}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: c.color }}
                    />
                    <span
                      className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                    >
                      {node.type}
                    </span>
                    <p className="flex-1 text-xs text-white/65 font-medium truncate">{node.label}</p>
                    {node.meta.priority && (
                      <span className="text-[9px] shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {node.meta.priority}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold" style={{ color: c.color }}>
                        {node.weight}
                      </span>
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        edge{node.weight !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Isolated Nodes ────────────────────────────────────────────── */}
        {isolatedNodes.length > 0 && (
          <section>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.18)" }}>
              Isolated · {isolatedNodes.length} unconnected
            </p>
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px] text-white/30 leading-relaxed mb-3">
                These entities have no connections. Link them to projects, people, or memories to integrate them into your graph.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {isolatedNodes.slice(0, 16).map((node) => (
                  <NodePill key={node.id} node={node} />
                ))}
                {isolatedNodes.length > 16 && (
                  <span className="text-[9px] self-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                    +{isolatedNodes.length - 16} more
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {graph.stats.totalNodes === 0 && (
          <div className="text-center py-16">
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="1.4" className="w-6 h-6">
                <circle cx="3" cy="10" r="2" />
                <circle cx="17" cy="5" r="2" />
                <circle cx="17" cy="15" r="2" />
                <path d="M5 10h5M15 6l-5 3M15 14l-5-3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-white/30 font-medium">No graph data yet</p>
            <p className="text-[11px] text-white/15 mt-1 max-w-xs mx-auto">
              Add people, projects, opportunities, and memories — then link them together. The graph will surface hidden connections automatically.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              {[{ href: "/relationships", label: "Add People" }, { href: "/projects", label: "Add Projects" }, { href: "/opportunities", label: "Add Opportunities" }].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.15)",
                    color: "rgba(165,180,252,0.65)",
                  }}
                >
                  {label} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[9px] text-white/12 text-center leading-relaxed pb-2">
          Graph computed from your local data · Sovereign OS v5.4 · No embeddings — pure connection mapping
        </p>

      </div>

      {/* AI Explore modal */}
      {explore && (
        <ExplorePanel
          insight={explore}
          nodes={graph.nodes}
          onClose={() => setExplore(null)}
        />
      )}
    </div>
  );
}
