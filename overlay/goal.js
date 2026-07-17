// Goal bar overlay: polling /public/goal.
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const wrap = document.getElementById("wrap");
  if (params.get("pos") === "top") wrap.classList.add("top");

  const labelEl = document.getElementById("label");
  const pctEl = document.getElementById("pct");
  const fillEl = document.getElementById("fill");
  const curEl = document.getElementById("cur");
  const tgtEl = document.getElementById("tgt");

  async function tick() {
    try {
      const res = await fetch("/public/goal", { cache: "no-store" });
      if (!res.ok) return;
      const g = await res.json();
      if (!g.enabled) {
        wrap.hidden = true;
        return;
      }
      wrap.hidden = false;
      const target = Math.max(1, Number(g.target) || 1);
      const current = Math.max(0, Number(g.current) || 0);
      const pct = Math.min(100, Math.round((current / target) * 100));
      labelEl.textContent = g.label || "Target";
      pctEl.textContent = pct + "%";
      fillEl.style.width = pct + "%";
      curEl.textContent = current.toLocaleString("id-ID");
      tgtEl.textContent = target.toLocaleString("id-ID");
    } catch {
      /* coba lagi */
    }
  }

  tick();
  setInterval(tick, 4000);
})();
