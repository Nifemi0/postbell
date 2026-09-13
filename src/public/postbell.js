const brandMark = "assets/postbell/postbell-mark.svg";
if (!document.querySelector('link[rel="icon"]')) { const icon = document.createElement("link"); icon.rel = "icon"; icon.type = "image/svg+xml"; icon.href = brandMark; document.head.appendChild(icon); }
document.querySelectorAll(".wordmark").forEach((wordmark) => { if (!wordmark.querySelector("img")) { const img = document.createElement("img"); img.src = brandMark; img.alt = ""; img.width = 18; img.height = 18; img.style.cssText = "width:18px;height:18px;vertical-align:-4px;margin-right:8px"; wordmark.prepend(img); } });
const tickerButtons = [...document.querySelectorAll(".ticker")];

const revealSections = [...document.querySelectorAll(".content-section")];
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18 });
  revealSections.forEach((section) => revealObserver.observe(section));
} else {
  revealSections.forEach((section) => section.classList.add("in-view"));
}

const responsivePatch = document.createElement("style");
responsivePatch.textContent = "@media(max-width:580px){body{overflow-x:hidden}.hero-copy{display:block;width:100%;min-width:0}.hero-copy>*{min-width:0;max-width:100%}.hero-copy h1{font-size:38px;overflow-wrap:anywhere}.hero-copy p{margin-top:28px}.hero-copy .button{margin-top:30px;width:100%}.app-window,.morning-brief{min-width:0}}";
document.head.appendChild(responsivePatch);
if (window.innerWidth <= 580) {
  const heroTitle = document.querySelector(".hero-copy h1");
  const heroText = document.querySelector(".hero-copy p");
  if (heroTitle) heroTitle.style.cssText += ";font-size:32px;width:100%;white-space:normal;word-break:break-word";
  if (heroText) heroText.style.cssText += ";width:100%;max-width:100%;white-space:normal;word-break:break-word";
}

const byId = (id) => document.getElementById(id);
const formatPct = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
const formatPrice = (value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function chartPath(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1e-9, max - min); const pad = range * 0.12;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 640;
    const y = 135 - ((point - (min - pad)) / (range + pad * 2)) * 105;
    return [x, y];
  });
  let path = `M${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 1; i < coords.length - 1; i += 1) { const midX = (coords[i][0] + coords[i + 1][0]) / 2; const midY = (coords[i][1] + coords[i + 1][1]) / 2; path += ` Q${coords[i][0].toFixed(1)} ${coords[i][1].toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`; }
  const last = coords[coords.length - 1]; const previous = coords[coords.length - 2];
  return `${path} Q${previous[0].toFixed(1)} ${previous[1].toFixed(1)} ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

function renderSignal(signal) {
  if (!signal) return;
  setText("signal-icon", signal.symbol.slice(1, 3));
  setText("signal-name", signal.name);
  setText("signal-symbol", `${signal.symbol} · BITGET`);
  setText("signal-price", formatPrice(signal.price));
  setText("signal-change", signal.referenceCloseSource ? `${formatPct(signal.overnightChangePct)} vs 24h reference` : `${formatPct(signal.overnightChangePct)} overnight`);
  setText("signal-summary-label", signal.referenceCloseSource ? "Live Bitget market signal" : "Largest verified overnight divergence");
  setText("signal-thesis", signal.thesis);
  setText("analysis-confidence", `${signal.confidence}% confidence`);
  if (signal.referenceCloseSource) {
    setText("analysis-thesis-head", signal.direction === "down" ? "The token is below its 24h reference." : "The token is above its 24h reference.");
  }
  setText("analysis-thesis-copy", signal.thesis);
  setText("analysis-risk", signal.risk);
  setText("task-detect", `${signal.symbol} is the lead overnight move at ${formatPct(signal.overnightChangePct)}.`);
  setText("task-connect", signal.thesis);
  setText("task-decide", signal.risk);

  const path = chartPath(signal.chart);
  const marketLine = byId("market-line");
  if (path && marketLine) marketLine.setAttribute("d", path);

  signal.events?.slice(0, 2).forEach((event, index) => {
    const n = index + 1;
    setText(`event-time-${n}`, `${event.timestamp} ET`);
    setText(`event-title-${n}`, event.title);
    setText(`event-detail-${n}`, event.detail);
  });
  signal.sources?.slice(0, 3).forEach((source) => {
    setText(`source-${source.id}-title`, source.title);
    setText(`source-${source.id}-detail`, source.detail);
  });
}

async function loadSignal(symbol) {
  try {
    const [analysisResponse, briefResponse] = await Promise.all([
      fetch(`/api/postbell/analysis?symbol=${encodeURIComponent(symbol)}`),
      fetch("/api/postbell/brief")
    ]);
    const analysisPayload = await analysisResponse.json();
    const briefPayload = await briefResponse.json();
    if (analysisPayload.success && briefPayload.success) {
      const signal = briefPayload.brief.signals.find((item) => item.symbol === symbol);
      renderSignal({ ...signal, ...analysisPayload.analysis });
    }
  } catch (error) {
    // The embedded representative copy remains useful if the API is unavailable.
  }
}

async function loadBrief() {
  try {
    const response = await fetch("/api/postbell/brief");
    const payload = await response.json();
    if (!payload.success) return;
    const { brief } = payload;
    const selected = brief.signals[0];
    setText("brief-time", `${brief.session} · ${new Date(brief.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    setText("brief-summary", `${brief.signals.length} material signals detected across ${brief.coverage.assets} tokenized US stocks · ${brief.dataMode} data`);
    brief.signals.forEach((signal) => {
      const button = tickerButtons.find((item) => item.dataset.symbol === signal.symbol);
      if (!button) return;
      const change = button.querySelector("em");
      if (change) {
        change.textContent = formatPct(signal.overnightChangePct);
        change.classList.toggle("down", signal.overnightChangePct < 0);
      }
    });
    renderSignal(selected);
  } catch {
    setText("brief-time", "Overnight watch · representative data");
  }
}

tickerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tickerButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadSignal(button.dataset.symbol);
  });
});

document.querySelector("#run-research-task")?.addEventListener("click", () => {
  const task = document.querySelector("#research-task");
  if (!task) return;
  task.classList.add("complete");
  const button = document.querySelector("#run-research-task");
  if (button) button.textContent = "Task complete ✓";
});

document.querySelector("#ask-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#ask-question");
  const status = document.querySelector("#ask-status");
  const button = event.currentTarget.querySelector("button[type=submit]");
  const question = input?.value?.trim();
  if (!question) return;
  if (button) { button.disabled = true; button.textContent = "Researching…"; }
  if (status) status.textContent = "Reading Bitget market data and source monitor…";
  try {
    const activeTicker = document.querySelector(".ticker.active")?.dataset.symbol || "rNVDA";
    const response = await fetch("/api/postbell/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, symbol: activeTicker })
    });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "AI research is unavailable.");
    const result = payload.research;
    setText("task-detect", result.steps.detect);
    setText("task-connect", result.steps.connect);
    setText("task-decide", result.steps.decide);
    setText("research-uncertainty", result.uncertainty);
    const sourceStatus = result.evidence.map((item) => `${item.title} · ${item.status}`).join("  |  ");
    setText("research-citation", sourceStatus);
    document.querySelector("#research-task")?.classList.add("complete");
    if (status) status.textContent = `${result.dataMode} research complete · evidence chain ready`;
  } catch (error) {
    if (status) status.textContent = error?.message || "AI research is unavailable · connect a model in Model Settings";
  } finally {
    if (button) { button.disabled = false; button.textContent = "Research"; }
  }
});

document.querySelectorAll(".app-nav").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".app-nav").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelector(".quick-search")?.addEventListener("click", () => {
  tickerButtons[0]?.focus();
});

loadBrief();
