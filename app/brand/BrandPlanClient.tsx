"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Positioning {
  whoIHelp: string;
  whatIDo: string;
  whyDifferent: string;
}

interface Offer {
  id: string;
  title: string;
  price: string;
  outcome: string;
}

// ── Default values ─────────────────────────────────────────────────────────

const DEFAULT_POSITIONING: Positioning = {
  whoIHelp: "Entrepreneurs, small business owners, and everyday people",
  whatIDo: "Build AI systems, automation workflows, and digital infrastructure",
  whyDifferent: "I come from the community — not computer science. I build what I actually use.",
};

const DEFAULT_MISSION =
  "Helping everyday people thrive in the AI-powered digital era";

const DEFAULT_PILLARS = [
  "AI Implementation",
  "Bitcoin & Digital Ownership",
  "Automation",
  "Digital Business",
  "Future Technology",
  "Building in Public",
];

const DEFAULT_OFFERS: Offer[] = [
  { id: "1", title: "AI Lead Capture System", price: "$500–$1,000", outcome: "Landing page, lead form, CRM, email follow-up, analytics" },
  { id: "2", title: "AI Appointment Setter", price: "$750–$1,000", outcome: "AI chatbot/SMS bot, lead qualification, calendar booking" },
  { id: "3", title: "AI Website + Funnel", price: "$1,000+", outcome: "Website, conversion copy, lead form, SEO basics" },
  { id: "4", title: "AI Content + Growth System", price: "$500/mo", outcome: "Scripts, captions, blog repurposing, monthly optimization" },
];

// ── Helper: debounced save ─────────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [value, save, loaded] as const;
}

// ── Card wrapper ──────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-400/60 mb-4">
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function BrandPlanClient() {
  const [positioning, setPositioning, posLoaded] = useLocalStorage<Positioning>(
    "brand_positioning",
    DEFAULT_POSITIONING
  );
  const [mission, setMission, missionLoaded] = useLocalStorage<string>(
    "brand_mission",
    DEFAULT_MISSION
  );
  const [pillars, setPillars, pillarsLoaded] = useLocalStorage<string[]>(
    "brand_pillars",
    DEFAULT_PILLARS
  );
  const [offers, setOffers, offersLoaded] = useLocalStorage<Offer[]>(
    "brand_offers",
    DEFAULT_OFFERS
  );

  const [editingPillar, setEditingPillar] = useState<number | null>(null);
  const [pillarDraft, setPillarDraft] = useState("");
  const [editingOffer, setEditingOffer] = useState<string | null>(null);

  if (!posLoaded || !missionLoaded || !pillarsLoaded || !offersLoaded) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-white/20 text-sm">
        Loading…
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────

  function updatePositioning(field: keyof Positioning, val: string) {
    setPositioning({ ...positioning, [field]: val });
  }

  function updatePillar(i: number, val: string) {
    const next = [...pillars];
    next[i] = val;
    setPillars(next);
  }

  function deletePillar(i: number) {
    setPillars(pillars.filter((_, idx) => idx !== i));
  }

  function addPillar() {
    setPillars([...pillars, "New Pillar"]);
    setEditingPillar(pillars.length);
    setPillarDraft("New Pillar");
  }

  function commitPillarEdit(i: number) {
    updatePillar(i, pillarDraft);
    setEditingPillar(null);
  }

  function updateOffer(id: string, field: keyof Offer, val: string) {
    setOffers(offers.map((o) => (o.id === id ? { ...o, [field]: val } : o)));
  }

  function deleteOffer(id: string) {
    setOffers(offers.filter((o) => o.id !== id));
  }

  function addOffer() {
    const newOffer: Offer = {
      id: Date.now().toString(),
      title: "New Offer",
      price: "$0",
      outcome: "Describe the outcome",
    };
    setOffers([...offers, newOffer]);
    setEditingOffer(newOffer.id);
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ── */}
      <section className="relative py-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.05) 55%, transparent 75%)",
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-400/60 mb-4 relative">
          Brand Plan
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
          Your Brand.<br />Your Sovereignty.
        </h1>
        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative">
          Positioning, mission, content pillars, and offers — all in one place.
        </p>
      </section>

      <div className="space-y-5 pb-12">

        {/* ── Mission ── */}
        <GlassCard>
          <SectionLabel>Mission Statement</SectionLabel>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={2}
            className="w-full bg-transparent text-white/80 text-base font-medium leading-relaxed resize-none outline-none placeholder-white/15"
            placeholder="Your mission statement…"
            style={{ fontFamily: "inherit" }}
          />
        </GlassCard>

        {/* ── Positioning ── */}
        <GlassCard>
          <SectionLabel>Positioning</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                { field: "whoIHelp" as const, label: "Who I Help" },
                { field: "whatIDo" as const, label: "What I Do" },
                { field: "whyDifferent" as const, label: "Why I&apos;m Different" },
              ] as { field: keyof Positioning; label: string }[]
            ).map(({ field, label }) => (
              <div key={field}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25 mb-2">
                  {label}
                </p>
                <textarea
                  value={positioning[field]}
                  onChange={(e) => updatePositioning(field, e.target.value)}
                  rows={3}
                  className="w-full text-sm text-white/70 bg-transparent resize-none outline-none leading-relaxed placeholder-white/15 rounded-xl p-3"
                  style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  placeholder={`${label}…`}
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Brand Architecture ── */}
        <GlassCard>
          <SectionLabel>Brand Architecture</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: "Jonathan Cardona",
                sub: "Personal Brand",
                desc: "The guide. Relatable technology educator helping people navigate the AI-powered digital era.",
                color: "rgba(245,158,11,0.15)",
                border: "rgba(245,158,11,0.2)",
                dot: "#f59e0b",
              },
              {
                name: "Digital Wealth Transfer",
                sub: "Marketplace & Media",
                desc: "AI implementation services, tech directory, content, and community for regular people.",
                color: "rgba(59,130,246,0.1)",
                border: "rgba(59,130,246,0.18)",
                dot: "#3b82f6",
              },
              {
                name: "Sovereign OS",
                sub: "Personal OS",
                desc: "Command center for focus, planning, content, and intelligence. Own your tools.",
                color: "rgba(139,92,246,0.1)",
                border: "rgba(139,92,246,0.18)",
                dot: "#8b5cf6",
              },
            ].map((brand) => (
              <div
                key={brand.name}
                className="rounded-xl p-4"
                style={{ background: brand.color, border: `1px solid ${brand.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: brand.dot }} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    {brand.sub}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white/85 mb-1.5">{brand.name}</p>
                <p className="text-xs text-white/40 leading-relaxed">{brand.desc}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Content Pillars ── */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Content Pillars</SectionLabel>
            <button
              onClick={addPillar}
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60 hover:text-amber-400/90 transition-colors"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pillars.map((pillar, i) =>
              editingPillar === i ? (
                <input
                  key={i}
                  autoFocus
                  value={pillarDraft}
                  onChange={(e) => setPillarDraft(e.target.value)}
                  onBlur={() => commitPillarEdit(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitPillarEdit(i);
                    if (e.key === "Escape") setEditingPillar(null);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full outline-none"
                  style={{
                    background: "rgba(245,158,11,0.14)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    color: "rgba(251,191,36,0.9)",
                    minWidth: 80,
                  }}
                />
              ) : (
                <div key={i} className="flex items-center gap-1 group">
                  <button
                    onClick={() => {
                      setEditingPillar(i);
                      setPillarDraft(pillar);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.18)",
                      color: "rgba(251,191,36,0.75)",
                    }}
                  >
                    {pillar}
                  </button>
                  <button
                    onClick={() => deletePillar(i)}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-white/40 text-xs transition-opacity w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
        </GlassCard>

        {/* ── Offers ── */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Offer Stack</SectionLabel>
            <button
              onClick={addOffer}
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60 hover:text-amber-400/90 transition-colors"
            >
              + Add Offer
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl p-4 group relative"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  onClick={() => deleteOffer(offer.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-50 hover:opacity-100 text-white/40 text-sm transition-opacity"
                >
                  ×
                </button>
                {editingOffer === offer.id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={offer.title}
                      onChange={(e) => updateOffer(offer.id, "title", e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-white/90 outline-none border-b border-white/10 pb-1"
                      placeholder="Offer title"
                    />
                    <input
                      value={offer.price}
                      onChange={(e) => updateOffer(offer.id, "price", e.target.value)}
                      className="w-full bg-transparent text-sm text-amber-400/70 outline-none border-b border-white/10 pb-1"
                      placeholder="Price"
                    />
                    <textarea
                      value={offer.outcome}
                      onChange={(e) => updateOffer(offer.id, "outcome", e.target.value)}
                      rows={2}
                      className="w-full bg-transparent text-xs text-white/50 outline-none resize-none leading-relaxed"
                      placeholder="Outcome description"
                    />
                    <button
                      onClick={() => setEditingOffer(null)}
                      className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60 hover:text-amber-400/90"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full text-left"
                    onClick={() => setEditingOffer(offer.id)}
                  >
                    <p className="text-xs font-semibold text-white/85 mb-1">{offer.title}</p>
                    <p
                      className="text-xs font-bold mb-2"
                      style={{ color: "#f59e0b" }}
                    >
                      {offer.price}
                    </p>
                    <p className="text-[11px] text-white/40 leading-relaxed">{offer.outcome}</p>
                  </button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Quick Links ── */}
        <GlassCard>
          <SectionLabel>Quick Links</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "AI Systems", href: "https://digitalwealthtransfer.com/ai-systems", ext: true },
              { label: "Life Planner", href: "/planner", ext: false },
              { label: "Content Engine", href: "/content", ext: false },
              { label: "Narrative Bank", href: "/narrative", ext: false },
              { label: "LinkedIn", href: "https://linkedin.com/in/jonathan-cardona", ext: true },
              { label: "DWT Website", href: "https://digitalwealthtransfer.com", ext: true },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.ext ? "_blank" : undefined}
                rel={link.ext ? "noopener noreferrer" : undefined}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:text-white/80"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {link.label} {link.ext && "↗"}
              </a>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
