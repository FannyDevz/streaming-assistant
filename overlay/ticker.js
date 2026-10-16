// Ticker event: polling /public/recent, tampilkan alert terbaru berjalan.
(() => {
  "use strict";

  const track = document.getElementById("track");
  const params = new URLSearchParams(location.search);
  const LIMIT = Math.min(Math.max(1, Number(params.get("limit")) || 12), 50);
  const REFRESH_MS = 12000;

  const cleanName = (s) => "@" + String(s || "").replace(/^@+/, "");
  const esc = (s) =>
    String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  let lastKey = "";

  function render(entries) {
    if (!entries.length) {
      TickerMarquee.set(track, null);
      track.innerHTML = '<span class="empty">Belum ada alert…</span>';
      return;
    }
    // Bangun satu blok item; helper mengulang & menggeser agar marquee mulus.
    const block = entries
      .map(
        (e) =>
          `<span class="item"><span class="who">${esc(cleanName(e.name))}</span>` +
          `<span>${esc(e.message)}</span>` +
          `<span class="sep">•</span></span>`,
      )
      .join("");
    TickerMarquee.set(track, block);
  }

  async function tick() {
    try {
      const res = await fetch(`/public/recent?limit=${LIMIT}`, { cache: "no-store" });
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
  setInterval(tick, REFRESH_MS);
})();
