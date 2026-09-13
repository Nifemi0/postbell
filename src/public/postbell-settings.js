const sessionKey = "postbell-llm-session";
const getSession = () => localStorage.getItem(sessionKey);
const el = (id) => document.getElementById(id);
const presets = {
  Qwen: { baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  DeepSeek: { baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro" },
  OpenRouter: { baseUrl: "https://openrouter.ai/api/v1", model: "" },
  OpenAI: { baseUrl: "https://api.openai.com/v1", model: "" },
  Ollama: { baseUrl: "http://localhost:11434/v1", model: "qwen3:8b" },
  Custom: { baseUrl: "", model: "" }
};

function headers() {
  const session = getSession();
  return session ? { "X-Postbell-LLM-Session": session } : {};
}

function message(text, type = "") {
  el("model-message").hidden = !text;
  el("model-message").textContent = text;
  el("model-message").className = `form-message ${type}`;
}

function renderStatus(status) {
  const panel = document.querySelector(".model-status");
  panel.classList.toggle("connected", Boolean(status.configured));
  el("engine-name").textContent = status.configured ? status.model : "Built-in research";
  el("engine-copy").textContent = status.configured ? "Your model will help explain the evidence in new research runs." : "You can explore Postbell now. Connecting a model adds AI-written analysis to your market evidence.";
  el("disconnect-model").hidden = !status.configured;
  el("status-provider").textContent = status.configured ? status.provider : "Built in";
  el("status-model").textContent = status.configured ? status.model : "Postbell rules";
  el("status-key").textContent = status.configured ? status.keyHint : "Not required";
  const keyInput = el("api-key");
  if (keyInput && status.configured) {
    keyInput.value = "";
    keyInput.placeholder = status.keyHint === "Local model" ? "No key required for local model" : `Saved locally · ${status.keyHint}`;
  } else if (keyInput && !status.configured) {
    keyInput.placeholder = "Paste your provider key";
  }
  if (status.configured) message(`Connected to ${status.provider} · ${status.model}`, "success");
}

async function loadStatus() {
  try {
  const response = await fetch("/api/postbell/llm", { headers: headers() });
  const payload = await response.json();
  if (payload.success) renderStatus(payload.status);
  } catch { message("We couldn’t check your connection. Please try again.", "error"); }
}

el("provider").addEventListener("change", (event) => {
  const preset = presets[event.target.value];
  el("base-url").value = preset.baseUrl;
  el("model-name").value = preset.model;
  el("api-key").required = event.target.value !== "Ollama";
  el("advanced-settings").open = event.target.value === "Custom";
  message("");
});

el("base-url").addEventListener("invalid", () => { el("advanced-settings").open = true; });

el("reveal-key").addEventListener("click", () => {
  const input = el("api-key");
  input.type = input.type === "password" ? "text" : "password";
  el("reveal-key").textContent = input.type === "password" ? "Show" : "Hide";
});

el("model-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = el("connect-model");
  button.disabled = true;
  el("disconnect-model").disabled = true;
  button.textContent = "Checking connection…";
  message("Contacting your model. This may take a few seconds.");
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  const previousSession = getSession();
  let candidateSession;
  try {
    const response = await fetch("/api/postbell/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error);
    candidateSession = payload.sessionId;
    const testResponse = await fetch("/api/postbell/llm/test", { method: "POST", headers: { "X-Postbell-LLM-Session": candidateSession } });
    const test = await testResponse.json();
    if (!test.success) throw new Error(test.error || "The connection check failed.");
    localStorage.setItem(sessionKey, payload.sessionId);
    renderStatus(payload.status);
    message("Connection checked. Your model is ready for the next brief.", "success");
    if (previousSession) await fetch("/api/postbell/llm", { method: "DELETE", headers: { "X-Postbell-LLM-Session": previousSession } }).catch(() => {});
    candidateSession = null;
  } catch (error) {
    if (candidateSession) await fetch("/api/postbell/llm", { method: "DELETE", headers: { "X-Postbell-LLM-Session": candidateSession } }).catch(() => {});
    const detail = error.message === "fetch failed" ? "We couldn’t reach your model. Check the endpoint and make sure the service is running." : error.message;
    message(detail || "Could not connect the model. Please try again.", "error");
  } finally {
    button.disabled = false;
    el("disconnect-model").disabled = false;
    button.textContent = "Connect and test";
  }
});

/* Standalone test is optional; the main action connects and tests together. */
el("test-model")?.addEventListener("click", async () => {
  if (!getSession()) return message("Connect a model first.", "error");
  message("Testing the model endpoint…");
  try {
    const response = await fetch("/api/postbell/llm/test", { method: "POST", headers: headers() });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error);
    message(`Connection passed · ${payload.result.model}`, "success");
  } catch (error) {
    message(error.message || "The connection test failed.", "error");
  }
});

el("disconnect-model").addEventListener("click", async () => {
  try {
  const response = await fetch("/api/postbell/llm", { method: "DELETE", headers: headers() });
  if (!response.ok) throw new Error("Could not disconnect. Please try again.");
  localStorage.removeItem(sessionKey);
  renderStatus({ configured: false });
  message("Model disconnected. Built-in synthesis is active.");
  } catch(error) { message(error.message, "error"); }
});

loadStatus();
