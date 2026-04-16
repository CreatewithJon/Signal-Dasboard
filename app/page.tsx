import type { Metadata } from "next";
import BitcoinPanel from "@/components/BitcoinPanel";
import ProductivityPanel from "@/components/ProductivityPanel";
import AIPanel from "@/components/AIPanel";

export const metadata: Metadata = {
  title: "Signal — Command Center",
  description: "Your personal command center for Bitcoin, productivity, and AI.",
};

export default function HomePage() {
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

        {/* Metric pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap relative">
          {[
            {
              label: "BTC",
              value: "$67,420",
              sub: "↑ 2.34%",
              subColor: "rgba(52,211,153,0.9)",
              accentColor: "#f59e0b",
            },
            {
              label: "Focus",
              value: "4h 20m",
              sub: "↑ 15% avg",
              subColor: "rgba(255,255,255,0.3)",
              accentColor: "rgba(255,255,255,0.85)",
            },
            {
              label: "Streak",
              value: "12 days",
              sub: "🔥",
              subColor: "rgba(245,158,11,0.9)",
              accentColor: "#f59e0b",
            },
          ].map(({ label, value, sub, subColor, accentColor }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 px-4 py-3 md:px-6 md:py-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.045)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.25)",
              }}
            >
              <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-semibold">{label}</span>
              <span className="w-px h-3 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-xs md:text-sm font-semibold" style={{ color: accentColor }}>
                {value}
              </span>
              <span className="text-[11px] md:text-xs font-medium" style={{ color: subColor }}>{sub}</span>
            </div>
          ))}
        </div>
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

      {/* Panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        <div className="col-span-1 md:col-span-7 flex">
          <BitcoinPanel />
        </div>
        <div className="col-span-1 md:col-span-5 flex">
          <ProductivityPanel />
        </div>
      </div>

      <AIPanel />

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}
