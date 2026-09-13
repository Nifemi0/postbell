# ⬡ NexusTrader MCP

## Postbell hackathon build

Postbell is the focused Bitget AI Base Camp build in this repository: an overnight-intelligence layer for tokenized US stocks. It detects unusual after-hours movement, connects the move to evidence, and prepares a sourced morning brief.

- Local landing page: http://localhost:4040/postbell.html
- Postbell Morning Brief: http://localhost:4040/postbell-app.html
- Postbell Night Tape: http://localhost:4040/postbell-tape.html
- Postbell Saved Research: http://localhost:4040/postbell-saved.html
- Product brief: [docs/PRODUCT.md](docs/PRODUCT.md)
- Design system: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- Three-phase plan: [docs/hackathon-build/checklist.md](docs/hackathon-build/checklist.md)
- Build journal: [docs/hackathon-build/build-notes.md](docs/hackathon-build/build-notes.md)
- Bitget submission draft: [bitget-submission.md](bitget-submission.md)
- Submission testing status: [docs/submission/TESTING-STATUS.md](docs/submission/TESTING-STATUS.md)
- Deployment notes: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Submission checklist: [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md)
- Claims ledger: [CLAIMS.md](CLAIMS.md)
- Postbell brief API: `http://localhost:4040/api/postbell/brief`
- Postbell market metrics: `http://localhost:4040/api/postbell/market?symbol=rNVDA`
- Night Tape events: `http://localhost:4040/api/postbell/night-tape?symbol=rNVDA`
- Sourced analysis and scenarios: `http://localhost:4040/api/postbell/analysis?symbol=rNVDA`
- Ask Postbell research task: `POST http://localhost:4040/api/postbell/research` with `{ "question": "What moved in the overnight rToken tape?", "symbol": "rNVDA" }`
- Overnight agent status: `GET http://localhost:4040/api/postbell/watch`
- Start or stop autonomous monitoring: `POST /api/postbell/watch/start` and `POST /api/postbell/watch/stop`
- Force an immediate market scan: `POST /api/postbell/watch/scan`
- Live adapter: the app uses Bitget's public `/api/v3/market/tickers` and `/api/v3/market/candles` endpoints for `rNVDAUSDT`, `rTSLAUSDT`, and `rQQQUSDT`. Set `POSTBELL_BITGET_URL` only when routing through a read-only proxy; if Bitget is unavailable, responses fall back to explicitly labeled representative data.
- AI research: connect a compatible provider such as DeepSeek from Model Settings. Research returns an AI response only; if no model is connected or the request fails, the UI reports the failure instead of presenting deterministic text as AI output.
- Approved visual direction: https://p.superdesign.dev/draft/f10f3aaf-7190-4813-b414-15044eddb6be

## Bitget AI Genesis Season 2

Postbell is prepared for Bitget's own hackathon intake, not Devpost. Use the official [activity page](https://www.bitget.com/activity-hub/hackathon), [submission form](https://forms.gle/GyWZCMCPocgJdJon6), and [developer handbook](https://bitget-ai.gitbook.io/hackathon). The recommended track is **AI Trading Desk**.
> **Autonomous Multi-Signal Crypto Trading Copilot & Standardized Model Context Protocol (MCP) Server**  
> *Built for the **X-Agent AI MCP Hackathon 2026** (Track 1: Open Innovation & Track 2: Trading Challenge)*

---

## 🌟 Overview

**NexusTrader MCP** is an institutional-grade, Model Context Protocol-native trading copilot and market intelligence engine. It equips any LLM (Claude, Gemini, Cursor, X-Agent) with standardized, low-latency tools to:

1. Ingest real-time orderbooks, ticker prices, and volume spikes from crypto exchanges.
2. Calculate quantitative technical indicators (RSI-14, MACD, EMA 20/50/200 ribbons, Bollinger Bands, VWAP, support/resistance).
3. Monitor perpetual futures derivatives metrics (Bitget funding rates, long/short ratio, liquidation surges, and squeeze risk).
4. Run quantitative backtesting over historical candle sequences to compute **Win Rate %**, **Sharpe Ratio**, **Profit Factor**, and **Max Drawdown**.
5. Enforce mathematical risk management (1:2+ Risk-to-Reward, max capital drawdown limits, position sizing).
6. Provide an interactive Cyberpunk/Bloomberg-grade Web Terminal UI with real-time candlestick charts, visual backtester, live streaming MCP tool inspector, and an autonomous AI copilot.

---

## ⚡ The 6 Standard MCP Tools

Compliant with the **Model Context Protocol (MCP) JSON-RPC 2.0 Specification** (`2024-11-05`):

| MCP Tool | Functionality | Input Parameters |
| :--- | :--- | :--- |
| `get_market_telemetry` | Real-time pricing, 24h change, high/low, volume, Bitget funding rates, and open interest | `symbol: string` (e.g. `BTC/USDT`, `ETH/USDT`, `SOL/USDT`) |
| `compute_technical_signals` | Multi-indicator engine (RSI, MACD, EMA ribbons, Bollinger, VWAP) + composite signal | `symbol: string`, `timeframe: "15m" \| "1h" \| "4h" \| "1d"`, `limit?: number` |
| `analyze_derivatives_bias` | Bitget perpetual derivatives skew, long/short liquidations, and squeeze probability | `symbol: string` |
| `run_strategy_backtest` | Algorithmic strategy simulation (`EMA_RSI_REVERSAL`, `BREAKOUT_MOMENTUM`, `MEAN_REVERSION_BB`) | `symbol: string`, `strategy: string`, `timeframe: string`, `days: number` |
| `calculate_risk_position` | Strict position sizing based on risk capital %, entry price, and invalidation stop-loss | `symbol`, `accountBalance`, `riskPercentage`, `entryPrice`, `stopLossPrice` |
| `simulate_order_execution` | Paper execution with realistic slippage (0.02%-0.05%) and exchange maker/taker fee modeling | `symbol`, `side: "BUY" \| "SELL"`, `units`, `stopLoss?`, `takeProfit?` |

---

## 🏗️ Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                LLM AGENT (Claude / Cursor)             │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ JSON-RPC 2.0 (MCP)
                                                           ▼
┌────────────────────────────────┐            ┌─────────────────────────────────────────┐
│     WEB TERMINAL DASHBOARD     │◄───(WS)───►│            NEXUSTRADER SERVER           │
│ • Live Candlestick Canvas      │            │ • Express REST + WebSocket Server       │
│ • Real-time MCP Tool Inspector │            │ • JSON-RPC MCP Gateway (/api/mcp/rpc)   │
│ • Strategy Backtest Visualizer │            └────────────────────┬────────────────────┘
│ • AI Copilot Chat Terminal     │                                 │
└────────────────────────────────┘                                 ▼
                                              ┌─────────────────────────────────────────┐
                                              │             CORE ENGINES                │
                                              │ 1. Market Data (Bitget/Binance REST+WS) │
                                              │ 2. Technical Indicators (RSI, MACD, EMA)│
                                              │ 3. Quantitative Backtester              │
                                              │ 4. Derivatives & Squeeze Detector       │
                                              │ 5. Risk Management & Paper Execution    │
                                              └─────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Installation
```bash
cd nexustrader-mcp
npm install
```

### 2. Run Comprehensive Unit Tests
```bash
npm test
```
*(Runs automated verification across the indicator engine, backtester, risk manager, MCP tool handlers, and Postbell data layer).* 

### 3. Start the Web Terminal & MCP Server
```bash
npm start
```
Open your browser at: **`http://localhost:4040`**

### 4. Run as Standalone MCP Stdio Server (for Claude Desktop / Cursor)
```bash
npm run mcp
```

---

## 🔌 Connecting to Claude Desktop / Cursor

Add this snippet to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nexustrader": {
      "command": "node",
      "args": [
        "C:\\Users\\USER\\Documents\\antigravity\\vibrant-hawking\\nexustrader-mcp\\dist\\mcp\\server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Or connect via the HTTP Gateway in Cursor:
* **Gateway URL:** `http://localhost:3000/api/mcp/rpc`

---

## 🏆 Hackathon Alignment

- **Track 1 (Open Innovation Track):** Standardized, modular Model Context Protocol server exposing real-time quantitative crypto tools that any agent can call.
- **Track 2 (OlaXBT Trading Challenge):** Autonomous algorithmic trading strategies with historical backtesting, derivatives squeeze detection, and risk-controlled execution.
- Postbell Saved Research: http://localhost:4040/postbell-saved.html
- Postbell Model Settings: http://localhost:4040/postbell-settings.html
- Force an immediate market scan: `POST /api/postbell/watch/scan`
- Create, test, inspect, or remove a private model session: `/api/postbell/llm`
- Create, test, inspect, or remove a private model session: `/api/postbell/llm`
- Server-managed model secrets: `POSTBELL_LLM_BASE_URL`, `POSTBELL_LLM_MODEL`, `POSTBELL_LLM_API_KEY`, and optional `POSTBELL_LLM_PROVIDER`
