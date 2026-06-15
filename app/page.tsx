import type { Metadata } from "next";
import BitcoinPanel from "@/components/BitcoinPanel";
import ProductivityPanel from "@/components/ProductivityPanel";
import AIPanel from "@/components/AIPanel";
import HabitPanel from "@/components/HabitPanel";
import BTCStackPanel from "@/components/BTCStackPanel";
import HeroStats from "@/components/HeroStats";
import SystemStatus from "@/components/SystemStatus";
import ProjectsWidget from "@/components/ProjectsWidget";
import { fetchBTCData, BTC_FALLBACK } from "@/lib/btc";

export const metadata: Metadata = {
  title: "Sovereign OS — Command Center",
  description: "A personal AI operating system for building, organizing, and executing in the AI-powered digital era.",
};

// ── Section divider ────────────────────────────────────────────────────────

function SectionDivider({
  label,
  id,
  accent = "rgba(255,255,255,0.1)",
}: {
  label: string;
  id?: string;
  accent?: string;
}) {
  return (
    <div id={id} className="flex items-center gap-4 pt-10 pb-5">
      <span
        className="text-[9px] font-bold uppercase tracking-[0.28em] shrink-0"
        style={{ color: accent }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, ${accent}33, transparent)`,
        }}
      />
    </div>
  );
}

export default async function HomePage() {
  const rawBtc = await fetchBTCData();
  const btc = rawBtc ?? BTC_FALLBACK;
  const marketDataLive = rawBtc !== null;
  const hasAIKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative py-12 md:py-20 text-center">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 75% 80% at 50% 35%, rgba(88,28,235,0.22) 0%, rgba(88,28,235,0.06) 55%, transparent 75%)",
          }}
        />

        <p className="text-[9px] font-bold uppercase tracking-[0.35em] relative mb-5" style={{ color: "rgba(139,92,246,0.55)" }}>
          Sovereign OS · Command Center
        </p>

        <h1
          className="font-bold tracking-[-0.025em] leading-[1.06] mb-4 relative"
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            background: "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.52) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Your personal AI command center
          <br className="hidden sm:block" />
          {" "}for signals, focus, memory,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            and execution.
          </span>
        </h1>

        <p className="text-sm relative max-w-xs mx-auto leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.22)" }}>
          Own your tools. Own your data. No subscriptions, no noise.
        </p>

        {/* Live metric pills */}
        <HeroStats btcPrice={btc.price} btcChange={btc.change24h} />

        {/* System status row */}
        <div className="mt-6 max-w-lg mx-auto">
          <SystemStatus hasAIKey={hasAIKey} marketDataLive={marketDataLive} />
        </div>
      </section>

      {/* ── Gradient divider ────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%)",
        }}
      />

      {/* ── SIGNALS ─────────────────────────────────────────────────── */}
      <SectionDivider label="Signals" id="bitcoin" accent="rgba(245,158,11,0.6)" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-7 flex">
          <BitcoinPanel />
        </div>
        <div className="col-span-1 md:col-span-5 flex">
          <BTCStackPanel initialPrice={btc.price} />
        </div>
      </div>

      {/* ── EXECUTION ───────────────────────────────────────────────── */}
      <SectionDivider label="Execution" id="focus" accent="rgba(245,158,11,0.5)" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-7 flex">
          <ProductivityPanel />
        </div>
        <div className="col-span-1 md:col-span-5 flex">
          <HabitPanel />
        </div>
      </div>

      {/* ── PROJECTS ────────────────────────────────────────────────── */}
      <SectionDivider label="Projects" id="projects" accent="rgba(99,102,241,0.55)" />

      <ProjectsWidget />

      {/* ── AI ──────────────────────────────────────────────────────── */}
      <SectionDivider label="AI" id="ai" accent="rgba(99,102,241,0.6)" />

      <AIPanel />

      {/* Bottom breathing room */}
      <div className="h-10" />
    </div>
  );
}
