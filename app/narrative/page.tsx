"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Narrative {
  id: string;
  title: string;
  body: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_NARRATIVES: Narrative[] = [
  {
    id: "1",
    title: "Origin Story",
    body: "I come from sales, banking, and community — not computer science. I learned to build with AI because I had to, and now I help others do the same.",
  },
  {
    id: "2",
    title: "The Mission",
    body: "Helping everyday people and businesses use AI, automation, and digital systems to create more freedom, ownership, and opportunity.",
  },
  {
    id: "3",
    title: "Why AI for Regular People",
    body: "The people who need AI the most are the ones least likely to have a CS degree. My job is to close that gap.",
  },
  {
    id: "4",
    title: "On Bitcoin",
    body: "Bitcoin is the most important money technology of our lifetime. Most people are sleeping on it. I'd rather help you understand it than watch you miss it.",
  },
  {
    id: "5",
    title: "On Building",
    body: "I don't just talk about AI — I build with it. Every tool I make is something I actually use. That's the only way to stay honest.",
  },
  {
    id: "6",
    title: "On Digital Freedom",
    body: "Financial freedom isn't just about money. It's about owning your tools, your data, your workflow, and your attention.",
  },
  {
    id: "7",
    title: "The DWT Mission",
    body: "Digital Wealth Transfer is what happens when regular people adopt technology early. The window is open. Let's walk through it together.",
  },
  {
    id: "8",
    title: "The Sovereign OS Promise",
    body: "Your operating system should work for you, not against you. No subscriptions. No clutter. Own your tools, your data, your workflow.",
  },
];

// ── Card Component ────────────────────────────────────────────────────────

function NarrativeCard({
  narrative,
  onUpdate,
  onDelete,
}: {
  narrative: Narrative;
  onUpdate: (field: "title" | "body", value: string) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(narrative.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="rounded-2xl p-5 group relative"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Delete */}
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 hover:opacity-100 text-white/40 text-base transition-opacity"
      >
        ×
      </button>

      {/* Title */}
      <div className="mb-3 pr-6">
        {editing ? (
          <input
            autoFocus
            value={narrative.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full bg-transparent text-sm font-bold text-white/90 outline-none border-b border-white/10 pb-0.5"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-sm font-bold text-white/85 hover:text-white/100 transition-colors w-full"
          >
            {narrative.title}
          </button>
        )}
      </div>

      {/* Body */}
      <textarea
        value={narrative.body}
        onChange={(e) => onUpdate("body", e.target.value)}
        rows={3}
        className="w-full bg-transparent text-sm text-white/55 resize-none outline-none leading-relaxed mb-4"
        placeholder="Narrative text…"
      />

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: copied ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.08)",
          border: `1px solid ${copied ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.16)"}`,
          color: copied ? "rgba(196,181,253,0.9)" : "rgba(167,139,250,0.6)",
        }}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
              <path d="M3 8l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
              <rect x="5" y="5" width="8" height="9" rx="1.5" />
              <path d="M11 5V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1h1" strokeLinecap="round" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function NarrativePage() {
  const [narratives, setNarratives] = useState<Narrative[]>(DEFAULT_NARRATIVES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("signal_narratives");
      if (stored) setNarratives(JSON.parse(stored) as Narrative[]);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function save(next: Narrative[]) {
    setNarratives(next);
    try {
      localStorage.setItem("signal_narratives", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function updateNarrative(id: string, field: "title" | "body", value: string) {
    save(narratives.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  }

  function deleteNarrative(id: string) {
    save(narratives.filter((n) => n.id !== id));
  }

  function addNarrative() {
    const newN: Narrative = {
      id: Date.now().toString(),
      title: "New Narrative",
      body: "Write your brand story here…",
    };
    save([...narratives, newN]);
  }

  if (!loaded) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(139,92,246,0.14) 0%, rgba(99,102,241,0.06) 55%, transparent 75%)",
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-400/60 mb-4 relative">
          Narrative Bank
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-4 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Your Voice.<br />Your Story.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Brand narratives, one-liners, and copy you can pick up and use anywhere.
        </p>
      </section>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">
          {narratives.length} {narratives.length === 1 ? "narrative" : "narratives"}
        </p>
        <button
          onClick={addNarrative}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.22)",
            color: "rgba(196,181,253,0.8)",
          }}
        >
          + Add Narrative
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {narratives.map((n) => (
          <NarrativeCard
            key={n.id}
            narrative={n}
            onUpdate={(field, value) => updateNarrative(n.id, field, value)}
            onDelete={() => deleteNarrative(n.id)}
          />
        ))}
      </div>
    </div>
  );
}
