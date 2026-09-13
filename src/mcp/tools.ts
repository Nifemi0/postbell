import { McpPromptDefinition, McpToolDefinition } from "./protocol";
import { getLiveCandles, getLiveTelemetry } from "../engine/marketData";
import { computeTechnicalSignals } from "../engine/indicators";
import { runBacktest } from "../engine/backtester";
import { calculateRiskPosition, executeSimulatedOrder } from "../engine/riskManager";

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "get_market_telemetry",
    description:
      "Fetches real-time market data, price action, 24h volume, Bitget perpetual funding rates, and open interest for a cryptocurrency pair.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT, ETH/USDT, SOL/USDT, SUI/USDT, DOGE/USDT"
        }
      },
      required: ["symbol"]
    }
  },
  {
    name: "compute_technical_signals",
    description:
      "Calculates multi-indicator technical analysis (RSI-14, MACD, EMA 20/50/200 ribbons, Bollinger Bands, VWAP, Support/Resistance) and outputs a composite buy/sell signal with confidence score.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT, ETH/USDT, SOL/USDT"
        },
        timeframe: {
          type: "string",
          description: "Candle timeframe: '15m', '1h', '4h', or '1d'",
          enum: ["15m", "1h", "4h", "1d"]
        },
        limit: {
          type: "number",
          description: "Number of candle bars to analyze (default: 50, min: 30, max: 200)"
        }
      },
      required: ["symbol"]
    }
  },
  {
    name: "analyze_derivatives_bias",
    description:
      "Evaluates perpetual futures market bias, analyzing funding rate skew, open interest change, long/short liquidations, and flags short-squeeze or long-squeeze risks.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT, ETH/USDT"
        }
      },
      required: ["symbol"]
    }
  },
  {
    name: "run_strategy_backtest",
    description:
      "Runs quantitative backtesting for automated trading strategies over historical market data. Returns net profit %, win rate %, profit factor, max drawdown, Sharpe ratio, and equity curve.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT, ETH/USDT"
        },
        strategy: {
          type: "string",
          description: "Strategy model: 'EMA_RSI_REVERSAL', 'BREAKOUT_MOMENTUM', or 'MEAN_REVERSION_BB'",
          enum: ["EMA_RSI_REVERSAL", "BREAKOUT_MOMENTUM", "MEAN_REVERSION_BB"]
        },
        timeframe: {
          type: "string",
          description: "Candle timeframe: '15m', '1h', or '4h'",
          enum: ["15m", "1h", "4h"]
        },
        days: {
          type: "number",
          description: "Number of days to simulate (e.g. 14, 30, 60)"
        },
        initialCapital: {
          type: "number",
          description: "Starting portfolio capital in USD (default: 10000)"
        },
        riskPerTradePct: {
          type: "number",
          description: "Risk percentage per trade (default: 2.0)"
        }
      },
      required: ["symbol", "strategy"]
    }
  },
  {
    name: "calculate_risk_position",
    description:
      "Enforces strict risk management and position sizing based on portfolio capital, max risk percentage, entry price, and invalidation stop-loss.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT"
        },
        accountBalance: {
          type: "number",
          description: "Total portfolio equity in USD"
        },
        riskPercentage: {
          type: "number",
          description: "Max percentage of portfolio to risk on this trade (e.g. 1.5 for 1.5%)"
        },
        entryPrice: {
          type: "number",
          description: "Planned entry price in USD"
        },
        stopLossPrice: {
          type: "number",
          description: "Stop-loss invalidation price in USD"
        },
        takeProfitTarget: {
          type: "number",
          description: "Optional custom take profit target in USD"
        }
      },
      required: ["symbol", "accountBalance", "riskPercentage", "entryPrice", "stopLossPrice"]
    }
  },
  {
    name: "simulate_order_execution",
    description:
      "Executes a simulated paper order with realistic market slippage and exchange fee deduction.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto pair ticker symbol, e.g. BTC/USDT"
        },
        side: {
          type: "string",
          description: "Order direction: 'BUY' or 'SELL'",
          enum: ["BUY", "SELL"]
        },
        units: {
          type: "number",
          description: "Number of token units to trade"
        },
        orderType: {
          type: "string",
          description: "Order type: 'MARKET' or 'LIMIT'",
          enum: ["MARKET", "LIMIT"]
        },
        stopLoss: {
          type: "number",
          description: "Optional stop-loss price"
        },
        takeProfit: {
          type: "number",
          description: "Optional take-profit price"
        }
      },
      required: ["symbol", "side", "units"]
    }
  }
];

export const MCP_PROMPTS: McpPromptDefinition[] = [
  {
    name: "alpha_market_scanner",
    description: "Scan top crypto pairs to identify high-probability reversal and breakout setups",
    arguments: [
      {
        name: "timeframe",
        description: "Target timeframe (e.g. 1h, 4h)",
        required: false
      }
    ]
  },
  {
    name: "quantitative_audit",
    description: "Perform an in-depth algorithmic backtest and derivatives risk assessment for a specific token",
    arguments: [
      {
        name: "symbol",
        description: "Target token symbol (e.g. BTC/USDT)",
        required: true
      }
    ]
  }
];

export async function handleMcpToolCall(toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case "get_market_telemetry": {
      const symbol = args.symbol || "BTC/USDT";
      return await getLiveTelemetry(symbol);
    }

    case "compute_technical_signals": {
      const symbol = args.symbol || "BTC/USDT";
      const timeframe = args.timeframe || "1h";
      const limit = Math.max(30, Math.min(200, Number(args.limit) || 60));
      const candles = await getLiveCandles(symbol, timeframe, limit);
      return computeTechnicalSignals(symbol, timeframe, candles);
    }

    case "analyze_derivatives_bias": {
      const symbol = args.symbol || "BTC/USDT";
      const tel = await getLiveTelemetry(symbol);
      return {
        symbol: tel.symbol,
        currentPrice: tel.price,
        fundingRate: tel.fundingRate,
        fundingRatePct: `${(tel.fundingRate * 100).toFixed(4)}%`,
        predictedFundingRatePct: `${(tel.predictedFundingRate * 100).toFixed(4)}%`,
        openInterestUsd: `\$${(tel.openInterestUsd / 1e6).toFixed(2)}M`,
        openInterestChange24h: `${tel.openInterestChange24h > 0 ? "+" : ""}${tel.openInterestChange24h}%`,
        longShortRatio: tel.longShortRatio,
        liquidations24h: tel.liquidations24h,
        squeezeRisk: tel.squeezeRisk,
        sentimentScore: tel.sentimentScore,
        derivativesAnalysis:
          tel.squeezeRisk.includes("SHORT_SQUEEZE")
            ? `Short-squeeze condition detected on ${tel.symbol}. Heavy short funding (${(tel.fundingRate * 100).toFixed(4)}%) with aggressive short liquidations. Upward momentum probable.`
            : tel.squeezeRisk.includes("LONG_SQUEEZE")
            ? `Long-squeeze warning on ${tel.symbol}. Overcrowded long interest with elevated funding (${(tel.fundingRate * 100).toFixed(4)}%). Watch for liquidity flushes.`
            : `Perpetual funding rate is balanced at ${(tel.fundingRate * 100).toFixed(4)}% with standard open interest stability.`
      };
    }

    case "run_strategy_backtest": {
      const symbol = args.symbol || "BTC/USDT";
      const strategy = args.strategy || "EMA_RSI_REVERSAL";
      const timeframe = args.timeframe || "1h";
      const days = Number(args.days) || 30;
      const initialCapital = Number(args.initialCapital) || 10000;
      const riskPerTradePct = Number(args.riskPerTradePct) || 2.0;

      // Determine required candle limit for the duration
      const candlesNeeded = timeframe === "15m" ? days * 96 : timeframe === "1h" ? days * 24 : days * 6;
      const candles = await getLiveCandles(symbol, timeframe, Math.min(250, Math.max(50, candlesNeeded)));

      return runBacktest(candles, {
        symbol,
        strategyName: strategy,
        timeframe,
        days,
        initialCapital,
        riskPerTradePct
      });
    }

    case "calculate_risk_position": {
      const symbol = args.symbol || "BTC/USDT";
      const accountBalance = Number(args.accountBalance) || 10000;
      const riskPercentage = Number(args.riskPercentage) || 1.5;
      const entryPrice = Number(args.entryPrice);
      const stopLossPrice = Number(args.stopLossPrice);
      const takeProfitTarget = args.takeProfitTarget ? Number(args.takeProfitTarget) : undefined;

      return calculateRiskPosition(symbol, accountBalance, riskPercentage, entryPrice, stopLossPrice, takeProfitTarget);
    }

    case "simulate_order_execution": {
      const symbol = args.symbol || "BTC/USDT";
      const side = (args.side || "BUY").toUpperCase() as "BUY" | "SELL";
      const units = Number(args.units) || 0.1;
      const orderType = (args.orderType || "MARKET").toUpperCase() as "MARKET" | "LIMIT";
      const stopLoss = args.stopLoss ? Number(args.stopLoss) : undefined;
      const takeProfit = args.takeProfit ? Number(args.takeProfit) : undefined;

      const tel = await getLiveTelemetry(symbol);
      return executeSimulatedOrder(symbol, side, units, tel.price, orderType, stopLoss, takeProfit);
    }

    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
}
