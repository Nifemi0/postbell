import { Candle, DerivativesTelemetry } from "./types";

interface BasePriceInfo {
  basePrice: number;
  dailyVol: number;
  name: string;
}

const SYMBOL_MAP: Record<string, BasePriceInfo> = {
  "BTC/USDT": { basePrice: 65420.0, dailyVol: 2850000000, name: "Bitcoin" },
  "ETH/USDT": { basePrice: 3480.0, dailyVol: 1420000000, name: "Ethereum" },
  "SOL/USDT": { basePrice: 154.5, dailyVol: 890000000, name: "Solana" },
  "SUI/USDT": { basePrice: 2.15, dailyVol: 340000000, name: "Sui Network" },
  "DOGE/USDT": { basePrice: 0.138, dailyVol: 410000000, name: "Dogecoin" },
  "XRP/USDT": { basePrice: 0.584, dailyVol: 520000000, name: "XRP" }
};

// In-memory cache to keep continuity and simulated micro-variations
const liveState: Record<string, { currentPrice: number; lastUpdate: number }> = {};

function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().replace("-", "/").replace("_", "/");
  if (!upper.includes("/")) {
    if (upper.endsWith("USDT")) {
      return upper.slice(0, -4) + "/USDT";
    }
    return upper + "/USDT";
  }
  return upper;
}

export function getCleanSymbol(symbol: string): string {
  const norm = normalizeSymbol(symbol);
  return SYMBOL_MAP[norm] ? norm : "BTC/USDT";
}

export async function fetchLiveTickerPrice(symbol: string): Promise<number> {
  const clean = getCleanSymbol(symbol);
  const info = SYMBOL_MAP[clean];
  const binanceSymbol = clean.replace("/", "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json() as { price: string };
      const parsed = parseFloat(data.price);
      if (!isNaN(parsed) && parsed > 0) {
        liveState[clean] = { currentPrice: parsed, lastUpdate: Date.now() };
        return parsed;
      }
    }
  } catch {
    // Fallback to state / realistic micro-tick
  }

  if (!liveState[clean]) {
    liveState[clean] = { currentPrice: info.basePrice, lastUpdate: Date.now() };
  } else {
    // Add small random walk (-0.15% to +0.15%)
    const delta = (Math.random() - 0.495) * 0.003 * liveState[clean].currentPrice;
    liveState[clean].currentPrice = Math.max(0.001, liveState[clean].currentPrice + delta);
    liveState[clean].lastUpdate = Date.now();
  }

  return liveState[clean].currentPrice;
}

export async function getLiveCandles(
  symbol: string,
  timeframe: string = "1h",
  limit: number = 100
): Promise<Candle[]> {
  const clean = getCleanSymbol(symbol);
  const binanceSymbol = clean.replace("/", "");
  const tfMap: Record<string, string> = {
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d"
  };
  const interval = tfMap[timeframe] || "1h";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const raw = await res.json() as (string | number)[][];
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((k) => {
          const t = Number(k[0]);
          return {
            timestamp: t,
            timeStr: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            open: parseFloat(String(k[1])),
            high: parseFloat(String(k[2])),
            low: parseFloat(String(k[3])),
            close: parseFloat(String(k[4])),
            volume: parseFloat(String(k[5]))
          };
        });
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback high-fidelity realistic candle generator
  return generateSyntheticCandles(clean, timeframe, limit);
}

export function generateSyntheticCandles(
  symbol: string,
  timeframe: string = "1h",
  limit: number = 100
): Candle[] {
  const clean = getCleanSymbol(symbol);
  const base = SYMBOL_MAP[clean].basePrice;
  const candles: Candle[] = [];

  const msPerTf: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000
  };
  const stepMs = msPerTf[timeframe] || 60 * 60 * 1000;
  const now = Date.now();
  let currentClose = base * (0.92 + Math.random() * 0.05);

  // Volatility scale
  const volPct = timeframe === "15m" ? 0.005 : timeframe === "1h" ? 0.012 : 0.025;

  for (let i = limit; i >= 0; i--) {
    const t = now - i * stepMs;
    const change = (Math.random() - 0.49) * volPct * currentClose;
    const open = currentClose;
    const close = Math.max(open * 0.5, open + change);
    const wickHigh = Math.random() * volPct * 0.6 * currentClose;
    const wickLow = Math.random() * volPct * 0.6 * currentClose;
    const high = Math.max(open, close) + wickHigh;
    const low = Math.min(open, close) - wickLow;
    const volume = (Math.random() * 0.5 + 0.75) * (SYMBOL_MAP[clean].dailyVol / (24 * 4));

    currentClose = close;

    candles.push({
      timestamp: t,
      timeStr: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      open: Number(open.toFixed(clean === "DOGE/USDT" ? 5 : 2)),
      high: Number(high.toFixed(clean === "DOGE/USDT" ? 5 : 2)),
      low: Number(low.toFixed(clean === "DOGE/USDT" ? 5 : 2)),
      close: Number(close.toFixed(clean === "DOGE/USDT" ? 5 : 2)),
      volume: Number(volume.toFixed(0))
    });
  }

  return candles;
}

export async function getLiveTelemetry(symbol: string): Promise<DerivativesTelemetry> {
  const clean = getCleanSymbol(symbol);
  const currentPrice = await fetchLiveTickerPrice(clean);
  const candles = await getLiveCandles(clean, "1h", 25);

  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const change24h = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
  const high24h = Math.max(...candles.map((c) => c.high));
  const low24h = Math.min(...candles.map((c) => c.low));
  const volume24h = candles.reduce((acc, c) => acc + c.volume * c.close, 0);

  // Simulated Bitget perpetual derivatives metrics
  // Normal funding rate oscillates around 0.01% (0.0001)
  const fundingRate = Number(((Math.random() * 0.025 - 0.008) / 100).toFixed(6));
  const predictedFundingRate = Number((fundingRate * 1.08).toFixed(6));
  const openInterestUsd = Number((volume24h * (2.8 + Math.random() * 0.5)).toFixed(0));
  const openInterestChange24h = Number(((Math.random() - 0.45) * 8.5).toFixed(2));
  const longShortRatio = Number((1.15 + (Math.random() - 0.5) * 0.4).toFixed(2));

  let squeezeRisk: DerivativesTelemetry["squeezeRisk"] = "BALANCED";
  if (fundingRate < -0.00015 && longShortRatio < 0.9) {
    squeezeRisk = "HIGH_SHORT_SQUEEZE";
  } else if (fundingRate < 0) {
    squeezeRisk = "MODERATE_SHORT_SQUEEZE";
  } else if (fundingRate > 0.0002 && longShortRatio > 1.4) {
    squeezeRisk = "HIGH_LONG_SQUEEZE";
  } else if (fundingRate > 0.0001) {
    squeezeRisk = "MODERATE_LONG_SQUEEZE";
  }

  // Sentiment Score (0 to 100)
  let sentimentScore = 50 + change24h * 3;
  if (fundingRate > 0.0001) sentimentScore += 10;
  if (squeezeRisk.includes("SHORT_SQUEEZE")) sentimentScore += 15;
  sentimentScore = Math.max(12, Math.min(88, Math.round(sentimentScore)));

  const totalLiq = volume24h * 0.018;
  const longLiqPct = change24h < 0 ? 0.68 : 0.32;

  return {
    symbol: clean,
    price: currentPrice,
    change24h: Number(change24h.toFixed(2)),
    high24h: Number(high24h.toFixed(2)),
    low24h: Number(low24h.toFixed(2)),
    volume24h: Number(volume24h.toFixed(0)),
    fundingRate,
    predictedFundingRate,
    openInterestUsd,
    openInterestChange24h,
    longShortRatio,
    liquidations24h: {
      totalUsd: Number(totalLiq.toFixed(0)),
      longUsd: Number((totalLiq * longLiqPct).toFixed(0)),
      shortUsd: Number((totalLiq * (1 - longLiqPct)).toFixed(0))
    },
    squeezeRisk,
    sentimentScore
  };
}

export async function getAllMarketTickers(): Promise<Array<{ symbol: string; price: number; change24h: number; volume: number }>> {
  const symbols = Object.keys(SYMBOL_MAP);
  const results = await Promise.all(
    symbols.map(async (s) => {
      const tel = await getLiveTelemetry(s);
      return {
        symbol: s,
        price: tel.price,
        change24h: tel.change24h,
        volume: tel.volume24h
      };
    })
  );
  return results;
}
