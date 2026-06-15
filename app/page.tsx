import type { Metadata } from "next";
import BitcoinPanel from "@/components/BitcoinPanel";
import ProductivityPanel from "@/components/ProductivityPanel";
import AIPanel from "@/components/AIPanel";
import HabitPanel from "@/components/HabitPanel";
import BTCStackPanel from "@/components/BTCStackPanel";
import HeroStats from "@/components/HeroStats";
import { fetchBTCData, BTC_FALLBACK } from "@/lib/btc";

export const metadata: Metadata = {
  title: "Sovereign OS — Command Center",
  description: "A personal AI operating system for building, organizing, and executing in the AI-powered digital era.",
};

export default async function HomePage() {
  const btc = (await fetchBTCData()) ?? BTC_FALLBACK;
  return (
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <section className="relative py-14 md:py-24 text-center">
        {/* Hero ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 75% 80% at 50% 35%, rgba(88,28,235,0.22) 0%, rgba(88,28,235,0.06) 55%, transparent 75%)",
          }}
        />

        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-purple-400/60 mb-6 relative">
          Command Center
        </p>

        <h1
          className="text-4xl md:text-6xl font-bold tracking-[-0.02em] leading-[1.05] mb-6 relative"
          style={{
            background:
              "linear-gradient(165deg, rgba(255,255,255,0.97) 20%, rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Money. Focus.
          <br />
          Intelligence.
        </h1>

        <p className="text-sm text-white/25 mb-16 max-w-[260px] mx-auto leading-relaxed relative">
          Your personal operating system for the digital age.
        </p>

        {/* Metric pills — live data from localStorage + server BTC */}
        <HeroStats btcPrice={btc.price} btcChange={btc.change24h} />
      </section>

      {/* Divider */}
      <div
        className="mb-8"
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%)",
        }}
      />

      {/* Row 1 — Bitcoin + Productivity */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        <div className="col-span-1 md:col-span-7 flex">
          <BitcoinPanel />
        </div>
        <div className="col-span-1 md:col-span-5 flex">
          <ProductivityPanel />
        </div>
      </div>

      {/* Row 2 — Habits + BTC Stack */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        <div className="col-span-1 md:col-span-5 flex">
          <HabitPanel />
        </div>
        <div className="col-span-1 md:col-span-7 flex">
          <BTCStackPanel initialPrice={btc.price} />
        </div>
      </div>

      <AIPanel />

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}
