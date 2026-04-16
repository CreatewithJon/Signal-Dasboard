interface MetricPillProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
}

export function MetricDisplay({ label, value, sub, trend, accentColor }: MetricPillProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-white/30";

  return (
    <div
      className="flex items-center gap-4 px-6 py-3.5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 mb-1">
          {label}
        </p>
        <p
          className="text-xl font-semibold tracking-tight"
          style={{ color: accentColor ?? "rgba(255,255,255,0.9)" }}
        >
          {value}
        </p>
      </div>
      {sub && (
        <p className={`text-xs font-medium ml-auto ${trendColor}`}>{sub}</p>
      )}
    </div>
  );
}
