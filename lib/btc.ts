export interface BTCData {
  price: number;
  change24h: number;
  history: number[];
  marketCap: number;
  volume24h: number;
  dominance: number;
  blockHeight: number;
  fetchedAt: number; // Unix ms
}

export const BTC_FALLBACK: BTCData = {
  price: 67420,
  change24h: 2.34,
  history: [
    61200, 60800, 62100, 61500, 63400, 64200, 63800, 65100,
    64500, 66200, 65800, 67100, 66500, 68200, 67800, 69400,
    68900, 70200, 69600, 71300, 70800, 72100, 71500, 70200,
    69400, 68800, 67200, 68100, 67600, 67420,
  ],
  marketCap: 1330000000000,
  volume24h: 38200000000,
  dominance: 54.1,
  blockHeight: 0,
  fetchedAt: 0,
};

export async function fetchBTCData(): Promise<BTCData | null> {
  try {
    const [priceRes, historyRes, globalRes, blockRes] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
        { next: { revalidate: 300 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
        { next: { revalidate: 300 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/global",
        { next: { revalidate: 300 } }
      ),
      fetch("https://mempool.space/api/blocks/tip/height", {
        next: { revalidate: 300 },
      }),
    ]);

    if (!priceRes.ok || !historyRes.ok || !globalRes.ok) return null;

    const priceData = await priceRes.json();
    const historyData = await historyRes.json();
    const globalData = await globalRes.json();
    const blockHeight: number = blockRes.ok
      ? parseInt(await blockRes.text(), 10) || 0
      : 0;

    const price: number = priceData?.bitcoin?.usd ?? 0;
    const change24h: number = priceData?.bitcoin?.usd_24h_change ?? 0;
    const marketCap: number = priceData?.bitcoin?.usd_market_cap ?? 0;
    const volume24h: number = priceData?.bitcoin?.usd_24h_vol ?? 0;
    const dominance: number =
      globalData?.data?.market_cap_percentage?.btc ?? 0;
    const history: number[] = (historyData?.prices ?? []).map(
      ([, p]: [number, number]) => p
    );

    if (!price || history.length === 0) return null;

    return {
      price, change24h, history, marketCap, volume24h, dominance,
      blockHeight, fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatChange(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatLargeUSD(n: number): string {
  if (n >= 1_000_000_000_000) return "$" + (n / 1_000_000_000_000).toFixed(2) + "T";
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
