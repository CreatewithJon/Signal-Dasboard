import { Card } from "./Card";

interface BTCData {
  price: number;
  change24h: number;
  history: number[];
}

async function fetchBTCData(): Promise<BTCData | null> {
  try {
    const [priceRes, historyRes] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
        { next: { revalidate: 300 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
        { next: { revalidate: 300 } }
      ),
    ]);

    if (!priceRes.ok || !historyRes.ok) return null;

    const priceData = await priceRes.json();
    const historyData = await historyRes.json();

    const price: number = priceData?.bitcoin?.usd ?? 0;
    const change24h: number = priceData?.bitcoin?.usd_24h_change ?? 0;
    const history: number[] = (historyData?.prices ?? []).map(
      ([, p]: [number, number]) => p
    );

    if (!price || history.length === 0) return null;

    return { price, change24h, history };
  } catch {
    return null;
  }
}

const FALLBACK: BTCData = {
  price: 67420,
  change24h: 2.34,
  history: [
    61200, 60800, 62100, 61500, 63400, 64200, 63800, 65100,
    64500, 66200, 65800, 67100, 66500, 68200, 67800, 69400,
    68900, 70200, 69600, 71300, 70800, 72100, 71500, 70200,
    69400, 68800, 67200, 68100, 67600, 67420,
  ],
};

function GlowSparkline({ history }: { history: number[] }) {
  const W = 300;
  const H = 80;
  const pad = 3;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const pts = history.map((v, i) => ({
    x: pad + (i / (history.length - 1)) * (W - pad * 2),
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
      style={{ height: 112 }}
    >
      <defs>
        <linearGradient id="btc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.06" />
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

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatChange(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const stats = [
  { label: "Market Cap", value: "$1.33T" },
  { label: "24h Volume", value: "$38.2B" },
  { label: "Dominance", value: "54.1%" },
  { label: "Block", value: "841,204" },
];

export default async function BitcoinPanel() {
  const data = (await fetchBTCData()) ?? FALLBACK;
  const isUp = data.change24h >= 0;

  return (
    <Card
      className="p-5 md:p-8 h-full flex flex-col"
      id="bitcoin"
      glow="0 0 100px rgba(245, 158, 11, 0.08)"
    >
      {/* Label */}
      <div className="flex items-center gap-2 mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/50">
          Bitcoin · BTC/USD
        </p>
        <span
          className="pulse-live w-1.5 h-1.5 rounded-full"
          style={{ background: "#f59e0b", boxShadow: "0 0 6px rgba(245,158,11,0.8)" }}
        />
      </div>

      {/* Price row */}
      <div className="flex items-end justify-between mb-2">
        <p
          className="price-breathe text-4xl font-semibold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatPrice(data.price)}
        </p>
        <div className="text-right mb-1">
          <span
            className="inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full"
            style={{
              color: isUp ? "rgba(52,211,153,1)" : "rgba(248,113,113,1)",
              background: isUp ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
              border: isUp ? "1px solid rgba(52,211,153,0.12)" : "1px solid rgba(248,113,113,0.12)",
            }}
          >
            <svg viewBox="0 0 10 10" fill="currentColor" className="w-2 h-2">
              {isUp
                ? <path d="M5 1.5l3.5 5h-7L5 1.5z" />
                : <path d="M5 8.5l3.5-5h-7L5 8.5z" />
              }
            </svg>
            {formatChange(data.change24h)}
          </span>
          <p className="text-[10px] text-white/20 mt-1.5">24h change</p>
        </div>
      </div>

      {/* Chart */}
      <div className="my-3 -mx-1">
        <GlowSparkline history={data.history} />
      </div>
      <div className="flex justify-between text-[10px] text-white/15 px-1">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
      <p className="text-[9px] text-white/15 text-right mb-4 -mt-0.5">Updated just now</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 mt-auto">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3.5"
            style={{
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/25 mb-1.5">{label}</p>
            <p className="text-sm font-semibold text-white/80">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
