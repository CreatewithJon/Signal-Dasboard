/**
 * app/beta/page.tsx — Sovereign OS v7.3
 *
 * Private beta landing page. Shown to invited beta users before or during
 * their first session. Explains what Sovereign OS is, what it does, who it's
 * for, all 8 core modules, data ownership model, current beta limitations,
 * and a legal/advisory disclaimer.
 *
 * Server component — no localStorage reads needed here.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Private Beta — Sovereign OS",
  description: "A personal AI operating system for founders, builders, and operators. Private beta overview.",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.28em] mb-4"
      style={{ color: "rgba(99,102,241,0.55)" }}
    >
      {children}
    </p>
  );
}

function Card({
  children,
  accent = "rgba(255,255,255,0.06)",
  bg = "rgba(255,255,255,0.025)",
}: {
  children: React.ReactNode;
  accent?: string;
  bg?: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${accent}` }}>
      {children}
    </div>
  );
}

function ModuleCard({
  icon,
  name,
  desc,
  href,
  accent = "rgba(99,102,241,0.5)",
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl p-4 transition-all hover:scale-[1.01]"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
        style={{
          background: accent.replace("0.5", "0.1"),
          border: `1px solid ${accent.replace("0.5", "0.2")}`,
          color: accent.replace("0.5", "0.85"),
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-all leading-snug mb-1">
          {name}
        </p>
        <p className="text-[11px] text-white/30 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}

// ── Icons (inline SVG keeps this self-contained) ──────────────────────────

const Icons = {
  chief: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M8 1L9.8 5.5H14.5L10.8 8.3L12.1 13L8 10.5L3.9 13L5.2 8.3L1.5 5.5H6.2L8 1Z" strokeLinejoin="round" />
    </svg>
  ),
  strategy: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M8 2l2.5 4.5H14L10.5 9l1 4L8 11l-3.5 2 1-4L2 6.5h3.5L8 2z" strokeLinejoin="round" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  actions: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M3 8h8M8 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h8" strokeLinecap="round" />
    </svg>
  ),
  focus: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  ),
  memory: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <path d="M3 5h10M3 8h7M3 11h9" strokeLinecap="round" />
    </svg>
  ),
  relationships: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <circle cx="6" cy="6" r="2.5" />
      <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5h1" strokeLinecap="round" />
      <circle cx="11.5" cy="9.5" r="2" />
      <path d="M9 14.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5" strokeLinecap="round" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <path d="M6 4V2.5M10 4V2.5M2 7.5h12" strokeLinecap="round" />
    </svg>
  ),
};

const MODULES = [
  {
    icon: Icons.chief,
    name: "Chief of Staff",
    desc: "Synthesizes all your data — projects, goals, relationships, memory — into a daily executive brief.",
    href: "/chief",
    accent: "rgba(139,92,246,0.5)",
  },
  {
    icon: Icons.strategy,
    name: "Strategy",
    desc: "North Star, top objectives, 30/60/90-day plan. Recomputed from live data every session.",
    href: "/strategy",
    accent: "rgba(99,102,241,0.5)",
  },
  {
    icon: Icons.goals,
    name: "Goals",
    desc: "Objectives decompose into milestones, tasks, content angles, and relationship follow-ups.",
    href: "/goals",
    accent: "rgba(168,85,247,0.5)",
  },
  {
    icon: Icons.actions,
    name: "Actions",
    desc: "Scored, prioritized queue of the highest-leverage moves — with AI planning and task conversion.",
    href: "/actions",
    accent: "rgba(245,158,11,0.5)",
  },
  {
    icon: Icons.focus,
    name: "Focus Engine",
    desc: "Deep work sessions linked to projects. Pomodoro timer with notes, review, and history.",
    href: "/focus",
    accent: "rgba(52,211,153,0.5)",
  },
  {
    icon: Icons.memory,
    name: "Memory",
    desc: "Every decision, insight, meeting note, and context item — searchable and used by the AI in every brief.",
    href: "/memory",
    accent: "rgba(99,102,241,0.5)",
  },
  {
    icon: Icons.relationships,
    name: "Relationships",
    desc: "Personal CRM. People connected to projects, opportunities, and memory. AI relationship advisor.",
    href: "/relationships",
    accent: "rgba(59,130,246,0.5)",
  },
  {
    icon: Icons.content,
    name: "Content Engine",
    desc: "YouTube outlier research, Claude content analysis, LinkedIn generator, teleprompter.",
    href: "/content",
    accent: "rgba(239,68,68,0.5)",
  },
];

const LIMITATIONS = [
  { label: "Single-user per browser", detail: "No multi-user collaboration. Data is per-browser by design." },
  { label: "Workspace data filtering not active", detail: "Workspace switcher is UI-only; data scoping ships in a future release." },
  { label: "AI requires Anthropic API key", detail: "Shared key in closed beta. Per-user key configuration coming." },
  { label: "YouTube API key required", detail: "Content Engine needs your own YouTube Data API v3 key." },
  { label: "No push notifications", detail: "No daily brief emails or reminders. In-app only." },
  { label: "Calendar not connected", detail: "The Chief's schedule block is not linked to Google Calendar or similar." },
  { label: "Data is browser-local by default", detail: "Clearing browser storage removes everything. Export regularly or enable Supabase sync." },
  { label: "Supabase sync is experimental", detail: "Available and functional; RLS must be enabled before multi-user use." },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function BetaPage() {
  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="pt-10 pb-8">

        {/* Beta pill */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(139,92,246,0.8)" }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(196,181,253,0.8)" }}>
              Private Beta
            </span>
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 0 24px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6" className="w-5 h-5">
              <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">Sovereign OS</p>
            <p className="text-[11px] text-white/20">v7.3 · Closed Beta</p>
          </div>
        </div>

        <h1
          className="font-bold leading-[1.06] tracking-tight mb-4"
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.4) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Your personal AI<br />operating system.
        </h1>

        <p className="text-sm text-white/40 leading-relaxed max-w-md mb-7">
          A private intelligence system that turns your projects, goals, relationships, and daily actions into a unified command center — instant, local-first, no subscription.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-85"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.22))",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "rgba(196,181,253,0.95)",
            }}
          >
            Enter Sovereign OS →
          </Link>
          <Link
            href="/welcome"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Welcome Guide
          </Link>
          <Link
            href="/settings"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Settings & Export
          </Link>
        </div>
      </div>

      <div className="space-y-8 pb-12">

        {/* ── What it does ─────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>What It Does</SectionLabel>
          <Card>
            <div className="space-y-4">
              {[
                {
                  icon: "⚡",
                  title: "Deterministic AI intelligence — no hallucinations",
                  desc: "Every brief, action, and recommendation is computed from your actual data using structured engines. No guessing, no generic responses. The more data you add, the sharper the output.",
                },
                {
                  icon: "🔒",
                  title: "Private and local-first by design",
                  desc: "Your data lives in your browser by default. No platform reads it. No algorithm monetizes it. Export to JSON at any time. Add Supabase for optional cloud backup.",
                },
                {
                  icon: "🎯",
                  title: "Structures your operating rhythm",
                  desc: "Morning brief → daily priorities → midday check-in → end-of-day wrap → weekly review. Sovereign OS gives every day a clear beginning, middle, and end.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-white/70 mb-0.5">{item.title}</p>
                    <p className="text-[11px] text-white/35 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Who it's for ─────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Who It&#39;s For</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Solo founders",
                desc: "Managing multiple projects, clients, and strategic priorities alone — without an actual Chief of Staff.",
                color: "rgba(139,92,246,0.5)",
              },
              {
                label: "Builders & operators",
                desc: "Shipping product, running systems, and tracking goals across multiple contexts simultaneously.",
                color: "rgba(59,130,246,0.5)",
              },
              {
                label: "Content creators",
                desc: "Building an audience while running a business — needing both a content pipeline and a project system.",
                color: "rgba(245,158,11,0.5)",
              },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="inline-flex items-center px-2.5 py-1 rounded-full mb-3"
                  style={{
                    background: p.color.replace("0.5", "0.1"),
                    border: `1px solid ${p.color.replace("0.5", "0.2")}`,
                  }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: p.color.replace("0.5", "0.9") }}>
                    {p.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Core Modules ─────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Core Modules</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((mod) => (
              <ModuleCard key={mod.name} {...mod} />
            ))}
          </div>
        </div>

        {/* ── Data Ownership ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Data Ownership</SectionLabel>
          <Card accent="rgba(52,211,153,0.15)" bg="rgba(52,211,153,0.03)">
            <div className="space-y-3">
              {[
                {
                  label: "Local-first by default.",
                  detail: "All data is stored in your browser's localStorage. The app works offline. No server reads your data.",
                },
                {
                  label: "Full JSON export, any time.",
                  detail: "Settings → Data & Storage → Export All. One file containing everything. No lock-in.",
                },
                {
                  label: "No analytics, no tracking.",
                  detail: "There is no Mixpanel, GA, or Segment installed. Your usage and behavior are never logged.",
                },
                {
                  label: "AI context is assembled client-side.",
                  detail: "When you use AI panels, your data is sent to Anthropic per-request only. Nothing is stored server-side by Sovereign OS.",
                },
                {
                  label: "Supabase sync is optional.",
                  detail: "Add your own Supabase project for cloud backup. You control the database. Sovereign OS has no access to it.",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "rgba(52,211,153,0.7)" }} />
                  <p className="text-xs text-white/45 leading-relaxed">
                    <span className="text-white/65 font-semibold">{item.label}</span>{" "}{item.detail}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Beta Limitations ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Current Beta Limitations</SectionLabel>
          <p className="text-[11px] text-white/30 mb-3 leading-relaxed">
            Sovereign OS is production-grade intelligence software in active development. These are the known gaps in the current beta.
          </p>
          <div
            className="rounded-2xl px-5 py-1"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {LIMITATIONS.map((lim, i) => (
              <div
                key={lim.label}
                className="flex items-start gap-3 py-3"
                style={{ borderBottom: i < LIMITATIONS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "rgba(245,158,11,0.6)" }} />
                <div>
                  <p className="text-xs font-semibold text-white/55 leading-snug">{lim.label}</p>
                  <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed">{lim.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Beta Disclaimer ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Beta Disclaimer</SectionLabel>
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <p className="text-[11px] text-white/35 leading-relaxed space-y-0">
              <span className="block mb-2">
                <span className="text-white/55 font-semibold">This is a private beta.</span>{" "}
                Sovereign OS is provided as-is for a closed group of early users. Features may change, data formats may migrate, and breaking changes may occur between versions. Backups are your responsibility — export your data regularly.
              </span>
              <span className="block mb-2">
                <span className="text-white/55 font-semibold">Not a replacement for professional advice.</span>{" "}
                Sovereign OS is a productivity and intelligence tool. Nothing it produces constitutes legal, financial, medical, or investment advice. AI-generated briefs, strategies, and action recommendations are decision-support tools only — not professional counsel.
              </span>
              <span className="block mb-2">
                <span className="text-white/55 font-semibold">Local-first data model.</span>{" "}
                By default, all your data lives in your browser. Clearing your browser data or switching devices will result in data loss unless Supabase sync is configured or you have a recent export backup.
              </span>
              <span className="block">
                <span className="text-white/55 font-semibold">Supabase sync is optional and experimental.</span>{" "}
                Cloud sync requires your own Supabase project. Row-Level Security (RLS) must be enabled before using Supabase in any multi-user context. See Settings for configuration details.
              </span>
            </p>
          </div>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.05))",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <p className="text-xs font-semibold text-white/55 mb-1">Ready to start?</p>
          <p className="text-[11px] text-white/30 mb-5 leading-relaxed">
            The Welcome Guide walks you through the 5 first actions — takes about 15 minutes to get the intelligence engines running.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-85"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.2))",
                border: "1px solid rgba(139,92,246,0.35)",
                color: "rgba(196,181,253,0.95)",
              }}
            >
              Enter Sovereign OS →
            </Link>
            <Link
              href="/welcome"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              View Welcome Guide
            </Link>
            <Link
              href="/settings"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Settings & Export
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-white/15 text-center pb-2">
          Sovereign OS v7.3 · Private Beta · Built by Jonathan Cardona
        </p>

      </div>
    </div>
  );
}
