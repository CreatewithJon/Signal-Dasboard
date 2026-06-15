import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads — Sovereign OS",
  description: "Lead engine and CRM coming soon.",
};

export default function LeadsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <section className="relative py-14 md:py-24 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(16,185,129,0.1) 0%, transparent 70%)",
          }}
        />

        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-400/60 mb-5 relative">
          Lead Engine
        </p>

        <h1
          className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-5 relative"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Your Pipeline.
          <br />
          Coming Soon.
        </h1>

        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative mb-14">
          A built-in CRM and lead engine for tracking prospects, outreach, and pipeline — without leaving Sovereign OS.
        </p>

        {/* Feature preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { label: "Lead Inbox", desc: "Capture and triage inbound leads from all sources" },
            { label: "Prospect Tracker", desc: "Track conversations, follow-ups, and deal status" },
            { label: "Outreach Engine", desc: "AI-assisted messaging templates and send sequences" },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-2xl p-5 text-left"
              style={{
                background: "rgba(16,185,129,0.04)",
                border: "1px solid rgba(16,185,129,0.1)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 mb-3" />
              <p className="text-sm font-semibold text-white/70 mb-1.5">{f.label}</p>
              <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <span
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.18)",
              color: "rgba(167,139,250,0.6)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            In development
          </span>
        </div>
      </section>
    </div>
  );
}
