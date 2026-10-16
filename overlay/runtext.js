// Running text overlay: teks bebas (dari Aturan) berjalan. Pisah beberapa pesan dengan "|".
(() => {
  "use strict";

  const bar = document.getElementById("bar");
  const track = document.getElementById("track");
  const labelEl = document.getElementById("label");
  const params = new URLSearchParams(location.search);
  if (params.get("pos") === "top") bar.classList.add("top");

  const esc = (s) =>
    String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  let last = "";

  function render(label, text) {
    labelEl.textContent = label || "📢 INFO";
    const items = String(text || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) {
      TickerMarquee.set(track, null);
      track.innerHTML = "";
      return;
    }
    const block = items
      .map((t) => `<span class="item"><span>${esc(t)}</span><span class="sep">•</span></span>`)
      .join("");
    TickerMarquee.set(track, block);
  }

  async function tick() {
    try {
      const res = await fetch("/public/runtext", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      const key = (d.label || "") + "|" + (d.text || "");
      if (key !== last) {
        last = key;
        render(d.label, d.text);
      }
    } catch {
      /* coba lagi */
    }
  }

  tick();
  setInterval(tick, 8000);
})();
