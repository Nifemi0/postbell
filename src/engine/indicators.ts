import { Candle, TechnicalSignals } from "./types";

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(values.length);

  // Initialize with SMA of first 'period' values or first value
  let sum = 0;
  const initCount = Math.min(values.length, period);
  for (let i = 0; i < initCount; i++) {
    sum += values[i];
  }
  let currentEma = sum / initCount;
  emaArray[initCount - 1] = currentEma;

  for (let i = initCount; i < values.length; i++) {
    currentEma = values[i] * k + currentEma * (1 - k);
    emaArray[i] = currentEma;
  }

  // Fill in any leading undef with first EMA
  for (let i = 0; i < initCount - 1; i++) {
    emaArray[i] = values[i];
  }

  return emaArray;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length <= period) {
    return closes.map(() => 50);
  }

  const rsi: number[] = new Array(closes.length).fill(50);
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    }

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = macdLine.map((m, i) => m - signalLine[i]);

  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateEMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - period + 1);
    const slice = closes.slice(start, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / slice.length;
    const stdDev = Math.sqrt(variance);

    upper.push(middle[i] + stdDevMultiplier * stdDev);
    lower.push(middle[i] - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

export function calculateVWAP(candles: Candle[]): number {
  let cumulativePv = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativePv += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
  }

  return cumulativeVolume > 0 ? cumulativePv / cumulativeVolume : candles[candles.length - 1].close;
}

export function computeTechnicalSignals(
  symbol: string,
  timeframe: string,
  candles: Candle[]
): TechnicalSignals {
  if (candles.length < 20) {
    throw new Error(`Insufficient candle data for ${symbol}. Need at least 20 bars.`);
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const rsis = calculateRSI(closes, 14);
  const currentRsi = Number(rsis[rsis.length - 1].toFixed(2));

  const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const lastHist = histogram[histogram.length - 1];
  const prevHist = histogram[histogram.length - 2] || 0;

  let macdCrossover: "BULLISH" | "BEARISH" | "NONE" = "NONE";
  if (lastHist > 0 && prevHist <= 0) macdCrossover = "BULLISH";
  else if (lastHist < 0 && prevHist >= 0) macdCrossover = "BEARISH";

  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, Math.min(200, closes.length));

  const ema20 = Number(ema20Arr[ema20Arr.length - 1].toFixed(2));
  const ema50 = Number(ema50Arr[ema50Arr.length - 1].toFixed(2));
  const ema200 = Number(ema200Arr[ema200Arr.length - 1].toFixed(2));

  let trend: TechnicalSignals["emas"]["trend"] = "UPTREND";
  if (currentPrice > ema20 && ema20 > ema50 && ema50 > ema200) trend = "STRONG_UPTREND";
  else if (currentPrice > ema50) trend = "UPTREND";
  else if (currentPrice < ema20 && ema20 < ema50 && ema50 < ema200) trend = "STRONG_DOWNTREND";
  else trend = "DOWNTREND";

  const bb = calculateBollingerBands(closes, 20, 2);
  const bbUpper = Number(bb.upper[bb.upper.length - 1].toFixed(2));
  const bbMiddle = Number(bb.middle[bb.middle.length - 1].toFixed(2));
  const bbLower = Number(bb.lower[bb.lower.length - 1].toFixed(2));
  const bandwidth = Number((((bbUpper - bbLower) / bbMiddle) * 100).toFixed(2));

  const vwap = Number(calculateVWAP(candles).toFixed(2));

  // Dynamic support & resistance from recent swings
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const recentLows = candles.slice(-20).map((c) => c.low);
  const resistanceLevel = Number(Math.max(...recentHighs).toFixed(2));
  const supportLevel = Number(Math.min(...recentLows).toFixed(2));

  // Multi-signal Composite Scoring
  let score = 50; // Neutral baseline
  const reasons: string[] = [];

  // RSI score
  let rsiState: "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT" = "NEUTRAL";
  if (currentRsi <= 32) {
    rsiState = "OVERSOLD";
    score += 18;
    reasons.push(`RSI oversold (${currentRsi})`);
  } else if (currentRsi >= 68) {
    rsiState = "OVERBOUGHT";
    score -= 18;
    reasons.push(`RSI overbought (${currentRsi})`);
  } else if (currentRsi > 50) {
    score += 5;
  } else {
    score -= 5;
  }

  // MACD score
  if (macdCrossover === "BULLISH") {
    score += 16;
    reasons.push("Bullish MACD crossover");
  } else if (macdCrossover === "BEARISH") {
    score -= 16;
    reasons.push("Bearish MACD crossover");
  } else if (lastHist > 0) {
    score += 7;
  } else {
    score -= 7;
  }

  // EMA trend score
  if (trend === "STRONG_UPTREND") {
    score += 15;
    reasons.push("Stacked EMA golden alignment (20 > 50 > 200)");
  } else if (trend === "UPTREND") {
    score += 8;
  } else if (trend === "STRONG_DOWNTREND") {
    score -= 15;
    reasons.push("Stacked EMA death alignment (20 < 50 < 200)");
  } else {
    score -= 8;
  }

  // VWAP position
  if (currentPrice > vwap) {
    score += 6;
  } else {
    score -= 6;
  }

  score = Math.max(5, Math.min(95, score));

  let compositeSignal: TechnicalSignals["compositeSignal"] = "NEUTRAL";
  if (score >= 75) compositeSignal = "STRONG_BUY";
  else if (score >= 60) compositeSignal = "BUY";
  else if (score <= 25) compositeSignal = "STRONG_SELL";
  else if (score <= 40) compositeSignal = "SELL";

  const confidenceScore = Math.abs(score - 50) * 2; // scale 0 to 100

  const summary = `${symbol} [${timeframe}] exhibits a ${compositeSignal.replace("_", " ")} signal (${confidenceScore}% confidence). ${reasons.join(". ")}. Price: \$${currentPrice}, RSI: ${currentRsi}, Trend: ${trend}.`;

  return {
    symbol,
    timeframe,
    currentPrice,
    rsi: currentRsi,
    rsiState,
    macd: {
      macdLine: Number(lastMacd.toFixed(3)),
      signalLine: Number(lastSignal.toFixed(3)),
      histogram: Number(lastHist.toFixed(3)),
      crossOver: macdCrossover
    },
    emas: {
      ema20,
      ema50,
      ema200,
      trend
    },
    bollinger: {
      upper: bbUpper,
      middle: bbMiddle,
      lower: bbLower,
      bandwidth
    },
    vwap,
    supportLevel,
    resistanceLevel,
    compositeSignal,
    confidenceScore,
    summary
  };
}
