import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { fetchBTCData, BTC_FALLBACK } from "@/lib/btc";

export const metadata: Metadata = {
  title: "Sovereign OS — Command Center",
  description: "A personal AI operating system for building, organizing, and executing in the AI-powered digital era.",
};

export default async function HomePage() {
  const rawBtc        = await fetchBTCData();
  const btc           = rawBtc ?? BTC_FALLBACK;
  const marketDataLive = rawBtc !== null;
  const hasAIKey      = !!process.env.ANTHROPIC_API_KEY;

  return (
    <DashboardShell
      btcPrice={btc.price}
      btcChange={btc.change24h}
      hasAIKey={hasAIKey}
      marketDataLive={marketDataLive}
    />
  );
}
