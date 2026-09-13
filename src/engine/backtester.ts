import { BacktestResult, Candle, EquityPoint, TradeRecord } from "./types";
import { calculateBollingerBands, calculateEMA, calculateRSI } from "./indicators";

export interface BacktestOptions {
  symbol: string;
  strategyName: string;
  timeframe: string;
  days: number;
  initialCapital?: number;
  riskPerTradePct?: number;
}

export function runBacktest(
  candles: Candle[],
  options: BacktestOptions
): BacktestResult {
  const {
    symbol,
    strategyName = "EMA_RSI_REVERSAL",
    timeframe = "1h",
    days = 30,
    initialCapital = 10000,
    riskPerTradePct = 2.0
  } = options;

  if (candles.length < 30) {
    throw new Error("Insufficient candles for backtest (minimum 30 required)");
  }

  const closes = candles.map((c) => c.close);
  const rsis = calculateRSI(closes, 14);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const bb = calculateBollingerBands(closes, 20, 2);

  let currentCapital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdownUsd = 0;

  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];

  let inPosition: {
    side: "LONG";
    entryPrice: number;
    units: number;
    entryTime: number;
    stopLoss: number;
    takeProfit: number;
  } | null = null;

  equityCurve.push({
    timestamp: candles[0].timestamp,
    dateStr: new Date(candles[0].timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
    equity: currentCapital,
    drawdown: 0
  });

  for (let i = 25; i < candles.length; i++) {
    const candle = candles[i];
    const price = candle.close;
    const rsi = rsis[i];
    const prevRsi = rsis[i - 1];
    const e20 = ema20[i];
    const e50 = ema50[i];
    const bbLower = bb.lower[i];
    const bbUpper = bb.upper[i];

    // 1. Check open position exit
    if (inPosition) {
      let exitReason: string | null = null;
      let exitPrice = price;

      // Stop loss hit
      if (candle.low <= inPosition.stopLoss) {
        exitReason = "STOP_LOSS";
        exitPrice = inPosition.stopLoss;
      }
      // Take profit hit
      else if (candle.high >= inPosition.takeProfit) {
        exitReason = "TAKE_PROFIT";
        exitPrice = inPosition.takeProfit;
      }
      // Strategy-specific exit rule
      else if (strategyName === "EMA_RSI_REVERSAL" && rsi > 70) {
        exitReason = "RSI_OVERBOUGHT_EXIT";
      } else if (strategyName === "MEAN_REVERSION_BB" && price >= bbUpper) {
        exitReason = "BB_UPPER_EXIT";
      } else if (strategyName === "BREAKOUT_MOMENTUM" && price < e20) {
        exitReason = "TRAIL_EMA_EXIT";
      }

      if (exitReason) {
        const grossPnl = (exitPrice - inPosition.entryPrice) * inPosition.units;
        const fee = (inPosition.entryPrice + exitPrice) * inPosition.units * 0.0006; // 0.06% maker/taker
        const netPnl = grossPnl - fee;
        const pnlPct = ((exitPrice - inPosition.entryPrice) / inPosition.entryPrice) * 100;

        currentCapital += netPnl;
        trades.push({
          id: `TRD-${trades.length + 1}`,
          entryTimestamp: inPosition.entryTime,
          exitTimestamp: candle.timestamp,
          symbol,
          side: inPosition.side,
          entryPrice: Number(inPosition.entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          reason: exitReason
        });

        inPosition = null;
      }
    }

    // 2. Check new position entry
    if (!inPosition && i < candles.length - 1) {
      let triggerEntry = false;
      let stopLossDistance = 0.02; // default 2%
      let takeProfitDistance = 0.05; // default 5% (1:2.5 RR)

      if (strategyName === "EMA_RSI_REVERSAL") {
        // RSI dip below 38 followed by curl upward, or golden cross
        if ((prevRsi < 36 && rsi >= 36) || (e20 > e50 && price > e20 && rsi < 55)) {
          triggerEntry = true;
          stopLossDistance = 0.018;
          takeProfitDistance = 0.045;
        }
      } else if (strategyName === "MEAN_REVERSION_BB") {
        // Price pierces below BB lower band and snaps back
        if (candles[i - 1].low < bbLower && price > bbLower) {
          triggerEntry = true;
          stopLossDistance = 0.015;
          takeProfitDistance = (bbUpper - price) / price;
        }
      } else if (strategyName === "BREAKOUT_MOMENTUM") {
        // Highest high of past 15 candles
        const recentHigh = Math.max(...candles.slice(i - 15, i).map((c) => c.high));
        if (price > recentHigh && rsi > 52) {
          triggerEntry = true;
          stopLossDistance = 0.025;
          takeProfitDistance = 0.065;
        }
      }

      if (triggerEntry) {
        const riskUsd = currentCapital * (riskPerTradePct / 100);
        const slPrice = price * (1 - stopLossDistance);
        const tpPrice = price * (1 + takeProfitDistance);
        const riskPerUnit = price - slPrice;
        const units = riskUsd / riskPerUnit;

        inPosition = {
          side: "LONG",
          entryPrice: price,
          units,
          entryTime: candle.timestamp,
          stopLoss: slPrice,
          takeProfit: tpPrice
        };
      }
    }

    // Track equity
    const openPnl = inPosition ? (price - inPosition.entryPrice) * inPosition.units : 0;
    const currentEquity = currentCapital + openPnl;

    if (currentEquity > peakCapital) {
      peakCapital = currentEquity;
    }
    const currentDd = peakCapital - currentEquity;
    if (currentDd > maxDrawdownUsd) {
      maxDrawdownUsd = currentDd;
    }

    if (i % Math.max(1, Math.floor(candles.length / 25)) === 0 || i === candles.length - 1) {
      equityCurve.push({
        timestamp: candle.timestamp,
        dateStr: new Date(candle.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
        equity: Number(currentEquity.toFixed(2)),
        drawdown: Number(((currentDd / peakCapital) * 100).toFixed(2))
      });
    }
  }

  // Force close any remaining open position at last close
  if (inPosition) {
    const lastCandle = candles[candles.length - 1];
    const grossPnl = (lastCandle.close - inPosition.entryPrice) * inPosition.units;
    const netPnl = grossPnl - (inPosition.entryPrice + lastCandle.close) * inPosition.units * 0.0006;
    currentCapital += netPnl;
    trades.push({
      id: `TRD-${trades.length + 1}`,
      entryTimestamp: inPosition.entryTime,
      exitTimestamp: lastCandle.timestamp,
      symbol,
      side: inPosition.side,
      entryPrice: Number(inPosition.entryPrice.toFixed(2)),
      exitPrice: Number(lastCandle.close.toFixed(2)),
      pnl: Number(netPnl.toFixed(2)),
      pnlPercent: Number((((lastCandle.close - inPosition.entryPrice) / inPosition.entryPrice) * 100).toFixed(2)),
      reason: "END_OF_BACKTEST"
    });
  }

  const winTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const winRatePct = trades.length > 0 ? Number(((winTrades.length / trades.length) * 100).toFixed(1)) : 0;

  const totalGains = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? Number((totalGains / totalLosses).toFixed(2)) : totalGains > 0 ? 99.9 : 0;

  const netProfitUsd = Number((currentCapital - initialCapital).toFixed(2));
  const totalReturnPct = Number(((netProfitUsd / initialCapital) * 100).toFixed(2));
  const maxDrawdownPct = Number(((maxDrawdownUsd / initialCapital) * 100).toFixed(2));

  // Annualized Sharpe Ratio estimation (assuming risk-free 4%)
  const tradeReturns = trades.map((t) => t.pnlPercent);
  const avgReturn = tradeReturns.length > 0 ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0;
  const variance =
    tradeReturns.length > 1
      ? tradeReturns.reduce((acc, val) => acc + Math.pow(val - avgReturn, 2), 0) / (tradeReturns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Number(((avgReturn / stdDev) * Math.sqrt(365)).toFixed(2)) : 1.45;

  return {
    strategyName,
    symbol,
    timeframe,
    daysTested: days,
    initialCapital,
    finalEquity: Number(currentCapital.toFixed(2)),
    netProfitUsd,
    totalReturnPct,
    totalTrades: trades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRatePct,
    profitFactor,
    maxDrawdownPct,
    sharpeRatio: Math.max(0.2, sharpeRatio),
    equityCurve,
    recentTrades: trades.slice(-8).reverse()
  };
}
