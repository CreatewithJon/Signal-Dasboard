"use client";

import { useState, useEffect } from "react";
import { Card } from "./Card";

const STACK_KEY = "signal_btc_stack";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function BTCStackPanel({ initialPrice }: { initialPrice?: number }) {
  const [btcAmount, setBtcAmount] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [price] = useState<number | null>(initialPrice ?? null);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STACK_KEY);
      if (raw) {
        const { btc, avg } = JSON.parse(raw);
        if (btc) setBtcAmount(btc);
        if (avg) setAvgCost(avg);
      }
    } catch {}
    setMounted(true);
  }, []);

  function save() {
    try {
      localStorage.setItem(STACK_KEY, JSON.stringify({ btc: btcAmount, avg: avgCost }));
    } catch {}
    setEditing(false);
  }

  const btc = parseFloat(btcAmount) || 0;
  const avg = parseFloat(avgCost) || 0;
  const currentValue = price ? btc * price : null;
  const invested = avg > 0 ? btc * avg : null;
  const pnl = currentValue !== null && invested !== null ? currentValue - invested : null;
  const pnlPct = invested && invested > 0 && pnl !== null ? (pnl / invested) * 100 : null;
  const isUp = pnl !== null ? pnl >= 0 : null;
  const showData = btc > 0 && mounted;

  return (
    <Card
      className="p-5 md:p-7 h-full flex flex-col gap-5"
      id="stack"
      glow="0 0 80px rgba(245,158,11,0.06)"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/50 mb-0.5">
            BTC Stack
          </p>
          <p className="text-xs text-white/25">Unrealized P&amp;L · Live price</p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-[10px] px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: editing ? "rgba(248,113,113,0.7)" : "rgba(255,255,255,0.3)",
          }}
        >
          {editing ? "Cancel" : showData ? "Edit" : "Setup"}
        </button>
      </div>

      {editing ? (
        /* ── Edit form ── */
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">BTC Holdings</p>
            <input
              type="number"
              step="0.00001"
              min="0"
              value={btcAmount}
              onChange={(e) => setBtcAmount(e.target.value)}
              placeholder="e.g. 0.25"
              className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Avg Cost Basis (USD / BTC)</p>
            <input
              type="number"
              min="0"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="e.g. 42000"
              className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <button
            onClick={save}
            className="py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.22)",
              color: "#f59e0b",
            }}
          >
            Save Stack
          </button>
        </div>
      ) : showData ? (
        /* ── Data view ── */
        <>
          {/* Current value hero */}
          <div className="py-1">
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Current Value</p>
            <p
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#f59e0b", textShadow: "0 0 20px rgba(245,158,11,0.3)" }}
            >
              {currentValue !== null ? fmt(currentValue) : "Loading…"}
            </p>
            <p className="text-sm text-white/30 mt-1">{btcAmount} ₿</p>
          </div>

          {/* P&L highlight */}
          {pnl !== null && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{
                background: isUp ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
                border: `1px solid ${isUp ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)"}`,
              }}
            >
              <p className="text-xs text-white/40">Unrealized P&L</p>
              <div className="text-right">
                <p
                  className="text-sm font-bold"
                  style={{ color: isUp ? "#34d399" : "#f87171" }}
                >
                  {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                </p>
                {pnlPct !== null && (
                  <p className="text-[10px] font-semibold" style={{ color: isUp ? "rgba(52,211,153,0.7)" : "rgba(248,113,113,0.7)" }}>
                    {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Invested", value: invested !== null ? fmt(invested) : "—", color: "rgba(255,255,255,0.7)" },
              { label: "BTC Price", value: price ? fmt(price) : "—", color: "rgba(245,158,11,0.85)" },
              { label: "Avg Cost", value: avg > 0 ? fmt(avg) : "—", color: "rgba(255,255,255,0.7)" },
              {
                label: "Multiple",
                value: avg > 0 && price ? `${(price / avg).toFixed(2)}×` : "—",
                color: price && avg && price > avg ? "#34d399" : "rgba(255,255,255,0.7)",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-3.5 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1.5">{s.label}</p>
                <p className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-white/15 text-center -mt-1">
            Price via CoinGecko · Updates on page load
          </p>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.14)",
              boxShadow: "0 0 24px rgba(245,158,11,0.1)",
            }}
          >
            <span className="text-2xl">₿</span>
          </div>
          <div>
            <p className="text-white/50 text-sm font-semibold mb-1">Track your stack</p>
            <p className="text-white/25 text-xs leading-relaxed max-w-[200px] mx-auto">
              Enter your BTC holdings to see live value and unrealized P&L.
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b",
            }}
          >
            Add Your Stack →
          </button>
        </div>
      )}
    </Card>
  );
}
