import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — Sovereign OS",
  description: "System settings and configuration.",
};

const PLANNED_SETTINGS = [
  { label: "API Keys", desc: "Manage connected services: Anthropic, YouTube, CoinGecko, OpenAI" },
  { label: "Dashboard Password", desc: "Update your Sovereign OS access password" },
  { label: "Data Export", desc: "Export all localStorage data to JSON backup" },
  { label: "Theme", desc: "Customize accent colors, density, and motion preferences" },
  { label: "Notifications", desc: "Configure browser and system notifications" },
  { label: "Modules", desc: "Enable or disable individual OS modules" },
];

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <section className="relative py-14 md:py-20 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 35%, rgba(99,102,241,0.1) 0%, transparent 70%)",
          }}
        />

        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-indigo-400/60 mb-5 relative">
          Settings
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
          System Configuration.
        </h1>

        <p className="text-sm text-white/25 max-w-sm mx-auto leading-relaxed relative mb-14">
          Full settings panel coming soon. For now, manage env vars via your deployment dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          {PLANNED_SETTINGS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "rgba(99,102,241,0.5)" }}
                />
                <div>
                  <p className="text-sm font-semibold text-white/65 mb-1">{s.label}</p>
                  <p className="text-xs text-white/28 leading-relaxed">{s.desc}</p>
                </div>
              </div>
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
