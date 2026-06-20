"use client";

/**
 * app/welcome/page.tsx — Sovereign OS v7.1
 *
 * Welcome guide for first-time users. Covers:
 * - What Sovereign OS is
 * - Recommended first 5 actions
 * - Data ownership + local vs Supabase explanation
 * - Link to Settings and Command Center
 *
 * Marks sovereign_welcome_seen = true when the user clicks
 * "Go to Command Center".
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { KEYS } from "@/lib/keys";

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ── sub-components ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.28em] mb-4" style={{ color: "rgba(99,102,241,0.55)" }}>
      {children}
    </p>
  );
}

function Card({ children, accent = "rgba(255,255,255,0.06)" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${accent}` }}
    >
      {children}
    </div>
  );
}

function Step({
  number,
  title,
  desc,
  href,
  accent = "rgba(99,102,241,0.5)",
}: {
  number: number;
  title: string;
  desc: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="flex items-start gap-4 group">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold transition-all group-hover:scale-105"
        style={{ background: `${accent.replace("0.5", "0.12")}`, border: `1px solid ${accent.replace("0.5", "0.25")}`, color: accent.replace("0.5", "0.9") }}
      >
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/75 group-hover:text-white/90 transition-all leading-snug">
          {title}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <svg viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="w-4 h-4 shrink-0 mt-1 group-hover:stroke-white/40 transition-all">
        <path d="M4 8h8M9 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
      style={{ background: `${color}14`, color: `${color}cc`, border: `1px solid ${color}28` }}
    >
      {label}
    </span>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter();

  function markSeenAndGo() {
    safeWrite(KEYS.WELCOME_SEEN, true);
    router.push("/");
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Hero ── */}
      <div className="pt-10 pb-8">
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
            <p className="text-[11px] text-white/20">Your personal intelligence system</p>
          </div>
        </div>

        <h1
          className="font-bold leading-[1.08] tracking-tight mb-3"
          style={{
            fontSize: "clamp(26px, 4vw, 38px)",
            background: "linear-gradient(165deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Welcome to<br />Sovereign OS
        </h1>
        <p className="text-sm text-white/40 leading-relaxed max-w-lg">
          A private AI operating system that turns your projects, goals, relationships, and daily actions into intelligence — instantly, without subscriptions or lock-in.
        </p>
      </div>

      <div className="space-y-6 pb-10">

        {/* ── What it is ── */}
        <div>
          <SectionLabel>What This Is</SectionLabel>
          <Card>
            <div className="space-y-4">
              {[
                {
                  icon: "⚡",
                  title: "An intelligence engine, not a note app",
                  desc: "Every piece of data you add feeds deterministic AI engines that synthesize your Chief of Staff brief, strategic plan, action queue, and weekly review — automatically.",
                },
                {
                  icon: "🔒",
                  title: "Private and local-first",
                  desc: "Your data lives in your browser by default. No company reads it. No algorithm prioritizes it. One-click export gives you everything as JSON at any time.",
                },
                {
                  icon: "🎯",
                  title: "Built around your operating rhythm",
                  desc: "Morning brief → priorities → execution → midday check-in → end-of-day wrap. The Daily Rhythm module structures every day around your actual goals.",
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

        {/* ── First 5 actions ── */}
        <div>
          <SectionLabel>Start Here — Your First 5 Actions</SectionLabel>
          <Card accent="rgba(99,102,241,0.2)">
            <p className="text-[11px] text-white/30 mb-5 leading-relaxed">
              The intelligence engines need data to work. The more you add, the smarter your briefs become. Start with these five — they take about 15 minutes.
            </p>
            <div className="space-y-5">
              <Step
                number={1}
                title="Create your first project"
                desc="Go to Projects → New Project. Add anything you're actively working on — a business, a course, a side project, a client engagement."
                href="/projects"
                accent="rgba(99,102,241,0.5)"
              />
              <Step
                number={2}
                title="Add your first memory"
                desc="Go to Memory → New Memory. Capture a recent decision, a key piece of context, or something you always need to remember."
                href="/memory"
                accent="rgba(139,92,246,0.5)"
              />
              <Step
                number={3}
                title="Add a relationship"
                desc="Go to Relationships → Add Person. Add a collaborator, client, or mentor. The AI uses relationship context in every brief."
                href="/relationships"
                accent="rgba(59,130,246,0.5)"
              />
              <Step
                number={4}
                title="Create an opportunity"
                desc="Go to Opportunities → New. Add a lead, idea, or potential deal you're tracking. The Action Engine will surface it when it scores high."
                href="/opportunities"
                accent="rgba(245,158,11,0.5)"
              />
              <Step
                number={5}
                title="Start your daily rhythm"
                desc="Go to Daily Rhythm → review your Morning Brief. Set 3 priorities. Come back at end of day to wrap. This is the core habit."
                href="/daily"
                accent="rgba(52,211,153,0.5)"
              />
            </div>
          </Card>
        </div>

        {/* ── Data ownership ── */}
        <div>
          <SectionLabel>Your Data, Your Rules</SectionLabel>
          <Card>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "rgba(52,211,153,0.7)" }} />
                <p className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/65 font-semibold">Full JSON export, any time.</span>{" "}
                  Settings → Data &amp; Storage → Export. One file with everything.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "rgba(52,211,153,0.7)" }} />
                <p className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/65 font-semibold">No analytics, no tracking, no profiling.</span>{" "}
                  There is no Mixpanel, Segment, or GA installed. Your behavior is never logged.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "rgba(52,211,153,0.7)" }} />
                <p className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/65 font-semibold">AI context is assembled client-side.</span>{" "}
                  When you use AI panels, your data is sent to Anthropic per-request only. Nothing is stored server-side.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "rgba(52,211,153,0.7)" }} />
                <p className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/65 font-semibold">Clear your data any time.</span>{" "}
                  localStorage is fully accessible. You can export, inspect, or delete everything directly from your browser.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Local vs Supabase ── */}
        <div>
          <SectionLabel>Local vs Cloud Storage</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Pill label="Local Only" color="#64748b" />
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                By default, everything lives in your browser&apos;s localStorage. It&apos;s instant, private, and works offline. The risk: clearing your browser data removes everything. Use the export feature regularly as a backup.
              </p>
            </Card>
            <Card accent="rgba(52,211,153,0.12)">
              <div className="flex items-center gap-2 mb-3">
                <Pill label="+ Supabase Sync" color="#10b981" />
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                When Supabase is configured, your data syncs to a cloud database. localStorage remains the source of truth — Supabase is an additive backup layer. Requires a free Supabase account and env vars in Settings.
              </p>
            </Card>
          </div>
          <p className="text-[10px] text-white/20 mt-3 px-1">
            You can use Sovereign OS indefinitely in local-only mode. Cloud sync is optional and never required.
          </p>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <button
            onClick={markSeenAndGo}
            className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-85"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.2))",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "rgba(196,181,253,0.95)",
            }}
          >
            Go to Command Center →
          </button>
          <Link
            href="/settings"
            className="text-xs text-white/30 hover:text-white/55 transition-all"
          >
            Configure Settings &amp; Supabase
          </Link>
          <Link
            href="/beta"
            className="text-xs text-white/20 hover:text-white/45 transition-all"
          >
            Beta Overview
          </Link>
        </div>

      </div>
    </div>
  );
}
