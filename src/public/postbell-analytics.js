(() => {
  const visitorKey = "postbell-anonymous-visitor";
  const sessionKey = "postbell-anonymous-session";
  const makeId = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
  const getId = (storage, key, prefix) => {
    let value = storage.getItem(key);
    if (!value) { value = makeId(prefix); storage.setItem(key, value); }
    return value;
  };
  const visitorId = getId(localStorage, visitorKey, "visitor");
  const sessionId = getId(sessionStorage, sessionKey, "session");

  async function track(event, details = {}) {
    const payload = { event, visitorId, sessionId, path: location.pathname, ...details };
    try {
      await fetch("/api/postbell/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {}
  }

  window.PostbellAnalytics = { track };
  if (!location.pathname.includes("postbell-admin")) {
    track("page_view");
    setInterval(() => { if (document.visibilityState === "visible") track("heartbeat"); }, 60_000);
  }
})();
