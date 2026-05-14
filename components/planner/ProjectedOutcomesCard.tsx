import { Card } from "@/components/Card";

interface Projection {
  action: string;
  rate: string;
  outcome: string;
  timeframe: string;
  color: string;
}

const PROJECTIONS: Projection[] = [
  {
    action: "10 outreach messages / day",
    rate: "200+",
    outcome: "prospects reached per month",
    timeframe: "30 days",
    color: "#a78bfa",
  },
  {
    action: "3 content posts / week",
    rate: "150+",
    outcome: "posts published per year",
    timeframe: "12 months",
    color: "#818cf8",
  },
  {
    action: "5 focused hours on the app / week",
    rate: "240+",
    outcome: "hours of build time per year",
    timeframe: "12 months",
    color: "#60a5fa",
  },
  {
    action: "$200 in BTC / month (DCA)",
    rate: "2.4 BTC",
    outcome: "equivalent at $1K/BTC avg cost",
    timeframe: "5 years",
    color: "#f59e0b",
  },
  {
    action: "1 new client / month",
    rate: "$12K+",
    outcome: "annual revenue at $1K avg",
    timeframe: "12 months",
    color: "#34d399",
  },
  {
    action: "1 review session / week",
    rate: "52",
    outcome: "intentional course corrections per year",
    timeframe: "12 months",
    color: "#f472b6",
  },
];

export default function ProjectedOutcomesCard() {
  return (
    <Card className="p-5 md:p-7 flex flex-col gap-6" glow="0 0 80px rgba(139,92,246,0.05)">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-1">
          Projected Outcomes
        </p>
        <p className="text-xs text-white/25 max-w-lg">
          Consistency compounds. These are the numbers if you execute your daily plan without skipping.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROJECTIONS.map((p) => (
          <div
            key={p.action}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] text-white/30 leading-relaxed">{p.action}</p>
            <div
              className="h-px w-full"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
            <div>
              <p className="text-2xl font-black tracking-tight" style={{ color: p.color }}>
                {p.rate}
              </p>
              <p className="text-xs text-white/45 mt-0.5">{p.outcome}</p>
            </div>
            <p
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
              style={{
                background: `${p.color}12`,
                border: `1px solid ${p.color}25`,
                color: `${p.color}`,
                opacity: 0.75,
              }}
            >
              in {p.timeframe}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white/15 text-center">
        Projections assume consistent daily execution. Compounding is real.
      </p>
    </Card>
  );
}
