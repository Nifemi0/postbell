const adminKeyName = "postbell-admin-access";
const login = document.getElementById("admin-login");
const shell = document.getElementById("admin-shell");
const loginForm = document.getElementById("admin-login-form");
const loginMessage = document.getElementById("login-message");
const keyInput = document.getElementById("admin-key");
const text = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
const eventLabels = { page_view: "Page viewed", research_success: "Research completed", research_error: "Research failed", model_connected: "Model connected", watch_started: "Private watch started" };

function dataRows(id, rows, labelKey, valueKey, emptyText) {
  const root = document.getElementById(id); root.replaceChildren();
  if (!rows.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = emptyText; root.appendChild(empty); return; }
  rows.slice(0, 8).forEach((item) => { const row = document.createElement("div"); row.className = "data-row"; const label = document.createElement("span"); label.textContent = item[labelKey]; const value = document.createElement("strong"); value.textContent = String(item[valueKey]); row.append(label, value); root.appendChild(row); });
}

function renderChart(days) {
  const root = document.getElementById("activity-chart"); root.replaceChildren();
  const max = Math.max(1, ...days.flatMap((day) => [Number(day.page_view || 0), Number(day.research_success || 0) + Number(day.research_error || 0)]));
  days.forEach((day) => { const cell = document.createElement("div"); cell.className = "chart-day"; const bars = document.createElement("div"); bars.className = "bars"; const views = document.createElement("i"); views.className = "bar"; views.style.height = `${Math.max(3, Number(day.page_view || 0) / max * 100)}%`; views.title = `${day.page_view || 0} page views`; const research = document.createElement("i"); research.className = "bar research"; const researchCount = Number(day.research_success || 0) + Number(day.research_error || 0); research.style.height = `${Math.max(3, researchCount / max * 100)}%`; research.title = `${researchCount} research runs`; const label = document.createElement("small"); label.textContent = new Date(`${day.day}T12:00:00Z`).toLocaleDateString([], { weekday: "short" }); bars.append(views, research); cell.append(bars, label); root.appendChild(cell); });
}

function renderRecent(items) {
  const root = document.getElementById("recent"); root.replaceChildren();
  const visible = items.filter((item) => item.event !== "heartbeat");
  if (!visible.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Activity will appear as people use Postbell."; root.appendChild(empty); return; }
  visible.slice(0, 20).forEach((item) => { const row = document.createElement("div"); row.className = "recent-row"; const time = document.createElement("time"); time.textContent = new Date(item.at).toLocaleString(); const label = document.createElement("strong"); label.textContent = eventLabels[item.event] || item.event; if (item.event === "research_error") label.className = "status-error"; const context = document.createElement("small"); context.textContent = item.provider || item.path || item.status || "Postbell"; row.append(time, label, context); root.appendChild(row); });
}

function render(metrics) {
  const today = metrics.today || {};
  const completed = Number(today.research_success || 0); const failed = Number(today.research_error || 0); const runs = completed + failed;
  text("visitors", Number(today.visitors || 0).toLocaleString());
  text("sessions", `${Number(today.sessions || 0).toLocaleString()} browser session${Number(today.sessions || 0) === 1 ? "" : "s"}`);
  text("active", Number(today.active || 0).toLocaleString());
  text("research-runs", runs.toLocaleString());
  text("success-rate", runs ? `${Math.round(completed / runs * 100)}% completed successfully` : "No completed runs yet");
  text("average-response", today.averageResearchMs ? `${(Number(today.averageResearchMs) / 1000).toFixed(1)}s` : "—");
  text("last-updated", `Updated ${new Date(metrics.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  text("storage-status", metrics.persistent ? "Persistent analytics" : "Current runtime only");
  renderChart(metrics.daily || []);
  dataRows("routes", metrics.routes || [], "path", "views", "No page views recorded today.");
  dataRows("providers", metrics.providers || [], "provider", "runs", "No model activity recorded today.");
  renderRecent(metrics.recent || []);
}

async function loadDashboard(key = sessionStorage.getItem(adminKeyName)) {
  if (!key) return;
  const response = await fetch("/api/postbell/admin/metrics", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error || "Could not load analytics.");
  sessionStorage.setItem(adminKeyName, key); login.hidden = true; shell.hidden = false; render(payload.metrics);
}

loginForm.addEventListener("submit", async (event) => { event.preventDefault(); loginMessage.textContent = "Checking access…"; try { await loadDashboard(keyInput.value); loginMessage.textContent = ""; keyInput.value = ""; } catch (error) { loginMessage.textContent = error.message || "Access denied."; } });
document.getElementById("refresh").addEventListener("click", () => loadDashboard().catch(() => text("storage-status", "Refresh failed")));
document.getElementById("logout").addEventListener("click", () => { sessionStorage.removeItem(adminKeyName); shell.hidden = true; login.hidden = false; keyInput.focus(); });
setInterval(() => { if (!shell.hidden) loadDashboard().catch(() => {}); }, 30_000);
loadDashboard().catch(() => sessionStorage.removeItem(adminKeyName));
