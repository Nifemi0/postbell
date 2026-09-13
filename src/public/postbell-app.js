const state = { symbol: "rNVDA", brief: null, research: null, watch: null };
const $ = (id) => document.getElementById(id);
const formatPct = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(Number(value)).toFixed(2)}%`;
const formatPrice = (value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const setText = (id, value) => { if ($(id)) $(id).textContent = value; };

function smoothChartPath(points, width, height) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const min = Math.min(...points); const max = Math.max(...points); const range = Math.max(1e-9, max - min);
  const pad = range * 0.12;
  const y = (value) => height - 18 - ((value - (min - pad)) / (range + pad * 2)) * (height - 36);
  const coords = points.map((value, index) => [index / (points.length - 1) * width, y(value)]);
  let path = `M${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 1; i < coords.length - 1; i += 1) {
    const midX = (coords[i][0] + coords[i + 1][0]) / 2; const midY = (coords[i][1] + coords[i + 1][1]) / 2;
    path += ` Q${coords[i][0].toFixed(1)} ${coords[i][1].toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = coords[coords.length - 1]; const previous = coords[coords.length - 2];
  path += ` Q${previous[0].toFixed(1)} ${previous[1].toFixed(1)} ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  return { line: path, area: `${path} L${width} ${height} L0 ${height} Z` };
}

function renderBrief(signal, brief) {
  if (!signal) return;
  setText("signal-name", signal.name);
  setText("signal-price", formatPrice(signal.price));
  setText("signal-change", signal.referenceCloseSource ? `${formatPct(signal.overnightChangePct)} vs 24h reference` : `${formatPct(signal.overnightChangePct)} overnight`);
  $("signal-change")?.classList.toggle("down", Number(signal.overnightChangePct) < 0);
  setText("data-mode", `${brief?.dataMode || signal.dataMode || "representative"} data`);
  setText("signal-source", `${signal.sources?.[0]?.title || "Bitget ticker"} · ${signal.sources?.[0]?.detail || "source metadata"}`);
  const chart = smoothChartPath(signal.chart, 760, 260);
  if (chart) {
    $("chart-market")?.setAttribute("d", chart.line);
    document.querySelector(".chart-area")?.setAttribute("d", chart.area);
  }
}

function renderResearch(result) {
  state.research = result;
  setText("question-readout", result.question);
  setText("task-detect", result.steps.detect);
  setText("task-connect", result.steps.connect);
  setText("task-decide", result.steps.decide);
  setText("uncertainty", result.uncertainty);
  setText("evidence-count", `${result.evidence.length} sources`);
  const modelAnswer = result.analyst && !result.analyst.startsWith("Evidence synthesis is deterministic") && !result.analyst.startsWith("Postbell compared");
  setText("confidence", modelAnswer ? "AI response · live evidence" : result.dataMode === "live" ? "live evidence" : "representative evidence");
  setText("thesis", result.steps.connect);
  setText("thesis-copy", result.analyst);
  setText("watchpoint", result.steps.decide);
  const list = $("evidence-list");
  if (list) {
    list.innerHTML = "";
    result.evidence.forEach((item, index) => {
      const row = document.createElement("div"); row.className = "evidence-item";
      const number = document.createElement("span"); number.textContent = String(index + 1).padStart(2, "0");
      const body = document.createElement("div");
      const title = document.createElement("b"); title.textContent = item.title;
      const detail = document.createElement("small"); detail.textContent = `${item.detail} · ${item.status}`;
      const link = document.createElement("a"); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Open source ↗";
      body.append(title, detail, link); row.append(number, body); list.append(row);
    });
  }
}

async function loadBrief() {
  try {
    const response = await fetch("/api/postbell/brief"); const payload = await response.json();
    if (!payload.success) throw new Error("brief unavailable");
    state.brief = payload.brief;
    payload.brief.signals.forEach((signal) => {
      setText(`change-${signal.symbol}`, formatPct(signal.overnightChangePct));
      $(`change-${signal.symbol}`)?.classList.toggle("down", Number(signal.overnightChangePct) < 0);
    });
    renderBrief(payload.brief.signals[0], payload.brief);
    setText("brief-stamp", `updated ${new Date(payload.brief.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  } catch { setText("brief-stamp", "using last valid brief"); }
}

async function runResearch(question = $("research-question")?.value.trim()) {
  if (!question) return;
  const submit = $("research-submit"); if (submit) { submit.disabled = true; submit.textContent = "Researching…"; }
  setText("question-readout", question); setText("data-mode", "reading evidence");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const llmSessionId = localStorage.getItem("postbell-llm-session");
    const response = await fetch("/api/postbell/research", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...(llmSessionId ? { "X-Postbell-LLM-Session": llmSessionId } : {}) }, body: JSON.stringify({ question, symbol: state.symbol }) });
    const payload = await response.json(); if (!payload.success) throw new Error(payload.error || "AI research is unavailable.");
    renderResearch(payload.research);
  } catch (error) { setText("uncertainty", error?.name === "AbortError" ? "The AI response took too long. Try again." : error?.message || "AI research is unavailable. Connect a model in Model Settings."); }
  finally { clearTimeout(timeout); if (submit) { submit.disabled = false; submit.innerHTML = "Run research <span>↗</span>"; } }
}

$("research-form")?.addEventListener("submit", (event) => { event.preventDefault(); runResearch(); });
document.querySelectorAll(".asset-chip").forEach((chip) => chip.addEventListener("click", () => {
  document.querySelectorAll(".asset-chip").forEach((item) => item.classList.remove("active")); chip.classList.add("active"); state.symbol = chip.dataset.symbol;
  const signal = state.brief?.signals.find((item) => item.symbol === state.symbol); if (signal) renderBrief(signal, state.brief); runResearch($("research-question")?.value.trim());
}));

function renderSaved() {
  const saved = JSON.parse(localStorage.getItem("postbell-saved") || "[]"); const list = $("saved-list"); if (!list) return;
  if (!saved.length) { list.innerHTML = '<p class="saved-empty">No saved briefs yet. Save a research run and it will stay on this device.</p>'; return; }
  list.innerHTML = ""; saved.slice(0, 5).forEach((item, index) => { const row = document.createElement("div"); row.className = "saved-item"; row.innerHTML = `<div><b>${item.symbol} · ${item.title}</b><small>${item.timestamp}</small></div><button type="button" data-index="${index}" aria-label="Remove saved brief">Remove</button>`; list.append(row); });
  list.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { saved.splice(Number(button.dataset.index), 1); localStorage.setItem("postbell-saved", JSON.stringify(saved)); renderSaved(); }));
}

$("save-brief")?.addEventListener("click", () => { if (!state.research) return runResearch(); const saved = JSON.parse(localStorage.getItem("postbell-saved") || "[]"); saved.unshift({ symbol: state.symbol, title: state.research.question.slice(0, 78), summary: state.research.steps.connect, watchpoint: state.research.steps.decide, timestamp: new Date().toLocaleString() }); localStorage.setItem("postbell-saved", JSON.stringify(saved.slice(0, 12))); setText("save-brief", "Saved ✓"); });

function renderWatch(watch) {
  state.watch = watch;
  const panel = document.querySelector(".session-dial");
  panel?.classList.toggle("agent-active", watch.active);
  setText("watch-status", watch.active ? "Watching the night" : "Standing by");
  setText("watch-copy", watch.active ? `Scanning Bitget every ${watch.scanIntervalSeconds} seconds, even when this page is closed.` : "Start a watch and Postbell will keep scanning when this page is closed.");
  setText("watch-toggle", watch.active ? "Stop watch" : "Start watch");
  const lastScan = watch.lastScanAt ? new Date(watch.lastScanAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  setText("watch-meta", lastScan ? `${watch.scanCount} scan${watch.scanCount === 1 ? "" : "s"} · last ${lastScan} · lead ${watch.leadSymbol}` : "No scans yet");
}

async function refreshWatch() {
  try {
    const response = await fetch("/api/postbell/watch");
    const payload = await response.json();
    if (payload.success) renderWatch(payload.watch);
  } catch {}
}

async function updateWatch(action) {
  const button = action === "scan" ? $("watch-scan") : $("watch-toggle");
  if (button) button.disabled = true;
  try {
    const response = await fetch(`/api/postbell/watch/${action}`, { method: "POST" });
    const payload = await response.json();
    if (payload.success) { renderWatch(payload.watch); await loadBrief(); }
  } finally {
    if (button) button.disabled = false;
  }
}

$("watch-toggle")?.addEventListener("click", () => updateWatch(state.watch?.active ? "stop" : "start"));
$("watch-scan")?.addEventListener("click", () => updateWatch("scan"));
setInterval(refreshWatch, 10_000);

refreshWatch(); loadBrief(); runResearch($("research-question")?.value.trim());
