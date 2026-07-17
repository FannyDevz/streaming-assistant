// Leaderboard publik: polling endpoint /public/leaderboard tiap beberapa detik.
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  if (params.has("overlay")) document.body.classList.add("overlay");
  const LIMIT = Math.min(Math.max(1, Number(params.get("limit")) || 20), 100);
  const REFRESH_MS = 5000;

  const listEl = document.getElementById("list");
  const subtitleEl = document.getElementById("subtitle");
  const emptyEl = document.getElementById("empty");

  const medal = (rank) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank);
  const cleanName = (s) => "@" + String(s || "").replace(/^@+/, "");
  let levels = [];
  function levelFor(points) {
    if (!levels.length) return null;
    const sorted = [...levels].sort((a, b) => a.min - b.min);
    let cur = sorted[0];
    for (const l of sorted) if (points >= l.min) cur = l;
    return cur;
  }

  function render(data) {
    const entries = data.entries || [];
    subtitleEl.textContent = data.title
      ? `${data.monitoring ? "🔴 LIVE" : "⏸ terakhir"} · ${data.title} · ${data.total} penonton`
      : "Belum ada live yang dipantau";

    if (Array.isArray(data.levels)) levels = data.levels;
    emptyEl.hidden = entries.length > 0;
    listEl.replaceChildren();

    for (const v of entries) {
      const li = document.createElement("li");
      li.className = "item" + (v.rank <= 3 ? ` top${v.rank}` : "");

      const rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = medal(v.rank);

      const name = document.createElement("div");
      name.className = "name";
      const lv = levelFor(v.points);
      if (lv) {
        const b = document.createElement("span");
        b.textContent = lv.name;
        b.style.cssText = `display:inline-block;font-size:12px;font-weight:900;padding:1px 7px;margin-right:7px;border:2px solid #000;background:${lv.color};color:#000;`;
        name.appendChild(b);
      }
      name.appendChild(document.createTextNode(cleanName(v.name)));

      const pts = document.createElement("div");
      pts.className = "pts";
      pts.textContent = `${v.points} 🪙`;

      li.append(rank, name, pts);
      listEl.appendChild(li);
    }
  }

  async function tick() {
    try {
      const res = await fetch(`/public/leaderboard?limit=${LIMIT}`, { cache: "no-store" });
      if (res.ok) render(await res.json());
    } catch {
      /* jaringan bermasalah — coba lagi tick berikutnya */
    }
  }

  tick();
  setInterval(tick, REFRESH_MS);
})();
