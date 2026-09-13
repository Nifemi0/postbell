const brandMark = "assets/postbell/postbell-mark.svg"; if (!document.querySelector('link[rel="icon"]')) { const icon=document.createElement("link"); icon.rel="icon"; icon.type="image/svg+xml"; icon.href=brandMark; document.head.appendChild(icon); } document.querySelectorAll(".brand-orbit").forEach((node)=>{node.style.background=`url(${brandMark}) center / contain no-repeat`;node.style.border="0";});
const savedList = document.getElementById("saved-page-list");
const savedCount = document.getElementById("saved-count");

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("postbell-saved") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function renderSavedPage() {
  const saved = readSaved();
  savedCount.textContent = `${saved.length} saved brief${saved.length === 1 ? "" : "s"}`;
  savedList.replaceChildren();
  if (!saved.length) {
    const empty = document.createElement("div");
    empty.className = "saved-empty-page";
    empty.innerHTML = '<div class="empty-orbit"></div><h2>Your research library is clear.</h2><p>Run a Morning Brief, inspect the evidence, and save the result when it contains a view worth revisiting.</p><a href="postbell-app.html">Open Morning Brief</a>';
    savedList.append(empty);
    return;
  }
  saved.forEach((item, index) => {
    const record = document.createElement("article");
    record.className = "saved-record";
    const symbol = document.createElement("span");
    symbol.className = "saved-symbol";
    symbol.textContent = item.symbol || "Market";
    const copy = document.createElement("div");
    copy.className = "saved-copy";
    const title = document.createElement("h2");
    title.textContent = item.title || "Saved Postbell research";
    const summary = document.createElement("p");
    summary.textContent = item.summary || "Open the Morning Brief to continue this line of research.";
    const time = document.createElement("small");
    time.textContent = item.timestamp || "Saved on this device";
    copy.append(title, summary, time);
    const actions = document.createElement("div");
    actions.className = "saved-actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      saved.splice(index, 1);
      localStorage.setItem("postbell-saved", JSON.stringify(saved));
      renderSavedPage();
    });
    actions.append(remove);
    record.append(symbol, copy, actions);
    savedList.append(record);
  });
}

renderSavedPage();
