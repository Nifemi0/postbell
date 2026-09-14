import http from "http";
import { getLiveCandles, getLiveTelemetry, getAllMarketTickers } from "../engine/marketData";
import { computeTechnicalSignals, calculateRSI, calculateEMA } from "../engine/indicators";
import { runBacktest } from "../engine/backtester";
import { calculateRiskPosition, executeSimulatedOrder } from "../engine/riskManager";
import { handleMcpToolCall, MCP_TOOLS } from "../mcp/tools";
import { calculateOvernightMetrics, getPostbellBrief, getPostbellMarketQuote, getPostbellSignal, runPostbellResearch } from "../engine/postbellData";
import { createLlmConnection, getLlmConnectionStatus, testLlmConnection } from "../engine/llmProvider";
import { normalizeAnalyticsEvent } from "../engine/analytics";

async function runAllTests() {
  console.log("==================================================");
  console.log("   NEXUSTRADER MCP COMPREHENSIVE VERIFICATION     ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Market Data Test
  console.log("\n[TEST GROUP 1] Market Data & Tickers Engine...");
  try {
    const tickers = await getAllMarketTickers();
    assert(tickers.length >= 6, `Retrieved ${tickers.length} tickers across top assets`);
    const btcTicker = tickers.find((t) => t.symbol === "BTC/USDT");
    assert(!!btcTicker && btcTicker.price > 10000, `BTC price valid: \$${btcTicker?.price}`);

    const candles = await getLiveCandles("BTC/USDT", "1h", 60);
    assert(candles.length >= 50, `Candles fetched: ${candles.length} bars`);
    assert(candles[0].high >= candles[0].low, "Candle high >= low integrity check");

    const tel = await getLiveTelemetry("ETH/USDT");
    assert(tel.symbol === "ETH/USDT" && tel.price > 500, `ETH telemetry valid: \$${tel.price}`);
    assert(typeof tel.fundingRate === "number", `Perpetual funding rate: ${(tel.fundingRate * 100).toFixed(4)}%`);
  } catch (err: any) {
    assert(false, `Market Data Error: ${err.message}`);
  }

  // 2. Technical Indicators Test
  console.log("\n[TEST GROUP 2] Technical Indicator & Signals Engine...");
  try {
    const mockPrices = [100, 102, 101, 105, 107, 106, 110, 112, 115, 113, 118, 120, 122, 121, 125, 128, 130];
    const rsis = calculateRSI(mockPrices, 14);
    assert(rsis.length === mockPrices.length, "RSI array length matches input prices");
    const lastRsi = rsis[rsis.length - 1];
    assert(lastRsi > 50 && lastRsi <= 100, `RSI calculation check: ${lastRsi.toFixed(2)}`);

    const emas = calculateEMA(mockPrices, 5);
    assert(emas.length === mockPrices.length, "EMA array length matches input prices");

    const candles = await getLiveCandles("SOL/USDT", "1h", 60);
    const signals = computeTechnicalSignals("SOL/USDT", "1h", candles);
    assert(["STRONG_BUY", "BUY", "NEUTRAL", "SELL", "STRONG_SELL"].includes(signals.compositeSignal), `Composite signal: ${signals.compositeSignal}`);
    assert(signals.confidenceScore >= 0 && signals.confidenceScore <= 100, `Confidence score: ${signals.confidenceScore}%`);
  } catch (err: any) {
    assert(false, `Indicator Engine Error: ${err.message}`);
  }

  // 3. Quantitative Backtesting Test
  console.log("\n[TEST GROUP 3] Quantitative Strategy Backtester...");
  try {
    const candles = await getLiveCandles("BTC/USDT", "1h", 120);
    const btResult = runBacktest(candles, {
      symbol: "BTC/USDT",
      strategyName: "EMA_RSI_REVERSAL",
      timeframe: "1h",
      days: 30,
      initialCapital: 10000,
      riskPerTradePct: 2.0
    });

    assert(btResult.totalTrades > 0, `Trades executed in backtest: ${btResult.totalTrades}`);
    assert(btResult.winRatePct >= 0 && btResult.winRatePct <= 100, `Win rate percentage: ${btResult.winRatePct}%`);
    assert(btResult.equityCurve.length > 0, `Equity curve datapoints generated: ${btResult.equityCurve.length}`);
    assert(typeof btResult.sharpeRatio === "number", `Sharpe ratio computed: ${btResult.sharpeRatio}`);
  } catch (err: any) {
    assert(false, `Backtester Error: ${err.message}`);
  }

  // 4. Risk Manager & Paper Execution
  console.log("\n[TEST GROUP 4] Risk Sizing & Execution Simulator...");
  try {
    const risk = calculateRiskPosition("BTC/USDT", 10000, 2.0, 65000, 63700);
    assert(risk.riskCapitalUsd === 200, `Risk capital exact: \$${risk.riskCapitalUsd} (2% of \$10k)`);
    assert(risk.positionUnits > 0, `Computed position units: ${risk.positionUnits}`);
    assert(risk.suggestedTp1 > 65000, `Suggested TP1 above entry: \$${risk.suggestedTp1}`);

    const simOrder = executeSimulatedOrder("BTC/USDT", "BUY", 0.5, 65000, "MARKET", 63700, 68000);
    assert(simOrder.status === "FILLED", `Simulated order filled: ID ${simOrder.orderId}`);
    assert(simOrder.slippagePct >= 0, `Realistic slippage applied: ${simOrder.slippagePct}%`);
    assert(simOrder.tradingFeeUsd > 0, `Trading fee calculated: \$${simOrder.tradingFeeUsd}`);
  } catch (err: any) {
    assert(false, `Risk Manager Error: ${err.message}`);
  }

  // 5. MCP Tools & Schema Validation
  console.log("\n[TEST GROUP 5] Model Context Protocol (MCP) Standard Compliance...");
  try {
    assert(MCP_TOOLS.length === 6, `Standard MCP Tools registered: ${MCP_TOOLS.length}`);
    for (const tool of MCP_TOOLS) {
      assert(!!tool.name && !!tool.description && !!tool.inputSchema, `Valid schema for tool: ${tool.name}`);
    }

    // Call tool directly through MCP handler
    const mcpRes = await handleMcpToolCall("get_market_telemetry", { symbol: "BTC/USDT" });
    assert(mcpRes.symbol === "BTC/USDT" && mcpRes.price > 0, `MCP tool call 'get_market_telemetry' executed successfully`);

    const mcpSig = await handleMcpToolCall("compute_technical_signals", { symbol: "BTC/USDT", timeframe: "1h" });
    assert(!!mcpSig.compositeSignal, `MCP tool call 'compute_technical_signals' returned: ${mcpSig.compositeSignal}`);
  } catch (err: any) {
    assert(false, `MCP Handler Error: ${err.message}`);
  }

  // 6. Postbell Overnight Intelligence
  console.log("\n[TEST GROUP 6] Postbell Brief & Evidence API...");
  try {
    const brief = await getPostbellBrief();
    assert(["representative", "live"].includes(brief.dataMode), `Postbell data mode explicit: ${brief.dataMode}`);
    assert(brief.signals.length >= 3, `Overnight signals ranked: ${brief.signals.length}`);
    assert(brief.signals.every((signal) => signal.events.length >= 2 && signal.sources.length >= 3), "Every signal includes events and evidence sources");
    const nvda = await getPostbellSignal("rNVDA");
    assert(nvda.symbol === "rNVDA" && nvda.price > 0, `Postbell signal lookup valid: ${nvda.symbol}`);
    const quote = await getPostbellMarketQuote("rNVDA");
    const metrics = calculateOvernightMetrics(quote);
    assert(Number.isFinite(metrics.premiumPct) && Number.isFinite(metrics.volumeMultiple), `Overnight premium and volume metrics calculated: ${metrics.premiumPct.toFixed(2)}% / ${metrics.volumeMultiple.toFixed(2)}×`);
    assert(metrics.divergenceScore >= 0 && metrics.divergenceScore <= 100, `Divergence score bounded: ${metrics.divergenceScore}`);
    assert(nvda.scenarios.length === 3 && nvda.scenarios.every((scenario) => scenario.hypothetical), "Bull, base, and bear scenarios are explicitly hypothetical");
  } catch (err: any) {
    assert(false, `Postbell Data Error: ${err.message}`);
  }

  // 7. Browser-owned model connection validation
  console.log("\n[TEST GROUP 7] Postbell Model Connection Safety...");
  try {
    const connection = createLlmConnection({
      provider: "DeepSeek",
      model: "deepseek-v4-pro",
      baseUrl: "https://api.deepseek.com/",
      apiKey: "verification-key-1234"
    });
    const status = getLlmConnectionStatus(connection);
    assert(status.configured === true && status.baseUrl === "https://api.deepseek.com", "Model configuration validates without filesystem persistence");
    assert(status.keyHint === "••••1234" && !(status as any).apiKey, "Connection status exposes only a masked key hint");
    let rejected = false;
    try {
      createLlmConnection({ provider: "DeepSeek", model: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com" });
    } catch {
      rejected = true;
    }
    assert(rejected, "Remote providers require an API key");

    let researchRequestBody: any;
    const mockProvider = http.createServer((request, response) => {
      let raw = "";
      request.on("data", (chunk) => { raw += chunk; });
      request.on("end", () => {
        const body = JSON.parse(raw || "{}");
        const isConnectionTest = body.messages?.length === 1;
        if (!isConnectionTest) researchRequestBody = body;
        const content = isConnectionTest
          ? "POSTBELL_CONNECTED"
          : JSON.stringify({ detect: "Mock detect", connect: "Mock connect", decide: "Mock decide", analyst: "Mock analyst", uncertainty: "Mock uncertainty" });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content } }] }));
      });
    });
    await new Promise<void>((resolve) => mockProvider.listen(0, "127.0.0.1", resolve));
    try {
      const address = mockProvider.address();
      if (!address || typeof address === "string") throw new Error("Mock provider did not expose a port.");
      const mockConnection = { provider: "Local test", model: "postbell-test", baseUrl: `http://127.0.0.1:${address.port}/v1`, apiKey: "" };
      const connectionResult = await testLlmConnection(mockConnection);
      assert(connectionResult.reply === "POSTBELL_CONNECTED", "Provider connection test reaches an OpenAI-compatible endpoint");
      const researchResult = await runPostbellResearch("What moved?", "rNVDA", mockConnection);
      assert(researchResult.steps.detect === "Mock detect" && researchResult.analyst === "Mock analyst", "Live evidence flows through the selected model into the research response");
      const suppliedEvidence = JSON.stringify(researchRequestBody?.messages || []);
      assert(/Bitget rNVDA ticker: Price \$\d/.test(suppliedEvidence) && /% versus Bitget/.test(suppliedEvidence), "Primary asset price and reference change are supplied to the selected model");
    } finally {
      await new Promise<void>((resolve, reject) => mockProvider.close((error) => error ? reject(error) : resolve()));
    }
  } catch (err: any) {
    assert(false, `Model Connection Error: ${err.message}`);
  }

  // 8. Anonymous product analytics validation
  console.log("\n[TEST GROUP 8] Postbell Admin Analytics Privacy...");
  try {
    const event = normalizeAnalyticsEvent({
      event: "research_success",
      visitorId: "visitor-12345678",
      sessionId: "session-12345678",
      path: "/postbell-app.html?<script>alert(1)</script>",
      provider: "DeepSeek<script>",
      durationMs: 999999,
      prompt: "This field must never be retained",
      apiKey: "secret-key-must-never-be-retained"
    });
    assert(event.event === "research_success" && event.provider === "DeepSeekscript", "Analytics accepts only known, sanitized product fields");
    assert(!("prompt" in event) && !("apiKey" in event), "Analytics discards prompts and credentials");
    assert(event.durationMs === 120_000, "Analytics bounds client-supplied timing values");
    let rejected = false;
    try {
      normalizeAnalyticsEvent({ event: "unknown", visitorId: "visitor-12345678", sessionId: "session-12345678" });
    } catch {
      rejected = true;
    }
    assert(rejected, "Analytics rejects unknown event types");
  } catch (err: any) {
    assert(false, `Analytics Privacy Error: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
