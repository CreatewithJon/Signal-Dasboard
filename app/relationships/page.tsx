"use client";

/**
 * app/relationships/page.tsx
 *
 * Relationship Intelligence — Sovereign OS v5.2
 *
 * Features:
 *   - Add / edit / archive people
 *   - Filter by type / status / priority
 *   - Follow-up due / overdue badges
 *   - Related opportunities / projects / memories
 *   - Convert person → opportunity
 *   - Save relationship note → memory
 *   - AI: "Prepare for this relationship"
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AppModal from "@/components/ui/AppModal";
import { KEYS } from "@/lib/keys";
import {
  loadPeople,
  createPerson,
  updatePerson,
  deletePerson,
  setPersonStatus,
  touchPerson,
  isFollowUpDue,
  isFollowUpSoon,
} from "@/lib/relationships/store";
import { createOpportunity } from "@/lib/opportunities/store";
import type { Person, RelationshipType, RelationshipStatus, RelationshipPriority } from "@/lib/types/relationships";
import type { Project } from "@/lib/types/projects";
import type { Opportunity } from "@/lib/types/opportunities";
import type { MemoryItem } from "@/lib/types/memory";

// ── Constants ──────────────────────────────────────────────────────────────

const REL_TYPES: RelationshipType[] = [
  "Founder", "Client", "Prospect", "Partner", "Mentor", "Educator", "Community", "Other",
];
const REL_STATUSES: RelationshipStatus[] = ["Active", "Follow Up", "Dormant", "Archived"];
const REL_PRIORITIES: RelationshipPriority[] = ["Critical", "High", "Medium", "Low"];

const TYPE_COLORS: Record<RelationshipType, { color: string; bg: string; border: string }> = {
  Founder:   { color: "rgba(251,191,36,0.9)",  bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
  Client:    { color: "rgba(52,211,153,0.9)",  bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.18)" },
  Prospect:  { color: "rgba(59,130,246,0.9)",  bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.18)" },
  Partner:   { color: "rgba(245,158,11,0.9)",  bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)" },
  Mentor:    { color: "rgba(167,139,250,0.9)", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  Educator:  { color: "rgba(129,140,248,0.9)", bg: "rgba(129,140,248,0.07)", border: "rgba(129,140,248,0.18)" },
  Community: { color: "rgba(251,113,133,0.9)", bg: "rgba(251,113,133,0.07)", border: "rgba(251,113,133,0.18)" },
  Other:     { color: "rgba(156,163,175,0.7)", bg: "rgba(156,163,175,0.05)", border: "rgba(156,163,175,0.14)" },
};

const STATUS_COLORS: Record<RelationshipStatus, { color: string; bg: string; border: string }> = {
  "Active":     { color: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.18)"  },
  "Follow Up":  { color: "rgba(245,158,11,0.85)",  bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)"  },
  "Dormant":    { color: "rgba(156,163,175,0.65)", bg: "rgba(156,163,175,0.05)", border: "rgba(156,163,175,0.14)" },
  "Archived":   { color: "rgba(100,116,135,0.55)", bg: "rgba(100,116,135,0.04)", border: "rgba(100,116,135,0.12)" },
};

const PRIORITY_COLORS: Record<RelationshipPriority, string> = {
  Critical: "rgba(239,68,68,0.85)",
  High:     "rgba(245,158,11,0.85)",
  Medium:   "rgba(96,165,250,0.8)",
  Low:      "rgba(156,163,175,0.6)",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function now(): string { return new Date().toISOString(); }

function todayStr(): string { return new Date().toISOString().slice(0, 10); }

function timeAgo(iso: string): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString([], { month: "short", day: "numeric" });
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

const FIELD_CLS = "w-full rounded-xl px-3 py-2 text-[11px] outline-none resize-none";
const FIELD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.75)",
};

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1">{children}</p>;
}

// ── Initials avatar ────────────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
      style={{ background: color.replace("0.9", "0.1").replace("0.85", "0.1"), border: `1px solid ${color.replace("0.9", "0.2").replace("0.85", "0.18")}`, color }}
    >
      {initials || "?"}
    </div>
  );
}

// ── AI Prepare Panel ───────────────────────────────────────────────────────

function AIPanel({
  person,
  projects,
  opportunities,
  memories,
  onClose,
}: {
  person: Person;
  projects: Project[];
  opportunities: Opportunity[];
  memories: MemoryItem[];
  onClose: () => void;
}) {
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const relProjects     = projects.filter((p) => person.related_project_ids.includes(p.id));
  const relOpportunities = opportunities.filter((o) => person.related_opportunity_ids.includes(o.id));
  const relMemories      = memories.filter((m) => person.related_memory_ids.includes(m.id));

  const context = [
    `Person: ${person.name}`,
    person.role         ? `Role: ${person.role}`                     : "",
    person.organization ? `Organization: ${person.organization}`     : "",
    `Relationship type: ${person.relationship_type}`,
    `Status: ${person.status}`,
    `Priority: ${person.priority}`,
    person.last_contacted_at ? `Last contacted: ${timeAgo(person.last_contacted_at)}` : "Never contacted",
    person.next_follow_up_at ? `Follow-up due: ${formatDate(person.next_follow_up_at)}` : "",
    person.notes             ? `Notes: ${person.notes}`              : "",
    relProjects.length      > 0 ? `Related projects: ${relProjects.map((p) => p.title).join(", ")}` : "",
    relOpportunities.length > 0 ? `Related opportunities: ${relOpportunities.map((o) => o.title).join(", ")}` : "",
    relMemories.length      > 0 ? `Related memories: ${relMemories.map((m) => m.title).join(", ")}` : "",
    person.tags.length > 0 ? `Tags: ${person.tags.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const SUGGESTIONS = [
    "What should I know before talking to them?",
    "What's the most valuable thing I can offer?",
    "What questions should I ask?",
    "How should I approach this relationship?",
  ];

  async function send(msg?: string) {
    const message = (msg ?? input).trim();
    if (!message || loading) return;
    const newMsgs = [...messages, { role: "user" as const, content: message }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/chief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      });
      const data: { reply?: string; error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMsgs, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal open={true} onClose={onClose} align="bottom" maxWidth="lg" accentBorder="rgba(99,102,241,0.2)" aria-label="Prepare for relationship">
        <div className="px-4 pt-4 pb-3 flex items-start justify-between shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="text-xs font-bold text-white/80">Prepare: {person.name}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{person.role}{person.organization ? ` · ${person.organization}` : ""}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] rounded-xl px-3 py-2"
                style={{
                  background: m.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.07)",
                }}>
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: m.role === "user" ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.65)" }}>
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                      style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && <p className="text-[10px] text-red-400/70">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about this person…"
              rows={2}
              className="flex-1 rounded-xl px-3 py-2.5 text-[11px] resize-none outline-none"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 shrink-0"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.9)" }}>
              Send
            </button>
          </div>
        </div>
    </AppModal>
  );
}

// ── Person Form (New / Edit) ───────────────────────────────────────────────

function PersonForm({
  initial,
  projects,
  opportunities,
  memories,
  onSave,
  onCancel,
}: {
  initial: Person | null;
  projects: Project[];
  opportunities: Opportunity[];
  memories: MemoryItem[];
  onSave: (p: Person) => void;
  onCancel: () => void;
}) {
  const isNew = !initial?.id;

  const [name,         setName]         = useState(initial?.name         ?? "");
  const [role,         setRole]         = useState(initial?.role         ?? "");
  const [org,          setOrg]          = useState(initial?.organization ?? "");
  const [email,        setEmail]        = useState(initial?.email        ?? "");
  const [phone,        setPhone]        = useState(initial?.phone        ?? "");
  const [relType,      setRelType]      = useState<RelationshipType>(initial?.relationship_type ?? "Other");
  const [status,       setStatus]       = useState<RelationshipStatus>(initial?.status ?? "Active");
  const [priority,     setPriority]     = useState<RelationshipPriority>(initial?.priority ?? "Medium");
  const [notes,        setNotes]        = useState(initial?.notes        ?? "");
  const [tags,         setTags]         = useState((initial?.tags ?? []).join(", "));
  const [followUpAt,   setFollowUpAt]   = useState(initial?.next_follow_up_at ?? "");
  const [projIds,      setProjIds]      = useState<string[]>(initial?.related_project_ids      ?? []);
  const [oppIds,       setOppIds]       = useState<string[]>(initial?.related_opportunity_ids  ?? []);
  const [memIds,       setMemIds]       = useState<string[]>(initial?.related_memory_ids       ?? []);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function handleSave() {
    if (!name.trim()) return;
    const draft = {
      name: name.trim(), role: role.trim(), organization: org.trim(),
      email: email.trim(), phone: phone.trim(),
      relationship_type: relType, status, priority,
      notes: notes.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      related_project_ids: projIds,
      related_opportunity_ids: oppIds,
      related_memory_ids: memIds,
      last_contacted_at: initial?.last_contacted_at ?? "",
      next_follow_up_at: followUpAt,
    };
    if (isNew) {
      onSave(createPerson(draft));
    } else {
      const updated = updatePerson(initial!.id, draft);
      if (updated) onSave(updated);
    }
  }

  const multiBtn = (active: boolean) => ({
    background: active ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.07)"}`,
    color: active ? "rgba(165,180,252,0.9)" : "rgba(255,255,255,0.3)",
  });

  return (
    <AppModal open={true} onClose={onCancel} maxWidth="lg" accentBorder="rgba(255,255,255,0.09)" aria-label={isNew ? "New Person" : "Edit Person"}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-bold text-white/80">{isNew ? "New Person" : `Edit: ${initial?.name}`}</p>
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 max-h-[72vh] overflow-y-auto">
          {/* Name */}
          <div>
            <Label>Name *</Label>
            <input className={FIELD_CLS} style={FIELD_STYLE} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>

          {/* Role + Org */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Role / Title</Label>
              <input className={FIELD_CLS} style={FIELD_STYLE} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. CEO" />
            </div>
            <div>
              <Label>Organization</Label>
              <input className={FIELD_CLS} style={FIELD_STYLE} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Company / project" />
            </div>
          </div>

          {/* Type + Status + Priority */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Type</Label>
              <select className={FIELD_CLS} style={FIELD_STYLE} value={relType} onChange={(e) => setRelType(e.target.value as RelationshipType)}>
                {REL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className={FIELD_CLS} style={FIELD_STYLE} value={status} onChange={(e) => setStatus(e.target.value as RelationshipStatus)}>
                {REL_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select className={FIELD_CLS} style={FIELD_STYLE} value={priority} onChange={(e) => setPriority(e.target.value as RelationshipPriority)}>
                {REL_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Email</Label>
              <input className={FIELD_CLS} style={FIELD_STYLE} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Phone</Label>
              <input className={FIELD_CLS} style={FIELD_STYLE} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <Label>Next Follow-Up Date</Label>
            <input className={FIELD_CLS} style={FIELD_STYLE} type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <textarea className={FIELD_CLS} style={FIELD_STYLE} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context, background, what you know about them…" />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (comma-separated)</Label>
            <input className={FIELD_CLS} style={FIELD_STYLE} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. bitcoin, las vegas, ai" />
          </div>

          {/* Related Projects */}
          {projects.length > 0 && (
            <div>
              <Label>Related Projects</Label>
              <div className="flex flex-wrap gap-1.5">
                {projects.filter((p) => p.status !== "Archived").map((p) => (
                  <button key={p.id} onClick={() => setProjIds(toggle(projIds, p.id))}
                    className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={multiBtn(projIds.includes(p.id))}>
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Opportunities */}
          {opportunities.length > 0 && (
            <div>
              <Label>Related Opportunities</Label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {opportunities.filter((o) => o.status !== "Archived").map((o) => (
                  <button key={o.id} onClick={() => setOppIds(toggle(oppIds, o.id))}
                    className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={multiBtn(oppIds.includes(o.id))}>
                    {o.title.slice(0, 30)}{o.title.length > 30 ? "…" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Memories */}
          {memories.length > 0 && (
            <div>
              <Label>Related Memories</Label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {memories.slice(0, 30).map((m) => (
                  <button key={m.id} onClick={() => setMemIds(toggle(memIds, m.id))}
                    className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: memIds.includes(m.id) ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${memIds.includes(m.id) ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.07)"}`,
                      color: memIds.includes(m.id) ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
                    }}>
                    {m.title.slice(0, 28)}{m.title.length > 28 ? "…" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", color: "rgba(52,211,153,0.9)" }}>
            {isNew ? "Add Person" : "Save Changes"}
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[10px] font-semibold"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
            Cancel
          </button>
        </div>
    </AppModal>
  );
}

// ── Note-to-Memory modal ───────────────────────────────────────────────────

function NoteModal({
  person,
  onSave,
  onClose,
}: {
  person: Person;
  onSave: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [saved,   setSaved]   = useState(false);

  function handleSave() {
    if (!content.trim()) return;
    const ts  = now();
    const mem: MemoryItem = {
      id:                crypto.randomUUID(),
      title:             `Note: ${person.name}`,
      content:           content.trim(),
      type:              "Person",
      tags:              person.tags.slice(0, 3),
      relatedProjectIds: person.related_project_ids,
      relatedPeople:     [person.name],
      importance:        person.priority === "Critical" ? "Critical" : person.priority === "High" ? "High" : "Medium",
      source:            "Manual",
      createdAt:         ts,
      updatedAt:         ts,
    };
    const mems: MemoryItem[] = safeRead(KEYS.MEMORY_ITEMS, []);
    safeWrite(KEYS.MEMORY_ITEMS, [mem, ...mems]);

    // Link memory back to person
    updatePerson(person.id, {
      related_memory_ids: [...person.related_memory_ids, mem.id],
      last_contacted_at:  ts,
    });

    setSaved(true);
    onSave();
  }

  return (
    <AppModal open={true} onClose={onClose} maxWidth="sm" accentBorder="rgba(255,255,255,0.09)" aria-label="Save Note to Memory">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-bold text-white/80">Save Note → Memory</p>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {saved ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xl mb-1">✓</p>
            <p className="text-sm font-semibold text-white/75">Saved to Memory</p>
            <p className="text-[10px] text-white/30 mt-1">Linked to {person.name}</p>
            <button onClick={onClose} className="mt-4 text-[10px] font-semibold px-4 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-4">
              <p className="text-[10px] text-white/35 mb-3">For: <span className="text-white/60 font-semibold">{person.name}</span></p>
              <textarea
                className={FIELD_CLS}
                style={{ ...FIELD_STYLE, minHeight: 80 }}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What happened? What did you learn? Key insight from this interaction…"
                autoFocus
              />
            </div>
            <div className="px-4 pb-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={handleSave} disabled={!content.trim()}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold disabled:opacity-30"
                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.22)", color: "rgba(167,139,250,0.9)" }}>
                Save to Memory
              </button>
            </div>
          </>
        )}
    </AppModal>
  );
}

// ── Convert to Opportunity modal ───────────────────────────────────────────

function ConvertOppModal({
  person,
  onSave,
  onClose,
}: {
  person: Person;
  onSave: (opp: Opportunity) => void;
  onClose: () => void;
}) {
  const [title,  setTitle]  = useState(`${person.name} opportunity`);
  const [desc,   setDesc]   = useState(person.notes);
  const [type,   setType]   = useState<Opportunity["type"]>("Client");
  const [action, setAction] = useState("");
  const [done,   setDone]   = useState(false);

  function handleCreate() {
    const opp = createOpportunity({
      title,
      description: desc,
      type,
      status: "Detected",
      suggested_action: action,
      related_people: [person.name],
      related_project_ids: person.related_project_ids,
      related_memory_ids: person.related_memory_ids,
      source: "manual",
      conversion: null,
      notes: "",
    });
    // Link opp back to person
    updatePerson(person.id, {
      related_opportunity_ids: [...person.related_opportunity_ids, opp.id],
    });
    setDone(true);
    onSave(opp);
  }

  const OPP_TYPES: Opportunity["type"][] = ["Revenue", "Client", "Partnership", "Product", "Content", "Event", "Education", "Personal"];

  return (
    <AppModal open={true} onClose={onClose} maxWidth="sm" accentBorder="rgba(255,255,255,0.09)" aria-label="Convert to Opportunity">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-bold text-white/80">Convert → Opportunity</p>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {done ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xl mb-1">✓</p>
            <p className="text-sm font-semibold text-white/75">Opportunity Created</p>
            <p className="text-[10px] text-white/30 mt-1">Linked to {person.name}</p>
            <div className="flex gap-2 mt-4 justify-center">
              <Link href="/opportunities"
                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "rgba(52,211,153,0.8)" }}>
                View Opportunities
              </Link>
              <button onClick={onClose} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-4 space-y-3">
              <p className="text-[10px] text-white/35">From: <span className="text-white/60 font-semibold">{person.name}</span></p>
              <div>
                <Label>Title</Label>
                <input className={FIELD_CLS} style={FIELD_STYLE} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <select className={FIELD_CLS} style={FIELD_STYLE} value={type} onChange={(e) => setType(e.target.value as Opportunity["type"])}>
                  {OPP_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <textarea className={FIELD_CLS} style={FIELD_STYLE} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div>
                <Label>Suggested Next Action</Label>
                <input className={FIELD_CLS} style={FIELD_STYLE} value={action} onChange={(e) => setAction(e.target.value)} placeholder="First move" />
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={handleCreate} disabled={!title.trim()}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold disabled:opacity-30"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", color: "rgba(52,211,153,0.9)" }}>
                Create Opportunity
              </button>
            </div>
          </>
        )}
    </AppModal>
  );
}

// ── Person Card ────────────────────────────────────────────────────────────

function PersonCard({
  person,
  today,
  projects,
  opportunities,
  onEdit,
  onDelete,
  onStatusChange,
  onPrepare,
  onNote,
  onConvertOpp,
  onTouch,
}: {
  person: Person;
  today: string;
  projects: Project[];
  opportunities: Opportunity[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: RelationshipStatus) => void;
  onPrepare: () => void;
  onNote: () => void;
  onConvertOpp: () => void;
  onTouch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc   = TYPE_COLORS[person.relationship_type];
  const sc   = STATUS_COLORS[person.status];
  const pc   = PRIORITY_COLORS[person.priority];

  const overdue = isFollowUpDue(person, today);
  const soon    = !overdue && isFollowUpSoon(person, today);
  const relProjs = projects.filter((p) => person.related_project_ids.includes(p.id));
  const relOpps  = opportunities.filter((o) => person.related_opportunity_ids.includes(o.id));

  const isArchived = person.status === "Archived";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${isArchived ? "rgba(255,255,255,0.04)" : overdue ? "rgba(239,68,68,0.2)" : tc.border}`,
        background: isArchived ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.015)",
        opacity: isArchived ? 0.5 : 1,
      }}
    >
      {/* Top row */}
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-start gap-3">
          <Avatar name={person.name} color={tc.color} />

          <div className="flex-1 min-w-0">
            <button onClick={() => setExpanded((v) => !v)} className="text-left w-full">
              <p className="text-sm font-semibold text-white/80 hover:text-white/95 transition-colors leading-tight">
                {person.name}
              </p>
            </button>
            <p className="text-[10px] text-white/35 mt-0.5">
              {[person.role, person.organization].filter(Boolean).join(" · ") || "No role set"}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge label={person.relationship_type} {...tc} />
              <Badge label={person.status} {...sc} />
              {(person.priority === "High" || person.priority === "Critical") && (
                <span className="text-[8px] font-bold" style={{ color: pc }}>● {person.priority}</span>
              )}
              {overdue && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ color: "rgba(239,68,68,0.9)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  OVERDUE
                </span>
              )}
              {soon && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ color: "rgba(245,158,11,0.9)", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  DUE SOON
                </span>
              )}
            </div>
          </div>

          <button onClick={onEdit} className="text-white/20 hover:text-white/50 transition-colors shrink-0">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-3.5 h-3.5">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 mt-2 text-[9px] text-white/25">
          {person.last_contacted_at && (
            <span>Last: {timeAgo(person.last_contacted_at)}</span>
          )}
          {person.next_follow_up_at && (
            <span style={{ color: overdue ? "rgba(239,68,68,0.7)" : soon ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.25)" }}>
              Follow-up: {formatDate(person.next_follow_up_at)}
            </span>
          )}
          {relOpps.length > 0 && <span>{relOpps.length} opp{relOpps.length > 1 ? "s" : ""}</span>}
          {relProjs.length > 0 && <span>{relProjs.length} proj{relProjs.length > 1 ? "s" : ""}</span>}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
          {person.notes && <p className="text-[10px] text-white/45 leading-relaxed">{person.notes}</p>}

          {person.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {person.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(person.email || person.phone) && (
            <div className="flex gap-4">
              {person.email && <p className="text-[10px] text-white/35">{person.email}</p>}
              {person.phone && <p className="text-[10px] text-white/35">{person.phone}</p>}
            </div>
          )}

          {relProjs.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/20 uppercase tracking-wide mb-1">Projects</p>
              <div className="flex flex-wrap gap-1">
                {relProjs.map((p) => (
                  <Link key={p.id} href="/projects"
                    className="text-[9px] px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", color: "rgba(165,180,252,0.7)" }}>
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {relOpps.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-white/20 uppercase tracking-wide mb-1">Opportunities</p>
              <div className="flex flex-wrap gap-1">
                {relOpps.map((o) => (
                  <Link key={o.id} href="/opportunities"
                    className="text-[9px] px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.14)", color: "rgba(52,211,153,0.7)" }}>
                    {o.title.slice(0, 28)}{o.title.length > 28 ? "…" : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isArchived && (
        <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button onClick={onPrepare}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", color: "rgba(165,180,252,0.7)" }}>
            ✦ Prepare
          </button>
          <button onClick={onNote}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)", color: "rgba(167,139,250,0.75)" }}>
            + Note
          </button>
          <button onClick={onConvertOpp}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", color: "rgba(52,211,153,0.75)" }}>
            → Opp
          </button>
          <button onClick={onTouch}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
            ✓ Contacted
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={() => onStatusChange("Archived")} className="text-[9px] text-white/15 hover:text-white/30 transition-colors">Archive</button>
            <button onClick={onDelete} className="text-[9px] text-red-400/25 hover:text-red-400/60 transition-colors">Delete</button>
          </div>
        </div>
      )}
      {isArchived && (
        <div className="px-4 py-2 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button onClick={() => onStatusChange("Active")} className="text-[9px] text-white/20 hover:text-white/40">Restore</button>
          <button onClick={onDelete} className="text-[9px] text-red-400/20 hover:text-red-400/50">Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type FilterType     = RelationshipType | "All";
type FilterStatus   = RelationshipStatus | "All";
type FilterPriority = RelationshipPriority | "All";

export default function RelationshipsPage() {
  const [people,       setPeople]       = useState<Person[]>([]);
  const [projects,     setProjects]     = useState<Project[]>([]);
  const [opportunities,setOpportunities]= useState<Opportunity[]>([]);
  const [memories,     setMemories]     = useState<MemoryItem[]>([]);
  const [loaded,       setLoaded]       = useState(false);

  const [filterType,     setFilterType]     = useState<FilterType>("All");
  const [filterStatus,   setFilterStatus]   = useState<FilterStatus>("All");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("All");
  const [showArchived,   setShowArchived]   = useState(false);

  const [editingPerson, setEditingPerson]   = useState<Person | null | "new">(null);
  const [prepPerson,    setPrepPerson]      = useState<Person | null>(null);
  const [notePerson,    setNotePerson]      = useState<Person | null>(null);
  const [oppPerson,     setOppPerson]       = useState<Person | null>(null);

  const today = todayStr();

  useEffect(() => {
    setPeople(loadPeople());
    setProjects(safeRead<Project[]>(KEYS.PROJECTS, []));
    setOpportunities(safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []));
    setMemories(safeRead<MemoryItem[]>(KEYS.MEMORY_ITEMS, []));
    setLoaded(true);
  }, []);

  // Derived
  const filtered = people.filter((p) => {
    if (!showArchived && p.status === "Archived") return false;
    if (filterType     !== "All" && p.relationship_type !== filterType)   return false;
    if (filterStatus   !== "All" && p.status            !== filterStatus) return false;
    if (filterPriority !== "All" && p.priority          !== filterPriority) return false;
    return true;
  });

  // Sort: overdue first, then by priority, then by name
  const PRIORITY_ORDER: Record<RelationshipPriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const sorted = [...filtered].sort((a, b) => {
    const aOver = isFollowUpDue(a, today) ? 1 : 0;
    const bOver = isFollowUpDue(b, today) ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    return (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
  });

  const counts = {
    total:    people.filter((p) => p.status !== "Archived").length,
    followUp: people.filter((p) => p.status === "Follow Up").length,
    overdue:  people.filter((p) => isFollowUpDue(p, today)).length,
  };

  // Handlers
  function handleSaved(saved: Person) {
    setPeople((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev]; next[idx] = saved; return next;
    });
    setEditingPerson(null);
  }

  function handleDelete(id: string) {
    deletePerson(id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  function handleStatus(id: string, status: RelationshipStatus) {
    const updated = setPersonStatus(id, status);
    if (updated) setPeople((prev) => prev.map((p) => p.id === id ? updated : p));
  }

  function handleTouch(id: string) {
    const updated = touchPerson(id);
    if (updated) setPeople((prev) => prev.map((p) => p.id === id ? updated : p));
  }

  function refreshPerson(id: string) {
    const all = loadPeople();
    const found = all.find((p) => p.id === id);
    if (found) setPeople((prev) => prev.map((p) => p.id === id ? found : p));
  }

  if (!loaded) {
    return (
      <div className="min-h-screen" style={{ background: "#080808" }}>
        <div className="max-w-2xl mx-auto px-4 pt-16 space-y-4">
          {[120, 120, 120].map((h, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "rgba(255,255,255,0.025)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080808" }}>
      {/* Modals */}
      {editingPerson !== null && (
        <PersonForm
          initial={editingPerson === "new" ? null : editingPerson}
          projects={projects}
          opportunities={opportunities}
          memories={memories}
          onSave={handleSaved}
          onCancel={() => setEditingPerson(null)}
        />
      )}
      {prepPerson && (
        <AIPanel
          person={prepPerson}
          projects={projects}
          opportunities={opportunities}
          memories={memories}
          onClose={() => setPrepPerson(null)}
        />
      )}
      {notePerson && (
        <NoteModal
          person={notePerson}
          onSave={() => { refreshPerson(notePerson.id); }}
          onClose={() => setNotePerson(null)}
        />
      )}
      {oppPerson && (
        <ConvertOppModal
          person={oppPerson}
          onSave={() => {
            setOpportunities(safeRead<Opportunity[]>(KEYS.OPPORTUNITIES, []));
            refreshPerson(oppPerson.id);
          }}
          onClose={() => setOppPerson(null)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.4" className="w-3.5 h-3.5">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">Relationships</p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white/85 tracking-tight">People</h1>
              <p className="text-[10px] text-white/25 mt-1">
                {counts.total} active
                {counts.overdue > 0 && <span className="text-red-400/70"> · {counts.overdue} overdue</span>}
                {counts.followUp > 0 && <span className="text-amber-400/60"> · {counts.followUp} follow-up</span>}
              </p>
            </div>
            <button onClick={() => setEditingPerson("new")}
              className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all shrink-0"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.22)", color: "rgba(251,191,36,0.9)" }}>
              + Add Person
            </button>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {/* Status */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["All", "Active", "Follow Up", "Dormant"] as FilterStatus[]).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="text-[9px] font-semibold px-2.5 py-1.5 transition-all"
                style={{
                  background: filterStatus === s ? "rgba(255,255,255,0.06)" : "transparent",
                  color: filterStatus === s ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)",
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Type */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-xl px-2.5 py-1.5 text-[9px] font-semibold outline-none"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
            <option value="All">All types</option>
            {REL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>

          {/* Priority */}
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
            className="rounded-xl px-2.5 py-1.5 text-[9px] font-semibold outline-none"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
            <option value="All">All priorities</option>
            {REL_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>

          {/* Archived */}
          <button onClick={() => setShowArchived((v) => !v)}
            className="text-[9px] font-semibold px-2.5 py-1.5 rounded-xl transition-all"
            style={{
              background: showArchived ? "rgba(255,255,255,0.06)" : "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              color: showArchived ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
            }}>
            Archived
          </button>
        </div>

        {/* ── List ─────────────────────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl px-5 py-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
            <p className="text-sm text-white/30">No people match this filter.</p>
            <button onClick={() => setEditingPerson("new")}
              className="mt-4 text-[10px] font-semibold px-4 py-2 rounded-xl"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", color: "rgba(251,191,36,0.7)" }}>
              Add your first person
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                today={today}
                projects={projects}
                opportunities={opportunities}
                onEdit={() => setEditingPerson(person)}
                onDelete={() => handleDelete(person.id)}
                onStatusChange={(s) => handleStatus(person.id, s)}
                onPrepare={() => setPrepPerson(person)}
                onNote={() => setNotePerson(person)}
                onConvertOpp={() => setOppPerson(person)}
                onTouch={() => handleTouch(person.id)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center gap-3">
          <Link href="/chief" className="text-[10px] text-white/20 hover:text-white/40 transition-colors">← Chief of Staff</Link>
          <span className="text-[10px] text-white/10">·</span>
          <p className="text-[10px] text-white/15">Sovereign OS v5.2</p>
        </div>
      </div>
    </div>
  );
}

// need this for React.CSSProperties reference in the file
import type React from "react";
