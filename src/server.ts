import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { getAllMarketTickers, getLiveCandles, getLiveTelemetry } from "./engine/marketData";
import { computeTechnicalSignals } from "./engine/indicators";
import { runBacktest } from "./engine/backtester";
import { calculateRiskPosition, executeSimulatedOrder } from "./engine/riskManager";
import { handleMcpToolCall, MCP_TOOLS } from "./mcp/tools";
import { processAgentQuery } from "./engine/agentBrain";
import { calculateOvernightMetrics, getPostbellBrief, getPostbellMarketQuote, getPostbellSignal, runPostbellResearch } from "./engine/postbellData";
import { createLlmConnection, getLlmConnectionStatus, removeLlmConnection, testLlmConnection } from "./engine/llmProvider";

import fs from "fs";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4040;

interface PostbellWatchAlert {
  id: string;
  timestamp: string;
  symbol: string;
  title: string;
  detail: string;
  changePct: number;
  dataMode: "representative" | "live";
}

const postbellWatch = {
  active: false,
  startedAt: null as string | null,
  lastScanAt: null as string | null,
  scanCount: 0,
  scanIntervalSeconds: 30,
  leadSymbol: null as string | null,
  lastError: null as string | null,
  alerts: [] as PostbellWatchAlert[]
};
const postbellWatchFile = path.join(process.cwd(), "data", "postbell-watch.json");

try {
  if (fs.existsSync(postbellWatchFile)) Object.assign(postbellWatch, JSON.parse(fs.readFileSync(postbellWatchFile, "utf8")));
} catch {}

function persistPostbellWatch() {
  fs.mkdirSync(path.dirname(postbellWatchFile), { recursive: true });
  fs.writeFileSync(postbellWatchFile, JSON.stringify(postbellWatch, null, 2));
}
let postbellScanRunning = false;

async function runPostbellWatchScan() {
  if (postbellScanRunning) return postbellWatch;
  postbellScanRunning = true;
  try {
    const brief = await getPostbellBrief();
    const lead = brief.signals.reduce((current, signal) =>
      Math.abs(signal.overnightChangePct) > Math.abs(current.overnightChangePct) ? signal : current
    );
    const observedAt = new Date().toISOString();
    postbellWatch.lastScanAt = observedAt;
    postbellWatch.scanCount += 1;
    postbellWatch.leadSymbol = lead.symbol;
    postbellWatch.lastError = null;
    postbellWatch.alerts.unshift({
      id: `scan-${Date.now()}`,
      timestamp: observedAt,
      symbol: lead.symbol,
      title: `${lead.symbol} leads the overnight watch`,
      detail: `${lead.name} is ${lead.overnightChangePct >= 0 ? "up" : "down"} ${Math.abs(lead.overnightChangePct).toFixed(2)}% with ${lead.volumeMultiple.toFixed(1)}× median volume.`,
      changePct: lead.overnightChangePct,
      dataMode: brief.dataMode
    });
    postbellWatch.alerts = postbellWatch.alerts.slice(0, 20);
  } catch (error: any) {
    postbellWatch.lastError = error?.message || "Scan failed";
  } finally {
    postbellScanRunning = false;
  }
  persistPostbellWatch();
  return postbellWatch;
}

const publicDir = fs.existsSync(path.join(__dirname, "public"))
  ? path.join(__dirname, "public")
  : path.join(__dirname, "../src/public");

app.use(express.json());
app.use(express.static(publicDir));

// Broadcast helper for WebSockets
function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Log and broadcast MCP tool invocation to UI live inspector
async function invokeMcpToolWithTelemetry(toolName: string, args: any) {
  const reqId = `rpc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  const startTime = Date.now();

  broadcast("mcp_call_started", {
    id: reqId,
    toolName,
    arguments: args,
    timestamp: startTime
  });

  try {
    const result = await handleMcpToolCall(toolName, args);
    const durationMs = Date.now() - startTime;

    broadcast("mcp_call_completed", {
      id: reqId,
      toolName,
      arguments: args,
      result,
      durationMs,
      status: "SUCCESS"
    });

    return { result, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    broadcast("mcp_call_completed", {
      id: reqId,
      toolName,
      arguments: args,
      error: err.message,
      durationMs,
      status: "ERROR"
    });
    throw err;
  }
}

// ---------------- REST API ----------------

// Market Tickers
app.get("/api/tickers", async (_req: Request, res: Response) => {
  try {
    const tickers = await getAllMarketTickers();
    res.json({ success: true, tickers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Candles
app.get("/api/candles", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC/USDT";
    const timeframe = (req.query.timeframe as string) || "1h";
    const limit = Math.min(200, Math.max(20, Number(req.query.limit) || 60));
    const candles = await getLiveCandles(symbol, timeframe, limit);
    res.json({ success: true, symbol, timeframe, candles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Telemetry & Derivatives
app.get("/api/telemetry", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC/USDT";
    const telemetry = await getLiveTelemetry(symbol);
    res.json({ success: true, telemetry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Technical Signals
app.get("/api/signals", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC/USDT";
    const timeframe = (req.query.timeframe as string) || "1h";
    const candles = await getLiveCandles(symbol, timeframe, 60);
    const signals = computeTechnicalSignals(symbol, timeframe, candles);
    res.json({ success: true, signals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Postbell overnight intelligence (representative until a tokenized-stock provider is configured)
app.get("/api/postbell/brief", async (_req: Request, res: Response) => {
  try {
    const brief = await getPostbellBrief();
    res.json({ success: true, brief });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/postbell/night-tape", async (req: Request, res: Response) => {
  try {
    const signal = await getPostbellSignal((req.query.symbol as string) || "rNVDA");
    res.json({ success: true, symbol: signal.symbol, events: signal.events, dataMode: "representative" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/postbell/analysis", async (req: Request, res: Response) => {
  try {
    const signal = await getPostbellSignal((req.query.symbol as string) || "rNVDA");
    res.json({
      success: true,
      analysis: {
        symbol: signal.symbol,
        confidence: signal.confidence,
        thesis: signal.thesis,
        risk: signal.risk,
        sources: signal.sources,
        scenarios: signal.scenarios,
        dataMode: "representative"
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/postbell/market", async (req: Request, res: Response) => {
  try {
    const quote = await getPostbellMarketQuote((req.query.symbol as string) || "rNVDA");
    res.json({ success: true, quote, metrics: calculateOvernightMetrics(quote) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/postbell/research", async (req: Request, res: Response) => {
  try {
    const question = typeof req.body?.question === "string" ? req.body.question : "";
    const symbol = typeof req.body?.symbol === "string" ? req.body.symbol : "rNVDA";
    const llmSessionId = typeof req.headers["x-postbell-llm-session"] === "string" ? req.headers["x-postbell-llm-session"] : undefined;
    const research = await runPostbellResearch(question, symbol, llmSessionId);
    res.json({ success: true, research });
  } catch (err: any) {
    res.status(503).json({ success: false, error: err.message || "AI research is unavailable." });
  }
});

app.get("/api/postbell/llm", (req: Request, res: Response) => {
  const sessionId = typeof req.headers["x-postbell-llm-session"] === "string" ? req.headers["x-postbell-llm-session"] : undefined;
  res.json({ success: true, status: getLlmConnectionStatus(sessionId) });
});

app.post("/api/postbell/llm", (req: Request, res: Response) => {
  try {
    const connection = createLlmConnection(req.body || {});
    res.json({ success: true, ...connection });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/postbell/llm/test", async (req: Request, res: Response) => {
  try {
    const sessionId = typeof req.headers["x-postbell-llm-session"] === "string" ? req.headers["x-postbell-llm-session"] : undefined;
    const result = await testLlmConnection(sessionId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/postbell/llm", (req: Request, res: Response) => {
  const sessionId = typeof req.headers["x-postbell-llm-session"] === "string" ? req.headers["x-postbell-llm-session"] : undefined;
  removeLlmConnection(sessionId);
  res.json({ success: true });
});

app.get("/api/postbell/watch", (_req: Request, res: Response) => {
  res.json({ success: true, watch: postbellWatch });
});

app.post("/api/postbell/watch/start", async (_req: Request, res: Response) => {
  postbellWatch.active = true;
  postbellWatch.startedAt = postbellWatch.startedAt || new Date().toISOString();
  const watch = await runPostbellWatchScan();
  res.json({ success: true, watch });
});

app.post("/api/postbell/watch/scan", async (_req: Request, res: Response) => {
  const watch = await runPostbellWatchScan();
  res.json({ success: true, watch });
});

app.post("/api/postbell/watch/stop", (_req: Request, res: Response) => {
  postbellWatch.active = false;
  persistPostbellWatch();
  res.json({ success: true, watch: postbellWatch });
});

// Backtest
app.post("/api/backtest", async (req: Request, res: Response) => {
  try {
    const { symbol = "BTC/USDT", strategy = "EMA_RSI_REVERSAL", timeframe = "1h", days = 30, initialCapital = 10000, riskPerTradePct = 2 } = req.body;
    const { result } = await invokeMcpToolWithTelemetry("run_strategy_backtest", {
      symbol,
      strategy,
      timeframe,
      days: Number(days),
      initialCapital: Number(initialCapital),
      riskPerTradePct: Number(riskPerTradePct)
    });
    res.json({ success: true, backtest: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Risk Management
app.post("/api/risk", async (req: Request, res: Response) => {
  try {
    const { symbol = "BTC/USDT", accountBalance = 10000, riskPercentage = 1.5, entryPrice, stopLossPrice, takeProfitTarget } = req.body;
    const { result } = await invokeMcpToolWithTelemetry("calculate_risk_position", {
      symbol,
      accountBalance: Number(accountBalance),
      riskPercentage: Number(riskPercentage),
      entryPrice: Number(entryPrice),
      stopLossPrice: Number(stopLossPrice),
      takeProfitTarget: takeProfitTarget ? Number(takeProfitTarget) : undefined
    });
    res.json({ success: true, risk: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulated Order
app.post("/api/order", async (req: Request, res: Response) => {
  try {
    const { symbol = "BTC/USDT", side = "BUY", units = 0.1, orderType = "MARKET", stopLoss, takeProfit } = req.body;
    const { result } = await invokeMcpToolWithTelemetry("simulate_order_execution", {
      symbol,
      side,
      units: Number(units),
      orderType,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined
    });
    res.json({ success: true, order: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// MCP JSON-RPC 2.0 Web Gateway
app.post("/api/mcp/rpc", async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body;
  if (jsonrpc !== "2.0") {
    return res.status(400).json({ jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } });
  }

  try {
    if (method === "tools/list") {
      return res.json({ jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const { result, durationMs } = await invokeMcpToolWithTelemetry(name, args || {});
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          _meta: { executionTimeMs: durationMs }
        }
      });
    }

    return res.status(404).json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method ${method} not found` } });
  } catch (err: any) {
    return res.status(500).json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
  }
});

// AI Copilot Reasoning Agent
app.post("/api/copilot", async (req: Request, res: Response) => {
  try {
    const { prompt = "", symbol = "BTC/USDT", timeframe = "1h" } = req.body;
    const response = await processAgentQuery(prompt, symbol, timeframe, invokeMcpToolWithTelemetry);
    res.json({
      success: true,
      analysis: response.answer,
      callsMade: response.callsMade,
      telemetry: response.telemetry,
      signals: response.signals,
      backtest: response.backtest
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Autonomous Postbell watch keeps scanning even when the browser is closed.
setInterval(() => {
  if (postbellWatch.active) void runPostbellWatchScan();
}, 30_000);

// Periodic WebSocket price updates broadcast every 3 seconds
setInterval(async () => {
  if (wss.clients.size > 0) {
    try {
      const tickers = await getAllMarketTickers();
      broadcast("market_tick", tickers);
    } catch {
      // Ignore background tick errs
    }
  }
}, 3500);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "connected", message: "NexusTrader MCP Live WebSocket Connected" }));
});

server.listen(PORT, () => {
  console.log(`[NexusTrader] Server listening on http://localhost:${PORT}`);
  console.log(`[NexusTrader] Web Terminal UI available at http://localhost:${PORT}`);
  console.log(`[NexusTrader] MCP JSON-RPC Gateway at http://localhost:${PORT}/api/mcp/rpc`);
});
