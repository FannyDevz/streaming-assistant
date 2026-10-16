// Ticker antrian request: request pending berjalan (marquee).
(() => {
  "use strict";

  const bar = document.getElementById("bar");
  const track = document.getElementById("track");
  const params = new URLSearchParams(location.search);
  if (params.get("pos") === "top") bar.classList.add("top");
  const LIMIT = Math.min(Math.max(1, Number(params.get("limit")) || 15), 40);

  const cleanName = (s) => "@" + String(s || "").replace(/^@+/, "");
  const esc = (s) =>
    String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  let last = "";

  function render(entries) {
    if (entries.length === 0) {
      TickerMarquee.set(track, null);
      track.innerHTML = '<span class="item"><span style="opacity:.6">Belum ada request…</span></span>';
      return;
    }
    const block = entries
      .map(
        (e) =>
          `<span class="item"><span class="badge">${esc(e.reward)}</span>` +
          `<span class="who">${esc(cleanName(e.name))}</span>` +
          (e.message ? `<span>${esc(e.message)}</span>` : "") +
          `<span class="sep">•</span></span>`,
      )
      .join("");
    TickerMarquee.set(track, block);
  }

  async function tick() {
    try {
      const res = await fetch(`/public/requests?limit=${LIMIT}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries = data.entries || [];
      const key = entries.map((e) => e.id).join(",");
      if (key !== last) {
        last = key;
        render(entries);
      }
    } catch {
      /* coba lagi */
    }
  }

  tick();
  setInterval(tick, 5000);
})();
