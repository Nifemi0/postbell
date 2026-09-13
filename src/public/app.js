// NexusTrader MCP Client Application

let currentSymbol = "BTC/USDT";
let currentTimeframe = "1h";
let currentCandles = [];
let currentSignals = null;
let currentTelemetry = null;
let ws = null;

// DOM Elements
const tickerRibbon = document.getElementById("tickerRibbon");
const wsStatus = document.getElementById("wsStatus");
const chartSymbol = document.getElementById("chartSymbol");
const chartPrice = document.getElementById("chartPrice");
const chartChange = document.getElementById("chartChange");
const summarySignalBadge = document.getElementById("summarySignalBadge");
const summaryConfidence = document.getElementById("summaryConfidence");
const candleCanvas = document.getElementById("candleChart");
const equityCanvas = document.getElementById("equityChart");
const crosshairInfo = document.getElementById("crosshairInfo");
const copilotChat = document.getElementById("copilotChat");
const copilotForm = document.getElementById("copilotForm");
const copilotInput = document.getElementById("copilotInput");
const mcpLogStream = document.getElementById("mcpLogStream");
const btnClearMcpLogs = document.getElementById("btnClearMcpLogs");
const btnRunBacktest = document.getElementById("btnRunBacktest");
const selStrategy = document.getElementById("selStrategy");
const selDays = document.getElementById("selDays");
const btnOpenMcpModal = document.getElementById("btnOpenMcpModal");
const btnCloseMcpModal = document.getElementById("btnCloseMcpModal");
const mcpModal = document.getElementById("mcpModal");
const mcpConfigCode = document.getElementById("mcpConfigCode");
const btnCopyConfig = document.getElementById("btnCopyConfig");

// Overlays
const chkEma = document.getElementById("chkEma");
const chkSignals = document.getElementById("chkSignals");
const chkBollinger = document.getElementById("chkBollinger");

// Derivatives elements
const telFunding = document.getElementById("telFunding");
const telOi = document.getElementById("telOi");
const telLs = document.getElementById("telLs");
const telSqueeze = document.getElementById("telSqueeze");

// Backtest stats
const btWinRate = document.getElementById("btWinRate");
const btWinRatio = document.getElementById("btWinRatio");
const btNetProfit = document.getElementById("btNetProfit");
const btRoi = document.getElementById("btRoi");
const btProfitFactor = document.getElementById("btProfitFactor");
const btMaxDd = document.getElementById("btMaxDd");
const btSharpe = document.getElementById("btSharpe");

// ---------------- WEBSOCKET CONNECTION ----------------

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    wsStatus.innerHTML = `<span class="status-indicator live"></span> WS: CONNECTED`;
  };

  ws.onclose = () => {
    wsStatus.innerHTML = `<span class="status-indicator"></span> WS: RECONNECTING`;
    setTimeout(initWebSocket, 3000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWsMessage(msg);
    } catch (e) {
      console.error("WS Parse error", e);
    }
  };
}

function handleWsMessage(msg) {
  if (msg.type === "market_tick") {
    renderTickerRibbon(msg.data);
    const curr = msg.data.find((t) => t.symbol === currentSymbol);
    if (curr) {
      updatePriceDisplay(curr.price, curr.change24h);
    }
  } else if (msg.type === "mcp_call_started") {
    addMcpLogEntry(msg.data, "CALL");
  } else if (msg.type === "mcp_call_completed") {
    updateMcpLogEntry(msg.data);
  }
}

// ---------------- LIVE MCP INSPECTOR ----------------

function addMcpLogEntry(data, status) {
  const empty = mcpLogStream.querySelector(".mcp-log-empty");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "mcp-log-entry";
  entry.id = `log-${data.id}`;

  const timeStr = new Date(data.timestamp || Date.now()).toLocaleTimeString();

  entry.innerHTML = `
    <div class="mcp-log-header">
      <span class="mcp-badge badge-call">MCP CALL</span>
      <span class="mcp-tool-name">${data.toolName}</span>
      <span class="mcp-latency">${timeStr}</span>
    </div>
    <div class="mcp-payload-preview">args: ${JSON.stringify(data.arguments)}</div>
  `;

  mcpLogStream.prepend(entry);
  if (mcpLogStream.children.length > 25) {
    mcpLogStream.lastElementChild.remove();
  }
}

function updateMcpLogEntry(data) {
  let entry = document.getElementById(`log-${data.id}`);
  if (!entry) {
    addMcpLogEntry(data, "COMPLETED");
    entry = document.getElementById(`log-${data.id}`);
  }

  if (entry) {
    const isErr = data.status === "ERROR";
    const badge = entry.querySelector(".mcp-badge");
    if (badge) {
      badge.className = `mcp-badge ${isErr ? "badge-error" : "badge-success"}`;
      badge.textContent = isErr ? "MCP ERROR" : "MCP 200 OK";
    }

    const latencySpan = entry.querySelector(".mcp-latency");
    if (latencySpan) {
      latencySpan.textContent = `${data.durationMs}ms`;
    }

    const payload = entry.querySelector(".mcp-payload-preview");
    if (payload) {
      const summary = isErr
        ? `Error: ${data.error}`
        : typeof data.result === "object"
        ? JSON.stringify(data.result, null, 1).slice(0, 180) + (JSON.stringify(data.result).length > 180 ? "..." : "")
        : String(data.result);
      payload.textContent = summary;
    }
  }
}

btnClearMcpLogs.addEventListener("click", () => {
  mcpLogStream.innerHTML = `<div class="mcp-log-empty">Waiting for tool calls...</div>`;
});

// ---------------- TICKER RIBBON ----------------

function renderTickerRibbon(tickers) {
  if (!tickers || !tickers.length) return;
  tickerRibbon.innerHTML = tickers
    .map((t) => {
      const isUp = t.change24h >= 0;
      return `
      <div class="ticker-item" data-symbol="${t.symbol}">
        <span class="ticker-sym">${t.symbol}</span>
        <span class="ticker-price">\$${t.price.toLocaleString()}</span>
        <span class="${isUp ? "ticker-up" : "ticker-down"}">${isUp ? "+" : ""}${t.change24h}%</span>
      </div>
    `;
    })
    .join("");

  // Attach click to switch asset
  tickerRibbon.querySelectorAll(".ticker-item").forEach((item) => {
    item.addEventListener("click", () => {
      const sym = item.getAttribute("data-symbol");
      if (sym && sym !== currentSymbol) {
        selectAsset(sym);
      }
    });
  });
}

function updatePriceDisplay(price, change24h) {
  chartPrice.textContent = `\$${price.toLocaleString()}`;
  const isUp = change24h >= 0;
  chartChange.className = `chart-change ${isUp ? "text-emerald" : "text-crimson"}`;
  chartChange.textContent = `${isUp ? "+" : ""}${change24h}%`;
}

// ---------------- DATA FETCHING ----------------

async function loadMarketData() {
  try {
    const [candlesRes, telemetryRes, signalsRes] = await Promise.all([
      fetch(`/api/candles?symbol=${encodeURIComponent(currentSymbol)}&timeframe=${currentTimeframe}&limit=80`).then((r) => r.json()),
      fetch(`/api/telemetry?symbol=${encodeURIComponent(currentSymbol)}`).then((r) => r.json()),
      fetch(`/api/signals?symbol=${encodeURIComponent(currentSymbol)}&timeframe=${currentTimeframe}`).then((r) => r.json())
    ]);

    if (candlesRes.success) {
      currentCandles = candlesRes.candles;
      renderCandleChart();
    }

    if (telemetryRes.success) {
      currentTelemetry = telemetryRes.telemetry;
      updatePriceDisplay(currentTelemetry.price, currentTelemetry.change24h);
      renderTelemetry(currentTelemetry);
    }

    if (signalsRes.success) {
      currentSignals = signalsRes.signals;
      renderSignalSummary(currentSignals);
    }
  } catch (err) {
    console.error("Failed to load market data:", err);
  }
}

function renderTelemetry(t) {
  telFunding.textContent = `${(t.fundingRate * 100).toFixed(4)}%`;
  telOi.textContent = `\$${(t.openInterestUsd / 1e6).toFixed(1)}M`;
  telLs.textContent = t.longShortRatio.toFixed(2);
  telSqueeze.textContent = t.squeezeRisk.replace(/_/g, " ");

  if (t.squeezeRisk.includes("SHORT")) {
    telSqueeze.className = "tel-val status-pill text-emerald";
  } else if (t.squeezeRisk.includes("LONG")) {
    telSqueeze.className = "tel-val status-pill text-crimson";
  } else {
    telSqueeze.className = "tel-val status-pill text-cyan";
  }
}

function renderSignalSummary(s) {
  summarySignalBadge.textContent = s.compositeSignal.replace("_", " ");
  summaryConfidence.textContent = `${s.confidenceScore}% CONF`;

  if (s.compositeSignal.includes("BUY")) {
    summarySignalBadge.className = "sig-badge sig-buy";
  } else if (s.compositeSignal.includes("SELL")) {
    summarySignalBadge.className = "sig-badge sig-sell";
  } else {
    summarySignalBadge.className = "sig-badge sig-neutral";
  }
}

// ---------------- CANDLESTICK CHART ----------------

function renderCandleChart() {
  if (!currentCandles.length) return;

  const ctx = candleCanvas.getContext("2d");
  const rect = candleCanvas.parentElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Handle Retina / HiDPI display
  const dpr = window.devicePixelRatio || 1;
  candleCanvas.width = width * dpr;
  candleCanvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const paddingBottom = 25;
  const paddingRight = 65;
  const paddingTop = 20;
  const chartW = width - paddingRight;
  const chartH = height - paddingBottom - paddingTop;

  // Find min and max price
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of currentCandles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  const priceRange = maxPrice - minPrice || 1;
  const buffer = priceRange * 0.08;
  const adjustedMin = minPrice - buffer;
  const adjustedMax = maxPrice + buffer;
  const adjustedRange = adjustedMax - adjustedMin;

  function getY(price) {
    return paddingTop + chartH - ((price - adjustedMin) / adjustedRange) * chartH;
  }

  // Draw Grid Lines
  ctx.strokeStyle = "#141c2b";
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#55647a";

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = paddingTop + (chartH / gridSteps) * i;
    const priceVal = adjustedMax - (adjustedRange / gridSteps) * i;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartW, y);
    ctx.stroke();

    ctx.fillText(priceVal.toFixed(currentSymbol.includes("DOGE") ? 4 : 1), chartW + 6, y + 3);
  }

  // Draw Candlesticks
  const candleCount = currentCandles.length;
  const candleSpacing = chartW / candleCount;
  const candleWidth = Math.max(2, candleSpacing * 0.7);

  const closes = currentCandles.map((c) => c.close);
  const ema20 = calculateEmaArray(closes, 20);
  const ema50 = calculateEmaArray(closes, 50);

  currentCandles.forEach((c, i) => {
    const x = i * candleSpacing + candleSpacing / 2;
    const openY = getY(c.open);
    const closeY = getY(c.close);
    const highY = getY(c.high);
    const lowY = getY(c.low);

    const isGreen = c.close >= c.open;
    const candleColor = isGreen ? "#00ff9d" : "#ff2e63";

    // Wick
    ctx.strokeStyle = candleColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Body
    ctx.fillStyle = isGreen ? "rgba(0, 255, 157, 0.85)" : "rgba(255, 46, 99, 0.85)";
    const bodyY = Math.min(openY, closeY);
    const bodyH = Math.max(1.5, Math.abs(openY - closeY));
    ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);

    // AI Signal Marker Overlay
    if (chkSignals.checked && i % 14 === 4 && i > 10) {
      const isBuyMarker = c.close > ema20[i];
      ctx.fillStyle = isBuyMarker ? "#00ff9d" : "#ff2e63";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const markerText = isBuyMarker ? "▲ BUY" : "▼ SELL";
      ctx.fillText(markerText, x - 14, isBuyMarker ? highY - 8 : lowY + 16);
    }
  });

  // Draw EMA Overlays
  if (chkEma.checked) {
    // EMA 20 (Cyan)
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    currentCandles.forEach((_, i) => {
      const x = i * candleSpacing + candleSpacing / 2;
      const y = getY(ema20[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // EMA 50 (Amber)
    ctx.strokeStyle = "#ffb800";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    currentCandles.forEach((_, i) => {
      const x = i * candleSpacing + candleSpacing / 2;
      const y = getY(ema50[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function calculateEmaArray(values, period) {
  const k = 2 / (period + 1);
  const result = [];
  let currentEma = values[0];
  result.push(currentEma);

  for (let i = 1; i < values.length; i++) {
    currentEma = values[i] * k + currentEma * (1 - k);
    result.push(currentEma);
  }
  return result;
}

// ---------------- BACKTESTER ----------------

async function runBacktestSimulation() {
  const strategy = selStrategy.value;
  const days = Number(selDays.value);

  btnRunBacktest.disabled = true;
  btnRunBacktest.innerHTML = `<span>SIMULATING...</span>`;

  try {
    const res = await fetch("/api/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: currentSymbol,
        strategy,
        timeframe: currentTimeframe,
        days,
        initialCapital: 10000,
        riskPerTradePct: 2.0
      })
    }).then((r) => r.json());

    if (res.success && res.backtest) {
      const b = res.backtest;
      btWinRate.textContent = `${b.winRatePct}%`;
      btWinRatio.textContent = `${b.winTrades} W / ${b.lossTrades} L (${b.totalTrades} Total)`;

      const isProfit = b.netProfitUsd >= 0;
      btNetProfit.className = `stat-value ${isProfit ? "text-emerald" : "text-crimson"}`;
      btNetProfit.textContent = `${isProfit ? "+" : ""}\$${b.netProfitUsd.toLocaleString()}`;
      btRoi.textContent = `${isProfit ? "+" : ""}${b.totalReturnPct}% ROI`;

      btProfitFactor.textContent = b.profitFactor;
      btMaxDd.textContent = `-${b.maxDrawdownPct}%`;
      btSharpe.textContent = b.sharpeRatio;

      renderEquityCurve(b.equityCurve);
    }
  } catch (err) {
    console.error("Backtest failed:", err);
  } finally {
    btnRunBacktest.disabled = false;
    btnRunBacktest.innerHTML = `<span>RUN AUDIT</span>`;
  }
}

function renderEquityCurve(curve) {
  if (!curve || !curve.length) return;

  const ctx = equityCanvas.getContext("2d");
  const rect = equityCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const dpr = window.devicePixelRatio || 1;
  equityCanvas.width = width * dpr;
  equityCanvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const values = curve.map((c) => c.equity);
  const minEq = Math.min(...values);
  const maxEq = Math.max(...values);
  const range = maxEq - minEq || 1;

  function getX(i) {
    return (i / (curve.length - 1)) * (width - 20) + 10;
  }
  function getY(val) {
    return height - 15 - ((val - minEq) / range) * (height - 30);
  }

  // Draw Gradient Fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(0, 255, 157, 0.25)");
  gradient.addColorStop(1, "rgba(0, 255, 157, 0.0)");

  ctx.beginPath();
  ctx.moveTo(getX(0), height - 10);
  curve.forEach((c, i) => {
    ctx.lineTo(getX(i), getY(c.equity));
  });
  ctx.lineTo(getX(curve.length - 1), height - 10);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw Line
  ctx.strokeStyle = "#00ff9d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  curve.forEach((c, i) => {
    if (i === 0) ctx.moveTo(getX(i), getY(c.equity));
    else ctx.lineTo(getX(i), getY(c.equity));
  });
  ctx.stroke();

  // Draw Points
  ctx.fillStyle = "#00f0ff";
  curve.forEach((c, i) => {
    if (i === 0 || i === curve.length - 1 || i % 6 === 0) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(c.equity), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

btnRunBacktest.addEventListener("click", runBacktestSimulation);

// ---------------- AI COPILOT ----------------

async function handleCopilotPrompt(userPrompt) {
  if (!userPrompt.trim()) return;

  // Append user message
  appendChatMessage("user", userPrompt);
  copilotInput.value = "";

  // Append thinking placeholder
  const thinkingId = `think-${Date.now()}`;
  appendChatMessage(
    "assistant",
    `<em>Querying MCP Tools (telemetry, technical signals, backtester)...</em>`,
    thinkingId
  );

  try {
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userPrompt,
        symbol: currentSymbol,
        timeframe: currentTimeframe
      })
    }).then((r) => r.json());

    const thinkingMsg = document.getElementById(thinkingId);
    if (thinkingMsg) thinkingMsg.remove();

    if (res.success) {
      appendChatMessage("assistant", formatMarkdown(res.analysis));

      // If backtest returned, update backtest widgets
      if (res.backtest) {
        btWinRate.textContent = `${res.backtest.winRatePct}%`;
        btWinRatio.textContent = `${res.backtest.winTrades} W / ${res.backtest.lossTrades} L`;
        const isProfit = res.backtest.netProfitUsd >= 0;
        btNetProfit.className = `stat-value ${isProfit ? "text-emerald" : "text-crimson"}`;
        btNetProfit.textContent = `${isProfit ? "+" : ""}\$${res.backtest.netProfitUsd}`;
        btRoi.textContent = `${res.backtest.totalReturnPct}% ROI`;
        btProfitFactor.textContent = res.backtest.profitFactor;
        btMaxDd.textContent = `-${res.backtest.maxDrawdownPct}%`;
        btSharpe.textContent = res.backtest.sharpeRatio;
        renderEquityCurve(res.backtest.equityCurve);
      }
    } else {
      appendChatMessage("assistant", `<span class="text-crimson">Error: ${res.error}</span>`);
    }
  } catch (err) {
    const thinkingMsg = document.getElementById(thinkingId);
    if (thinkingMsg) thinkingMsg.remove();
    appendChatMessage("assistant", `<span class="text-crimson">Network error executing agent query.</span>`);
  }
}

function appendChatMessage(role, htmlContent, id = null) {
  const msg = document.createElement("div");
  msg.className = `chat-msg msg-${role}`;
  if (id) msg.id = id;

  const isAssistant = role === "assistant";
  const author = isAssistant ? `<span class="agent-avatar">🤖</span> NEXUSTRADER COPILOT` : `👤 YOU`;
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msg.innerHTML = `
    <div class="msg-author">${author} <span class="msg-time">${timeStr}</span></div>
    <div class="msg-body">${htmlContent}</div>
  `;

  copilotChat.appendChild(msg);
  copilotChat.scrollTop = copilotChat.scrollHeight;
}

function formatMarkdown(text) {
  return text
    .replace(/### (.*?)\n/g, "<h3>$1</h3>")
    .replace(/#### (.*?)\n/g, "<h4>$1</h4>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/- (.*?)\n/g, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n/g, "<br><br>");
}

copilotForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleCopilotPrompt(copilotInput.value);
});

document.querySelectorAll(".prompt-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const p = chip.getAttribute("data-prompt");
    if (p) handleCopilotPrompt(p);
  });
});

// ---------------- ASSET & TIMEFRAME SELECTORS ----------------

function selectAsset(symbol) {
  currentSymbol = symbol;
  chartSymbol.textContent = symbol;

  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.toggle("active", c.getAttribute("data-symbol") === symbol);
  });

  loadMarketData();
  runBacktestSimulation();
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const sym = chip.getAttribute("data-symbol");
    if (sym) selectAsset(sym);
  });
});

document.querySelectorAll(".tf-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".tf-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentTimeframe = chip.getAttribute("data-tf") || "1h";
    loadMarketData();
  });
});

[chkEma, chkSignals, chkBollinger].forEach((chk) => {
  chk.addEventListener("change", renderCandleChart);
});

// ---------------- MCP MODAL & CONFIG ----------------

const MCP_CONFIGS = {
  claude: `{
  "mcpServers": {
    "nexustrader": {
      "command": "node",
      "args": [
        "${window.location.protocol}//${window.location.host}/api/mcp/rpc"
      ],
      "env": {
        "NEXUS_ENV": "production"
      }
    }
  }
}`,
  cursor: `{
  "mcpServers": {
    "nexustrader-mcp": {
      "url": "${window.location.protocol}//${window.location.host}/api/mcp/rpc"
    }
  }
}`,
  http: `curl -X POST ${window.location.protocol}//${window.location.host}/api/mcp/rpc \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_market_telemetry",
      "arguments": { "symbol": "BTC/USDT" }
    }
  }'`
};

function setMcpConfigTab(tabName) {
  document.querySelectorAll(".config-tabs .tab").forEach((t) => {
    t.classList.toggle("active", t.getAttribute("data-tab") === tabName);
  });
  mcpConfigCode.textContent = MCP_CONFIGS[tabName] || MCP_CONFIGS.claude;
}

btnOpenMcpModal.addEventListener("click", () => {
  setMcpConfigTab("claude");
  mcpModal.classList.add("open");
});

btnCloseMcpModal.addEventListener("click", () => {
  mcpModal.classList.remove("open");
});

mcpModal.addEventListener("click", (e) => {
  if (e.target === mcpModal) mcpModal.classList.remove("open");
});

document.querySelectorAll(".config-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    setMcpConfigTab(tab.getAttribute("data-tab"));
  });
});

btnCopyConfig.addEventListener("click", () => {
  navigator.clipboard.writeText(mcpConfigCode.textContent).then(() => {
    btnCopyConfig.textContent = "COPIED!";
    setTimeout(() => (btnCopyConfig.textContent = "COPY CONFIG"), 2000);
  });
});

// ---------------- INITIALIZATION ----------------

window.addEventListener("resize", () => {
  renderCandleChart();
});

window.addEventListener("DOMContentLoaded", () => {
  initWebSocket();
  loadMarketData();
  runBacktestSimulation();
});
