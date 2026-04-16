import { Card } from "./Card";

const priceHistory = [
  61200, 60800, 62100, 61500, 63400, 64200, 63800, 65100,
  64500, 66200, 65800, 67100, 66500, 68200, 67800, 69400,
  68900, 70200, 69600, 71300, 70800, 72100, 71500, 70200,
  69400, 68800, 67200, 68100, 67600, 67420,
];

function GlowSparkline() {
  const W = 300;
  const H = 80;
  const pad = 3;
  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  const range = max - min;

  const pts = priceHistory.map((v, i) => ({
    x: pad + (i / (priceHistory.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 88 }}
    >
      <defs>
        <linearGradient id="btc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#btc-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#line-glow)"
      />
      <circle cx={last.x} cy={last.y} r="3.5" fill="#f59e0b" filter="url(#line-glow)" />
    </svg>
  );
}

const stats = [
  { label: "Market Cap", value: "$1.33T" },
  { label: "24h Volume", value: "$38.2B" },
  { label: "Dominance", value: "54.1%" },
  { label: "Block", value: "841,204" },
];

export default function BitcoinPanel() {
  return (
    <Card
      className="p-7 h-full flex flex-col"
      id="bitcoin"
      glow="0 0 80px rgba(245, 158, 11, 0.06)"
    >
      {/* Label */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/50 mb-5">
        Bitcoin · BTC/USD
      </p>

      {/* Price row */}
      <div className="flex items-end justify-between mb-2">
        <p
          className="text-4xl font-semibold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          $67,420
        </p>
        <div className="text-right mb-1">
          <span
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.12)" }}
          >
            <svg viewBox="0 0 10 10" fill="currentColor" className="w-2 h-2">
              <path d="M5 1.5l3.5 5h-7L5 1.5z" />
            </svg>
            +2.34%
          </span>
          <p className="text-[10px] text-white/20 mt-1.5">24h change</p>
        </div>
      </div>

      {/* Chart */}
      <div className="my-3 -mx-1">
        <GlowSparkline />
      </div>
      <div className="flex justify-between text-[10px] text-white/15 mb-6 px-1">
        <span>30 days ago</span>
        <span>Today</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 mt-auto">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">{label}</p>
            <p className="text-sm font-medium text-white/70">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
