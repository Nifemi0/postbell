const tapeState = { symbol: "rNVDA" };
const byId = (id) => document.getElementById(id);

function setTapeText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function renderEvents(events) {
  const container = byId("tape-events");
  if (!container) return;
  container.replaceChildren();
  events.forEach((event) => {
    const row = document.createElement("div");
    row.className = "tape-event";
    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = event.timestamp;
    const type = document.createElement("span");
    type.className = "event-type";
    type.textContent = event.category;
    const copy = document.createElement("div");
    copy.className = "event-copy";
    const title = document.createElement("h3");
    title.textContent = event.title;
    const detail = document.createElement("p");
    detail.textContent = event.detail;
    copy.append(title, detail);
    row.append(time, type, copy);
    container.append(row);
  });
}

async function loadTape(symbol) {
  setTapeText("coverage-symbol", symbol);
  setTapeText("coverage-events", "…");
  try {
    const [tapeResponse, watchResponse] = await Promise.all([
      fetch(`/api/postbell/night-tape?symbol=${encodeURIComponent(symbol)}`),
      fetch("/api/postbell/watch")
    ]);
    const payload = await tapeResponse.json();
    const watchPayload = await watchResponse.json();
    if (!payload.success) throw new Error("Tape unavailable");
    const agentEvents = watchPayload.success ? watchPayload.watch.alerts.filter((alert) => alert.symbol === symbol).slice(0, 5).map((alert) => ({
      timestamp: new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title: alert.title,
      detail: alert.detail,
      category: "AGENT SCAN"
    })) : [];
    const events = [...agentEvents, ...payload.events];
    renderEvents(events);
    setTapeText("coverage-events", String(events.length));
    setTapeText("coverage-mode", payload.dataMode);
    setTapeText("coverage-title", `${symbol} monitor active`);
    setTapeText("coverage-copy", `${events.length} material events currently shape the ${symbol} overnight story.`);
    setTapeText("tape-updated", `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  } catch {
    setTapeText("coverage-events", "0");
    setTapeText("coverage-mode", "unavailable");
    setTapeText("coverage-copy", "The tape could not be refreshed. Try again in a moment.");
  }
}

document.querySelectorAll(".symbol-tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".symbol-tab").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  tapeState.symbol = button.dataset.symbol;
  loadTape(tapeState.symbol);
}));

loadTape(tapeState.symbol);
