export interface Candle {
  timestamp: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignals {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  rsi: number;
  rsiState: "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT";
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    crossOver: "BULLISH" | "BEARISH" | "NONE";
  };
  emas: {
    ema20: number;
    ema50: number;
    ema200: number;
    trend: "STRONG_UPTREND" | "UPTREND" | "DOWNTREND" | "STRONG_DOWNTREND";
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  vwap: number;
  supportLevel: number;
  resistanceLevel: number;
  compositeSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  confidenceScore: number; // 0 - 100
  summary: string;
}

export interface DerivativesTelemetry {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate: number; // e.g. 0.0001 = 0.01%
  predictedFundingRate: number;
  openInterestUsd: number;
  openInterestChange24h: number;
  longShortRatio: number;
  liquidations24h: {
    totalUsd: number;
    longUsd: number;
    shortUsd: number;
  };
  squeezeRisk: "HIGH_SHORT_SQUEEZE" | "MODERATE_SHORT_SQUEEZE" | "BALANCED" | "MODERATE_LONG_SQUEEZE" | "HIGH_LONG_SQUEEZE";
  sentimentScore: number; // 0 - 100 (0 = Extreme Fear, 100 = Extreme Greed)
}

export interface TradeRecord {
  id: string;
  entryTimestamp: number;
  exitTimestamp: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

export interface EquityPoint {
  timestamp: number;
  dateStr: string;
  equity: number;
  drawdown: number;
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  timeframe: string;
  daysTested: number;
  initialCapital: number;
  finalEquity: number;
  netProfitUsd: number;
  totalReturnPct: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  equityCurve: EquityPoint[];
  recentTrades: TradeRecord[];
}

export interface RiskPositionResult {
  symbol: string;
  accountBalance: number;
  riskPercentage: number;
  riskCapitalUsd: number;
  entryPrice: number;
  stopLossPrice: number;
  stopLossDistancePct: number;
  positionUnits: number;
  positionSizeUsd: number;
  suggestedTp1: number;
  suggestedTp2: number;
  riskRewardRatio1: number;
  riskRewardRatio2: number;
  maxLossUsd: number;
  potentialProfitUsd: number;
  isTradeApproved: boolean;
  recommendationNote: string;
}

export interface SimulatedOrder {
  orderId: string;
  timestamp: number;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  units: number;
  requestedPrice: number;
  executionPrice: number;
  slippagePct: number;
  tradingFeeUsd: number;
  totalValueUsd: number;
  stopLoss?: number;
  takeProfit?: number;
  status: "FILLED" | "PENDING" | "CANCELLED";
}
