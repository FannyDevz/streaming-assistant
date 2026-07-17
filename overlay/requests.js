// Overlay antrian request: polling /public/requests, tampilkan request pending.
(() => {
  "use strict";

  const panel = document.getElementById("panel");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const params = new URLSearchParams(location.search);
  const LIMIT = Math.min(Math.max(1, Number(params.get("limit")) || 10), 30);
  const POS = ["top-right", "top-left", "bottom-right", "bottom-left"].includes(params.get("pos") || "")
    ? params.get("pos")
    : "top-right";
  panel.className = `panel pos-${POS}`;
  if (params.get("title")) panel.querySelector(".title").textContent = params.get("title");

  const cleanName = (s) => "@" + String(s || "").replace(/^@+/, "");
  const esc = (s) =>
    String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  let lastKey = "";

  function render(entries) {
    emptyEl.hidden = entries.length > 0;
    listEl.replaceChildren();
    for (const e of entries.slice(0, LIMIT)) {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML =
        `<div class="row"><span class="badge">${esc(e.reward)}</span>` +
        `<span class="who">${esc(cleanName(e.name))}</span></div>` +
        (e.message ? `<div class="msg">${esc(e.message)}</div>` : "");
      listEl.appendChild(li);
    }
  }

  async function tick() {
    try {
      const res = await fetch(`/public/requests?limit=${LIMIT}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries = data.entries || [];
      const key = entries.map((e) => e.id).join(",");
      if (key !== lastKey) {
        lastKey = key;
        render(entries);
      }
    } catch {
      /* coba lagi nanti */
    }
  }

  tick();
  setInterval(tick, 4000);
})();
