export type PostbellDataMode = "representative" | "live";
import { enhanceResearchWithLlm, type LlmConnectionInput } from "./llmProvider";

export interface PostbellEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  category: "MARKET DATA" | "CROSS-ASSET" | "PRIMARY SOURCE";
}

export interface PostbellSignal {
  symbol: string;
  name: string;
  shortName: string;
  price: number;
  overnightChangePct: number;
  premiumPct: number;
  volumeMultiple: number;
  confidence: number;
  direction: "up" | "down";
  thesis: string;
  risk: string;
  chart: number[];
  events: PostbellEvent[];
  sources: Array<{ id: number; title: string; detail: string }>;
  scenarios: PostbellScenario[];
  referenceCloseSource?: string;
  dataMode?: PostbellDataMode;
  chartSource?: string;
}

export interface PostbellScenario {
  id: "bull" | "base" | "bear";
  label: string;
  probabilityPct: number;
  title: string;
  detail: string;
  invalidation: string;
  hypothetical: true;
}

export interface PostbellBrief {
  generatedAt: string;
  session: string;
  dataMode: PostbellDataMode;
  coverage: { assets: number; venues: number; latencySeconds: number };
  signals: PostbellSignal[];
}

export interface PostbellMarketQuote {
  symbol: string;
  tokenPrice: number;
  referenceClose: number;
  volume24h: number;
  volumeMedian: number;
  observedAt: string;
  source: string;
  referenceCloseSource: string;
  dataMode: PostbellDataMode;
}

export interface PostbellResearchResult {
  question: string;
  symbol: string;
  generatedAt: string;
  dataMode: PostbellDataMode;
  steps: {
    detect: string;
    connect: string;
    decide: string;
  };
  evidence: Array<{
    title: string;
    detail: string;
    url: string;
    status: "live" | "representative" | "pending";
  }>;
  uncertainty: string;
  analyst: string;
}

export interface OvernightMetrics {
  premiumPct: number;
  volumeMultiple: number;
  divergenceScore: number;
  direction: "up" | "down" | "flat";
}

export function calculateOvernightMetrics(input: Pick<PostbellMarketQuote, "tokenPrice" | "referenceClose" | "volume24h" | "volumeMedian">): OvernightMetrics {
  const premiumPct = input.referenceClose > 0 ? ((input.tokenPrice - input.referenceClose) / input.referenceClose) * 100 : 0;
  const volumeMultiple = input.volumeMedian > 0 ? input.volume24h / input.volumeMedian : 0;
  const direction = premiumPct > 0.05 ? "up" : premiumPct < -0.05 ? "down" : "flat";
  const divergenceScore = Math.max(0, Math.min(100, Math.round(Math.abs(premiumPct) * 18 + Math.max(0, volumeMultiple - 1) * 12)));
  return { premiumPct, volumeMultiple, divergenceScore, direction };
}

const signalFixtures: Omit<PostbellSignal, "events" | "sources" | "scenarios">[] = [
  {
    symbol: "rNVDA",
    name: "NVIDIA tokenized stock",
    shortName: "Nvidia",
    price: 194.82,
    overnightChangePct: 3.84,
    premiumPct: 1.76,
    volumeMultiple: 2.8,
    confidence: 72,
    direction: "up",
    thesis: "Sector demand supports the move. The widening premium reduces entry quality.",
    risk: "Premium cools before the US open",
    chart: [126, 133, 105, 115, 89, 99, 78, 86, 50, 64, 25, 35]
  },
  {
    symbol: "rTSLA",
    name: "Tesla tokenized stock",
    shortName: "Tesla",
    price: 328.14,
    overnightChangePct: -2.16,
    premiumPct: -0.84,
    volumeMultiple: 1.9,
    confidence: 64,
    direction: "down",
    thesis: "The move is isolated to the name and lacks confirmation from the wider growth basket.",
    risk: "A thin overnight book exaggerates the selloff",
    chart: [42, 45, 38, 44, 51, 47, 58, 61, 69, 64, 76, 82]
  },
  {
    symbol: "rQQQ",
    name: "Nasdaq 100 tokenized basket",
    shortName: "Nasdaq 100",
    price: 612.47,
    overnightChangePct: 1.07,
    premiumPct: 0.42,
    volumeMultiple: 1.4,
    confidence: 58,
    direction: "up",
    thesis: "Broad participation keeps the signal constructive, although the move remains early.",
    risk: "Breadth narrows into the cash open",
    chart: [121, 117, 114, 108, 110, 96, 102, 92, 88, 91, 78, 74]
  }
];

function eventTime(minutesAgo: number, now: Date): string {
  const date = new Date(now.getTime() - minutesAgo * 60_000);
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" }).format(date);
}

function withEvidence(signal: Omit<PostbellSignal, "events" | "sources" | "scenarios">, now: Date): PostbellSignal {
  const isNvda = signal.symbol === "rNVDA";
  return {
    ...signal,
    events: [
      {
        id: `${signal.symbol}-premium`,
        timestamp: eventTime(42, now),
        title: isNvda ? "Premium crossed its normal range" : "Overnight range expanded",
        detail: `Volume reached ${signal.volumeMultiple.toFixed(1)}× the overnight median.`,
        category: "MARKET DATA"
      },
      {
        id: `${signal.symbol}-context`,
        timestamp: eventTime(24, now),
        title: isNvda ? "Semiconductor tokens confirmed the move" : "Cross-asset context is still forming",
        detail: isNvda ? "rAMD and rQQQ advanced in the same window." : "The related basket has not fully confirmed the move yet.",
        category: "CROSS-ASSET"
      }
    ],
    sources: [
      { id: 1, title: `Bitget ${signal.symbol} market data`, detail: "Price, volume and premium · representative snapshot" },
      { id: 2, title: "Cross-asset token basket", detail: "Related markets and breadth · representative snapshot" },
      { id: 3, title: "Primary-source monitor", detail: "Filings and company IR · provider pending" }
    ],
    scenarios: [
      {
        id: "bull",
        label: "Bull",
        probabilityPct: 30,
        title: "Premium holds, breakout extends",
        detail: "Cross-asset demand persists into the cash open and the token premium remains orderly.",
        invalidation: "Premium expands beyond 3%",
        hypothetical: true
      },
      {
        id: "base",
        label: "Base",
        probabilityPct: 50,
        title: "Premium cools, trend holds",
        detail: "The token retraces toward the reference range before another attempt higher.",
        invalidation: "Reference close loses support",
        hypothetical: true
      },
      {
        id: "bear",
        label: "Bear",
        probabilityPct: 20,
        title: "Overnight move fades",
        detail: "Thin liquidity unwinds the move and related markets fail to confirm.",
        invalidation: "Breadth confirms at the open",
        hypothetical: true
      }
    ]
  };
}

async function fetchBitgetChart(symbol: string): Promise<number[] | null> {
  const endpoint = process.env.POSTBELL_BITGET_URL ?? "https://api.bitget.com/api/v3/market/candles";
  if (!endpoint.includes("api.bitget.com")) return null;
  const apiSymbol = `${symbol.replace(/^r/i, "r").replace(/\/.*$/, "")}USDT`.toUpperCase();
  const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}category=SPOT&symbol=${encodeURIComponent(apiSymbol)}&interval=1H&type=market&limit=48`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload: any = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const closes = rows.map((row: any[]) => Number(row?.[4])).filter((value: number) => Number.isFinite(value) && value > 0).reverse();
    return closes.length > 1 ? closes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPostbellBrief(): Promise<PostbellBrief> {
  const now = new Date();
  const [liveQuotes, liveCharts] = await Promise.all([
    Promise.all(signalFixtures.map((signal) => fetchBitgetQuote(signal.symbol))),
    Promise.all(signalFixtures.map((signal) => fetchBitgetChart(signal.symbol)))
  ]);
  const liveCount = liveQuotes.filter(Boolean).length;
  return {
    generatedAt: now.toISOString(),
    session: "Overnight watch",
    dataMode: liveCount === signalFixtures.length ? "live" : "representative",
    coverage: { assets: 34, venues: 1, latencySeconds: 4 },
    signals: signalFixtures.map((signal, index) => {
      const quote = liveQuotes[index];
      if (!quote) return withEvidence(signal, now);
      const metrics = calculateOvernightMetrics(quote);
      const enriched = withEvidence({
        ...signal,
        chart: liveCharts[index] ?? signal.chart,
        chartSource: liveCharts[index] ? "Bitget 1H candles · live" : "Representative chart · Bitget candles unavailable",
        price: quote.tokenPrice,
        overnightChangePct: metrics.premiumPct,
        premiumPct: metrics.premiumPct,
        volumeMultiple: metrics.volumeMultiple,
        direction: metrics.direction === "down" ? "down" : "up",
        confidence: Math.max(signal.confidence, metrics.divergenceScore),
        thesis: `Live Bitget data shows a ${Math.abs(metrics.premiumPct).toFixed(2)}% token ${metrics.premiumPct >= 0 ? "premium" : "discount"} with ${metrics.volumeMultiple.toFixed(1)}× median volume.`,
        risk: "Reference close and source confirmation remain the key watchpoints"
      }, now);
      enriched.referenceCloseSource = quote.referenceCloseSource;
      enriched.dataMode = "live";
      enriched.sources[0].detail = `Price, volume and premium · ${quote.referenceCloseSource} · live ticker; chart: ${enriched.chartSource}`;
      return enriched;
    })
  };
}

export async function getPostbellSignal(symbol = "rNVDA"): Promise<PostbellSignal> {
  const brief = await getPostbellBrief();
  return brief.signals.find((signal) => signal.symbol.toUpperCase() === symbol.toUpperCase()) ?? brief.signals[0];
}

function numberFrom(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Bitget's official public ticker adapter. Set POSTBELL_BITGET_URL only when
 * routing through a proxy; otherwise the official endpoint is used directly.
 */
export async function fetchBitgetQuote(symbol: string): Promise<PostbellMarketQuote | null> {
  const endpoint = process.env.POSTBELL_BITGET_URL ?? "https://api.bitget.com/api/v3/market/tickers";
  const bitgetEndpoint = endpoint.includes("api.bitget.com/api/v3/market/tickers");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const apiSymbol = `${symbol.replace(/^r/i, "r").replace(/\/.*$/, "")}USDT`.toUpperCase();
    const query = bitgetEndpoint
      ? `category=SPOT&symbol=${encodeURIComponent(apiSymbol)}`
      : `symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}${query}`, { signal: controller.signal });
    if (!response.ok) return null;
    const payload: any = await response.json();
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [payload?.data ?? payload];
    const row = rows.find((item: any) => String(item?.symbol ?? item?.instId ?? "").toUpperCase().includes(apiSymbol)) ?? rows[0];
    const tokenPrice = numberFrom(row?.lastPrice ?? row?.last ?? row?.close ?? row?.price);
    const referenceClose = numberFrom(row?.referenceClose ?? row?.underlyingClose ?? row?.prevClose ?? row?.openPrice24h);
    const volume24h = numberFrom(row?.volume24h ?? row?.baseVolume ?? row?.volume) ?? 0;
    const volumeMedian = numberFrom(row?.volumeMedian ?? row?.medianVolume) ?? volume24h;
    if (!tokenPrice || !referenceClose) return null;
    const rawTimestamp = Number(row?.ts ?? row?.timestamp ?? Date.now());
    return {
      symbol,
      tokenPrice,
      referenceClose,
      volume24h,
      volumeMedian,
      observedAt: new Date(rawTimestamp < 1e12 ? rawTimestamp * 1000 : rawTimestamp).toISOString(),
      source: bitgetEndpoint ? "Bitget public spot ticker" : "Bitget read-only proxy",
      referenceCloseSource: row?.referenceClose || row?.underlyingClose || row?.prevClose ? "Bitget reference field" : "Bitget 24h open proxy",
      dataMode: "live"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPostbellMarketQuote(symbol = "rNVDA"): Promise<PostbellMarketQuote> {
  const live = await fetchBitgetQuote(symbol);
  if (live) return live;
  const signal = await getPostbellSignal(symbol);
  const referenceClose = signal.price / (1 + signal.premiumPct / 100);
  return {
    symbol: signal.symbol,
    tokenPrice: signal.price,
    referenceClose,
    volume24h: signal.volumeMultiple * 1_000_000,
    volumeMedian: 1_000_000,
    observedAt: new Date().toISOString(),
    source: "Postbell representative fixture",
    referenceCloseSource: "Postbell representative fixture",
    dataMode: "representative"
  };
}

const secCompanyMap: Record<string, { cik: string; name: string }> = {
  rNVDA: { cik: "0001045810", name: "NVIDIA" },
  rTSLA: { cik: "0001318605", name: "Tesla" }
};

async function fetchPrimarySource(symbol: string): Promise<PostbellResearchResult["evidence"][number] | null> {
  const company = secCompanyMap[symbol.toUpperCase()];
  if (!company) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`https://data.sec.gov/submissions/CIK${company.cik}.json`, {
      signal: controller.signal,
      headers: { "User-Agent": "Postbell research demo" }
    });
    if (!response.ok) return null;
    const payload: any = await response.json();
    const recent = payload?.filings?.recent;
    const forms: string[] = recent?.form ?? [];
    const index = forms.findIndex((form) => ["8-K", "10-Q", "10-K"].includes(form));
    if (index < 0) return null;
    const accession = String(recent.accessionNumber[index] ?? "").replace(/-/g, "");
    const document = String(recent.primaryDocument[index] ?? "");
    if (!accession || !document) return null;
    const filingDate = String(recent.filingDate[index] ?? "");
    const form = forms[index];
    return {
      title: `${company.name} ${form} filing`,
      detail: `${form} filed ${filingDate} · SEC primary source`,
      url: `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${accession}/${document}`,
      status: "live"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runPostbellResearch(question: string, symbol = "rNVDA", llmConnection?: LlmConnectionInput): Promise<PostbellResearchResult> {
  const cleanQuestion = question.trim() || "What moved in the overnight rToken tape, what evidence explains it, and what should I watch at the open?";
  const brief = await getPostbellBrief();
  const signal = brief.signals.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? brief.signals[0];
  const peers = brief.signals.filter((item) => item.symbol !== signal.symbol);
  const peerMoves = peers.map((item) => `${item.symbol} ${item.overnightChangePct >= 0 ? "+" : "−"}${Math.abs(item.overnightChangePct).toFixed(2)}%`).join(", ");
  const livePeers = peers.every((item) => item.dataMode === "live");
  const primarySource = await fetchPrimarySource(signal.symbol);
  const evidence: PostbellResearchResult["evidence"] = [
    {
      title: `Bitget ${signal.symbol} ticker`,
      detail: signal.referenceCloseSource ? `${signal.referenceCloseSource} · ${signal.dataMode === "live" ? "live" : "representative"} data` : "Price, volume and premium",
      url: `https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=${signal.symbol.replace(/^r/i, "r").toUpperCase()}USDT`,
      status: signal.dataMode === "live" ? "live" : "representative"
    },
    {
      title: "Cross-asset token basket",
      detail: livePeers ? `Live Bitget peer moves: ${peerMoves}.` : (signal.events.find((event) => event.category === "CROSS-ASSET")?.detail ?? "Related markets and breadth"),
      url: "https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=RNVDAUSDT",
      status: livePeers ? "live" : "representative"
    }
  ];
  evidence.push(primarySource ?? {
    title: "Primary-source monitor",
    detail: "No matching SEC filing was available in this run; catalyst remains unconfirmed.",
    url: "https://www.sec.gov/edgar/search/",
    status: "pending"
  });
  const liveEvidence = evidence.some((item) => item.status === "live");
  const direction = signal.overnightChangePct >= 0 ? "up" : "down";
  const premium = `${Math.abs(signal.premiumPct).toFixed(2)}% ${signal.premiumPct >= 0 ? "premium" : "discount"}`;
  const deterministic: PostbellResearchResult = {
    question: cleanQuestion,
    symbol: signal.symbol,
    generatedAt: new Date().toISOString(),
    dataMode: signal.dataMode === "live" ? "live" : "representative",
    steps: {
      detect: `${signal.symbol} is ${direction} ${Math.abs(signal.overnightChangePct).toFixed(2)}% versus Bitget’s 24h reference, at ${premium} with ${signal.volumeMultiple.toFixed(1)}× median volume.`,
      connect: livePeers ? `${signal.symbol} is moving with ${peerMoves}; that is a basket signal, not proof of a company-specific catalyst.` : signal.thesis,
      decide: signal.premiumPct > 0.5 ? `The move is extended at ${premium}. Wait for the premium to compress or for a confirmed filing before adding risk.` : `Use the open to test whether the ${signal.symbol} move holds while ${peerMoves} stay aligned.`
    },
    evidence,
    uncertainty: liveEvidence ? "Prices and peer moves are live from Bitget. Postbell does not currently ingest a general news feed, so the catalyst remains unconfirmed unless SEC evidence is found." : "This run uses representative market data and has no confirmed primary-source catalyst.",
    analyst: `Postbell compared ${signal.symbol} with ${peers.map((item) => item.symbol).join(" and ")} and kept the catalyst separate from the price signal.`
  };
  return enhanceResearchWithLlm(llmConnection, deterministic);
}
