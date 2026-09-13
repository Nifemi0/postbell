import { getAllMarketTickers, getLiveCandles, getLiveTelemetry, getCleanSymbol } from "./marketData";
import { computeTechnicalSignals } from "./indicators";
import { runBacktest } from "./backtester";
import { calculateRiskPosition, executeSimulatedOrder } from "./riskManager";

export interface AgentResponse {
  answer: string;
  callsMade: Array<{ tool: string; result: any; latency: number }>;
  telemetry?: any;
  signals?: any;
  backtest?: any;
}

export async function processAgentQuery(
  prompt: string,
  targetSymbol: string = "BTC/USDT",
  timeframe: string = "1h",
  invokeToolCallback: (tool: string, args: any) => Promise<{ result: any; durationMs: number }>
): Promise<AgentResponse> {
  const p = prompt.trim();
  const pLower = p.toLowerCase();
  
  // Detect if user mentioned another symbol in the prompt (e.g. "what about ETH?", "analyze SOL")
  let symbolToUse = targetSymbol;
  if (/\b(eth|ethereum)\b/i.test(pLower)) symbolToUse = "ETH/USDT";
  else if (/\b(sol|solana)\b/i.test(pLower)) symbolToUse = "SOL/USDT";
  else if (/\b(sui)\b/i.test(pLower)) symbolToUse = "SUI/USDT";
  else if (/\b(doge|dogecoin)\b/i.test(pLower)) symbolToUse = "DOGE/USDT";
  else if (/\b(xrp|ripple)\b/i.test(pLower)) symbolToUse = "XRP/USDT";
  else if (/\b(btc|bitcoin)\b/i.test(pLower)) symbolToUse = "BTC/USDT";

  const cleanSym = getCleanSymbol(symbolToUse);
  const callsMade: Array<{ tool: string; result: any; latency: number }> = [];

  async function call(tool: string, args: any) {
    const res = await invokeToolCallback(tool, args);
    callsMade.push({ tool, result: res.result, latency: res.durationMs });
    return res.result;
  }

  // -------------------------------------------------------------
  // 1. CASUAL GREETINGS & IDENTITY
  // -------------------------------------------------------------
  if (/^(hi|hello|hey|yo|sup|greetings|who are you|what are you|help|gm)\b/i.test(pLower)) {
    const tel = await call("get_market_telemetry", { symbol: cleanSym });
    return {
      answer: `👋 **Yo! I am your NexusTrader AI Copilot.**

I analyze real-time orderbooks, compute quantitative indicators, monitor funding rate squeezes, and execute strategy backtests via the **Model Context Protocol (MCP)**.

Right now, **${cleanSym}** is at **\$${tel.price.toLocaleString()}** (${tel.change24h >= 0 ? "+" : ""}${tel.change24h}% 24h).

Here are some real questions you can ask me:
- *"Is ${cleanSym} going to pump or dump?"*
- *"Should I buy or sell right now?"*
- *"Compare BTC and ETH"*
- *"What is RSI and is ${cleanSym} oversold?"*
- *"Will there be a short squeeze on ${cleanSym}?"*
- *"Run a 30-day backtest with EMA reversal"*
- *"Calculate my position size for \$5,000 with 1.5% risk"*`,
      callsMade,
      telemetry: tel
    };
  }

  // -------------------------------------------------------------
  // 2. EDUCATIONAL & CONCEPT EXPLANATIONS
  // -------------------------------------------------------------
  if (pLower.includes("what is rsi") || pLower.includes("explain rsi") || pLower.includes("how does rsi")) {
    const sig = await call("compute_technical_signals", { symbol: cleanSym, timeframe });
    return {
      answer: `### 📈 What is the Relative Strength Index (RSI)?

The **RSI (14)** measures price momentum on a 0 to 100 scale:
- **Oversold (≤ 30-35):** Heavy selling pressure; potential relief bounce or mean reversion.
- **Overbought (≥ 65-70):** Heavy buying exhaustion; potential pullback or consolidation.
- **50 Centerline:** Above 50 indicates bullish momentum; below 50 indicates bearish bias.

#### 🔍 Live ${cleanSym} Reading:
- Current RSI: **\`${sig.rsi}\`** (${sig.rsiState})
- Current Price: **\$${sig.currentPrice.toLocaleString()}**
- Interpretation: ${sig.rsi < 35 ? "Asset is deeply oversold! Watch for bullish divergence." : sig.rsi > 65 ? "Asset is extended into overbought territory. Wait for a dip." : "RSI is in healthy middle equilibrium."}`,
      callsMade,
      signals: sig
    };
  }

  if (pLower.includes("funding rate") || pLower.includes("funding") || pLower.includes("what is funding") || pLower.includes("explain funding")) {
    const dev = await call("analyze_derivatives_bias", { symbol: cleanSym });
    return {
      answer: `### ⚡ What is the Perpetual Funding Rate?

Funding rates are periodic payments between long and short traders on derivatives exchanges (like Bitget) to keep perpetual contract prices aligned with the spot index:
- **Positive Funding (+):** Longs pay shorts. Indicates the crowd is heavily leveraged bullish. If too high (>0.03%), longs risk a **Long Squeeze**.
- **Negative Funding (-):** Shorts pay longs. Indicates extreme bearish crowd sentiment. Prime setup for a violent **Short Squeeze** upward!

#### ⚡ Live ${cleanSym} Derivatives Status:
- 8-Hour Funding Rate: **\`${dev.fundingRatePct}\`** (Predicted: \`${dev.predictedFundingRatePct}\`)
- Long/Short Ratio: **\`${dev.longShortRatio}\`**
- Squeeze Condition: **\`${dev.squeezeRisk.replace(/_/g, " ")}\`**
- *${dev.derivativesAnalysis}*`,
      callsMade
    };
  }

  if (pLower.includes("sharpe") || pLower.includes("drawdown") || pLower.includes("profit factor")) {
    return {
      answer: `### 📐 Quantitative Trading Metrics Explained

- **Sharpe Ratio:** Measures return earned per unit of volatility. A Sharpe > 1.5 indicates strong institutional risk-adjusted returns, while < 1.0 means you take on too much choppy risk.
- **Max Drawdown (MDD):** The largest peak-to-trough capital decline. We calibrate our strategies to keep MDD under 6%-8%.
- **Profit Factor:** Gross Profits divided by Gross Losses. A Profit Factor > 1.8 indicates a durable statistical edge.

Click **Run Audit** in the backtester panel to see these 3 metrics computed live on ${cleanSym}!`,
      callsMade
    };
  }

  if (pLower.includes("what is mcp") || pLower.includes("explain mcp") || pLower.includes("model context protocol")) {
    return {
      answer: `### 🔌 What is Model Context Protocol (MCP)?

**MCP** is an open standard that allows AI agents to securely connect to external tools, market data, and execution environments:
- Instead of being a blind text bot, **NexusTrader MCP** gives AI real eyes and hands:
  1. \`get_market_telemetry\`: Live exchange prices & perpetual funding.
  2. \`compute_technical_signals\`: Multi-timeframe indicator calculations.
  3. \`analyze_derivatives_bias\`: Long/short liquidation intelligence.
  4. \`run_strategy_backtest\`: 30-day algorithmic simulations.
  5. \`calculate_risk_position\`: Kelly-criterion risk sizing.
  6. \`simulate_order_execution\`: Paper trade execution with fee & slippage modeling.

You can inspect the raw JSON-RPC tool calls live in the **Live MCP Tool Inspector** on the right!`,
      callsMade
    };
  }

  // -------------------------------------------------------------
  // 3. COMPARISON INTENT ("compare btc and eth", "sol vs sui")
  // -------------------------------------------------------------
  if (pLower.includes("compare") || pLower.includes(" vs ") || pLower.includes("versus") || pLower.includes("better than")) {
    let symA = cleanSym;
    let symB = cleanSym === "BTC/USDT" ? "ETH/USDT" : "BTC/USDT";

    if (pLower.includes("eth") && pLower.includes("sol")) { symA = "ETH/USDT"; symB = "SOL/USDT"; }
    else if (pLower.includes("btc") && pLower.includes("sol")) { symA = "BTC/USDT"; symB = "SOL/USDT"; }
    else if (pLower.includes("btc") && pLower.includes("eth")) { symA = "BTC/USDT"; symB = "ETH/USDT"; }
    else if (pLower.includes("sui")) { symA = "SUI/USDT"; symB = "SOL/USDT"; }
    else if (pLower.includes("doge")) { symA = "DOGE/USDT"; symB = "BTC/USDT"; }

    const [telA, sigA, telB, sigB] = await Promise.all([
      call("get_market_telemetry", { symbol: symA }),
      call("compute_technical_signals", { symbol: symA, timeframe }),
      call("get_market_telemetry", { symbol: symB }),
      call("compute_technical_signals", { symbol: symB, timeframe })
    ]);

    const winner = sigA.confidenceScore > sigB.confidenceScore ? symA : symB;

    return {
      answer: `### ⚖️ Live Comparison: **${symA}** vs **${symB}**

| Metric | ${symA} | ${symB} | Edge |
| :--- | :--- | :--- | :--- |
| **Price** | \$${telA.price.toLocaleString()} | \$${telB.price.toLocaleString()} | -- |
| **24h Performance** | ${telA.change24h >= 0 ? "+" : ""}${telA.change24h}% | ${telB.change24h >= 0 ? "+" : ""}${telB.change24h}% | ${telA.change24h > telB.change24h ? symA : symB} |
| **24h Volume** | \$${(telA.volume24h / 1e6).toFixed(1)}M | \$${(telB.volume24h / 1e6).toFixed(1)}M | ${telA.volume24h > telB.volume24h ? symA : symB} |
| **RSI (14)** | \`${sigA.rsi}\` (${sigA.rsiState}) | \`${sigB.rsi}\` (${sigB.rsiState}) | -- |
| **Trend (EMA)** | \`${sigA.emas.trend}\` | \`${sigB.emas.trend}\` | ${sigA.emas.trend.includes("UP") ? symA : symB} |
| **Signal Model** | **\`${sigA.compositeSignal}\`** | **\`${sigB.compositeSignal}\`** | -- |
| **Model Confidence** | **${sigA.confidenceScore}%** | **${sigB.confidenceScore}%** | **${winner}** |

**💡 Algorithmic Edge:** **${winner}** currently shows the higher probability technical profile (**${Math.max(sigA.confidenceScore, sigB.confidenceScore)}% confidence**).`,
      callsMade,
      telemetry: telA,
      signals: sigA
    };
  }

  // -------------------------------------------------------------
  // 4. PREDICTION / PUMP / DUMP / DIRECTIONAL QUESTIONS
  // -------------------------------------------------------------
  if (
    pLower.includes("pump") || pLower.includes("dump") || pLower.includes("going up") ||
    pLower.includes("going down") || pLower.includes("will it rise") || pLower.includes("will it drop") ||
    pLower.includes("crash") || pLower.includes("bullish or bearish") || pLower.includes("outlook") ||
    pLower.includes("trend") || pLower.includes("forecast")
  ) {
    const [tel, sig, dev] = await Promise.all([
      call("get_market_telemetry", { symbol: cleanSym }),
      call("compute_technical_signals", { symbol: cleanSym, timeframe }),
      call("analyze_derivatives_bias", { symbol: cleanSym })
    ]);

    const isBull = sig.compositeSignal.includes("BUY");
    const isBear = sig.compositeSignal.includes("SELL");

    let trajectory = "sideways consolidation with low volatility";
    if (isBull && sig.confidenceScore > 60) trajectory = "upward expansion targeting higher resistance";
    else if (isBull) trajectory = "mild upward drift with support holding";
    else if (isBear && sig.confidenceScore > 60) trajectory = "downward distribution towards lower support";
    else if (isBear) trajectory = "mild downward pressure with sellers in control";

    return {
      answer: `### 🔮 Directional Market Outlook: **${cleanSym}** [${timeframe}]

**Short-Term Forecast:** The model anticipates **${trajectory}**.  
**Current Price:** **\$${tel.price.toLocaleString()}** (${tel.change24h >= 0 ? "+" : ""}${tel.change24h}% 24h)  
**Composite Model Bias:** **\`${sig.compositeSignal}\`** (${sig.confidenceScore}% confidence)

---

#### 📊 Key Technical Evidence:
1. **Trend & Moving Averages:** **${sig.emas.trend}**. Price is trading ${tel.price > sig.emas.ema20 ? "above" : "below"} the 20-period EMA (\$${sig.emas.ema20}).
2. **Momentum:** RSI(14) is at **\`${sig.rsi}\`** (${sig.rsiState}). MACD histogram is **\`${sig.macd.histogram}\`** (${sig.macd.crossOver} alignment).
3. **Derivatives Positioning:** 8h perpetual funding is **\`${dev.fundingRatePct}\`** with **\`${dev.squeezeRisk.replace(/_/g, " ")}\`**.

#### 🎯 Critical Price Pivots:
- **Immediate Resistance (Breakout Trigger):** **\$${sig.resistanceLevel}**
- **Immediate Support (Invalidation Zone):** **\$${sig.supportLevel}**`,
      callsMade,
      telemetry: tel,
      signals: sig
    };
  }

  // -------------------------------------------------------------
  // 5. DIRECT DECISION / TRADE RECOMMENDATION
  // -------------------------------------------------------------
  if (
    pLower.includes("should i buy") || pLower.includes("should i sell") || pLower.includes("buy or sell") ||
    pLower.includes("recommend") || pLower.includes("verdict") || pLower.includes("long or short") ||
    pLower.includes("what should i do") || pLower.includes("what to do") || pLower.includes("entry") ||
    pLower.includes("give me a trade") || pLower.includes("setup")
  ) {
    const [tel, sig, dev] = await Promise.all([
      call("get_market_telemetry", { symbol: cleanSym }),
      call("compute_technical_signals", { symbol: cleanSym, timeframe }),
      call("analyze_derivatives_bias", { symbol: cleanSym })
    ]);

    const isBull = sig.compositeSignal.includes("BUY");
    const isBear = sig.compositeSignal.includes("SELL");

    const action = isBull ? "🟢 OPEN LONG / ACCUMULATE" : isBear ? "🔴 OPEN SHORT / TAKE PROFIT" : "🟡 HOLD / WAIT FOR CONFIRMATION";
    const slPrice = isBull ? Number((tel.price * 0.982).toFixed(2)) : Number((tel.price * 1.018).toFixed(2));
    const tp1Price = isBull ? Number((tel.price * 1.036).toFixed(2)) : Number((tel.price * 0.964).toFixed(2));
    const tp2Price = isBull ? Number((tel.price * 1.065).toFixed(2)) : Number((tel.price * 0.935).toFixed(2));

    return {
      answer: `### 🎯 NexusTrader Trade Verdict: **${cleanSym}** [${timeframe}]

**Suggested Action:** **\`${action}\`**  
**Model Confidence:** **${sig.confidenceScore}%** (${sig.compositeSignal.replace("_", " ")})

---

#### 🛡️ Institutional Risk-Controlled Trade Plan:
- **Entry Zone:** **\$${tel.price.toLocaleString()}**
- **Stop Loss (Hard Invalidation):** **\$${slPrice.toLocaleString()}** (-1.8% risk)
- **Target 1 (1:2 R/R):** **\$${tp1Price.toLocaleString()}** (+3.6% gain)
- **Target 2 (1:3.6 R/R):** **\$${tp2Price.toLocaleString()}** (+6.5% gain)

#### 🔍 Rationale:
- **RSI:** \`${sig.rsi}\` (${sig.rsiState})
- **Trend:** \`${sig.emas.trend}\` (EMA20: \$${sig.emas.ema20} | EMA50: \$${sig.emas.ema50})
- **Perp Funding:** \`${dev.fundingRatePct}\` (${dev.squeezeRisk.replace(/_/g, " ")})
- **Max Allocation Rule:** Cap risk at 1.5% - 2.0% of portfolio equity.`,
      callsMade,
      telemetry: tel,
      signals: sig
    };
  }

  // -------------------------------------------------------------
  // 6. POSITION SIZING & CAPITAL MANAGEMENT
  // -------------------------------------------------------------
  if (
    pLower.includes("position size") || pLower.includes("how much should i") ||
    (pLower.includes("size") && pLower.includes("risk")) || pLower.includes("calculate position") ||
    pLower.includes("how many units") || pLower.includes("kelly")
  ) {
    const balanceMatch = p.match(/\$\s*([\d,]+)/i) || p.match(/([\d,]+)\s*(?:usd|dollars|balance|account)/i);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : 10000;
    const riskMatch = p.match(/(\d+(\.\d+)?)%/);
    const riskPct = riskMatch ? parseFloat(riskMatch[1]) : 2.0;

    const tel = await call("get_market_telemetry", { symbol: cleanSym });
    const slDistance = tel.price * 0.02; // 2% stop loss
    const slPrice = tel.price - slDistance;

    const riskResult = await call("calculate_risk_position", {
      symbol: cleanSym,
      accountBalance: balance,
      riskPercentage: riskPct,
      entryPrice: tel.price,
      stopLossPrice: slPrice
    });

    return {
      answer: `### 🛡️ NexusTrader Risk & Position Sizing Calculator

Based on **${cleanSym}** at **\$${tel.price.toLocaleString()}**:

- **Account Capital:** \$${balance.toLocaleString()} USD
- **Risk Budget:** ${riskPct}% = **\$${riskResult.riskCapitalUsd.toFixed(2)} at risk**
- **Stop Loss:** \$${slPrice.toFixed(2)} (-2.00%)

---

#### 📊 Precise Trade Sizing:
- **Units to Buy:** **\`${riskResult.positionUnits} ${cleanSym.split("/")[0]}\`**
- **Total Position Notional Value:** **\$${riskResult.positionSizeUsd.toLocaleString()} USD**
- **Maximum Downside:** **-\$${riskResult.maxLossUsd}** (if stop loss triggers)
- **Target 1 (1:2 R/R):** **\$${riskResult.suggestedTp1}** (Profit: +\$${(riskResult.maxLossUsd * 2).toFixed(2)})
- **Target 2 (1:3 R/R):** **\$${riskResult.suggestedTp2}** (Profit: +\$${(riskResult.maxLossUsd * 3).toFixed(2)})

*Guidance:* ${riskResult.recommendationNote}`,
      callsMade,
      telemetry: tel
    };
  }

  // -------------------------------------------------------------
  // 7. STRATEGY AUDIT & BACKTESTING
  // -------------------------------------------------------------
  if (pLower.includes("backtest") || pLower.includes("strategy") || pLower.includes("audit") || pLower.includes("test")) {
    const strat = pLower.includes("breakout") ? "BREAKOUT_MOMENTUM" : pLower.includes("mean") ? "MEAN_REVERSION_BB" : "EMA_RSI_REVERSAL";
    const [tel, bt] = await Promise.all([
      call("get_market_telemetry", { symbol: cleanSym }),
      call("run_strategy_backtest", {
        symbol: cleanSym,
        strategy: strat,
        timeframe,
        days: 30
      })
    ]);

    return {
      answer: `### 🔬 30-Day Quantitative Strategy Backtest: **${cleanSym}**

**Strategy Tested:** **\`${bt.strategyName}\`**  
**Timeframe:** 1-Hour Candlesticks (30 Days lookback)

---

#### 📊 Quantitative Performance Scorecard:
- **Win Rate:** **${bt.winRatePct}%** (${bt.winTrades} Wins / ${bt.lossTrades} Losses across ${bt.totalTrades} trades)
- **Net Profit:** **${bt.netProfitUsd >= 0 ? "+" : ""}\$${bt.netProfitUsd.toLocaleString()} USD** (${bt.totalReturnPct}% ROI on \$10,000 capital)
- **Profit Factor:** **\`${bt.profitFactor}\`** (Gross Gains / Gross Losses)
- **Max Drawdown:** **\`-${bt.maxDrawdownPct}%\`**
- **Annualized Sharpe Ratio:** **\`${bt.sharpeRatio}\`**

The interactive equity curve has been rendered on your chart panel below!`,
      callsMade,
      telemetry: tel,
      backtest: bt
    };
  }

  // -------------------------------------------------------------
  // 8. GENERAL / DEFAULT LIVE ANALYSIS
  // -------------------------------------------------------------
  const [tel, sig, dev] = await Promise.all([
    call("get_market_telemetry", { symbol: cleanSym }),
    call("compute_technical_signals", { symbol: cleanSym, timeframe }),
    call("analyze_derivatives_bias", { symbol: cleanSym })
  ]);

  return {
    answer: `### 📊 Live Market Telemetry: **${cleanSym}** [${timeframe}]

**Price:** **\$${tel.price.toLocaleString()}** (${tel.change24h >= 0 ? "+" : ""}${tel.change24h}% 24h) | **Volume:** \$${(tel.volume24h / 1e6).toFixed(1)}M

- **Algorithmic Signal:** **\`${sig.compositeSignal}\`** (${sig.confidenceScore}% confidence)
- **RSI (14):** \`${sig.rsi}\` (${sig.rsiState})
- **Moving Average Trend:** \`${sig.emas.trend}\` (EMA20: \$${sig.emas.ema20}, EMA50: \$${sig.emas.ema50})
- **Perpetual Funding:** \`${dev.fundingRatePct}\` (${dev.squeezeRisk.replace(/_/g, " ")})
- **Key Support / Resistance:** **\$${sig.supportLevel}** / **\$${sig.resistanceLevel}**

Ask me anything specific: *"Should I buy now?"*, *"Is there a squeeze?"*, *"Run backtest"*, or *"Compare with ETH"*!`,
    callsMade,
    telemetry: tel,
    signals: sig
  };
}
