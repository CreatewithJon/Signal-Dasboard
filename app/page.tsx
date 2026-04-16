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
      <section className="relative py-20 text-center">
        {/* Hero ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 70% at 50% 40%, rgba(88,28,235,0.18) 0%, transparent 70%)",
          }}
        />

        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-purple-400/50 mb-5">
          Command Center
        </p>

        <h1
          className="text-5xl font-bold tracking-tight leading-tight mb-5 relative"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Money. Focus.
          <br />
          Intelligence.
        </h1>

        <p className="text-base text-white/30 mb-14 max-w-sm mx-auto leading-relaxed">
          Your personal operating system for the digital age.
        </p>

        {/* Metric pills */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            {
              label: "BTC",
              value: "$67,420",
              sub: "↑ 2.34%",
              subColor: "text-emerald-400",
              accentColor: "#f59e0b",
            },
            {
              label: "Focus",
              value: "4h 20m",
              sub: "↑ 15% avg",
              subColor: "text-white/30",
              accentColor: "rgba(255,255,255,0.8)",
            },
            {
              label: "Streak",
              value: "12 days",
              sub: "🔥",
              subColor: "text-amber-400",
              accentColor: "#f59e0b",
            },
          ].map(({ label, value, sub, subColor, accentColor }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-[10px] text-white/20 uppercase tracking-widest">{label}</span>
              <span className="text-base font-semibold" style={{ color: accentColor }}>
                {value}
              </span>
              <span className={`text-xs font-medium ${subColor}`}>{sub}</span>
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
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)",
        }}
      />

      {/* Panels */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        <div className="col-span-7 flex">
          <BitcoinPanel />
        </div>
        <div className="col-span-5 flex">
          <ProductivityPanel />
        </div>
      </div>

      <AIPanel />

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}
