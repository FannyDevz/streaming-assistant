// Overlay leaderboard: ambil data awal dari /public/leaderboard, lalu update
// LIVE lewat WebSocket (event "points"). Kompak, untuk OBS Browser Source.
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const LIMIT = Math.min(Math.max(1, Number(params.get("limit")) || 5), 20);
  const POS = ["top-right", "top-left", "bottom-right", "bottom-left"].includes(
    params.get("pos") || "",
  )
    ? params.get("pos")
    : "top-right";

  const boardEl = document.getElementById("board");
  const listEl = document.getElementById("list");
  const connEl = document.getElementById("conn");
  const titleEl = boardEl.querySelector(".title");

  boardEl.className = `board board-${POS}`;
  if (params.get("title")) titleEl.textContent = params.get("title");

  const medal = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r);
  const cleanName = (s) => "@" + String(s || "").replace(/^@+/, "");

  /** Map authorChannelId -> { name, points } */
  const board = new Map();
  /** Map authorChannelId -> { el, points } untuk diff render */
  const nodes = new Map();
  let levels = [];
  function levelFor(points) {
    if (!levels.length) return null;
    const sorted = [...levels].sort((a, b) => a.min - b.min);
    let cur = sorted[0];
    for (const l of sorted) if (points >= l.min) cur = l;
    return cur;
  }

  function upsert(authorChannelId, name, points) {
    board.set(authorChannelId, { name, points });
    render();
  }

  function topN() {
    return [...board.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.points - a.points)
      .slice(0, LIMIT);
  }

  function render() {
    const rows = topN();
    const keep = new Set();

    rows.forEach((row, i) => {
      const rank = i + 1;
      keep.add(row.id);
      let node = nodes.get(row.id);

      if (!node) {
        const el = document.createElement("li");
        el.className = "item";
        el.innerHTML = '<span class="rank"></span><span class="name"></span><span class="pts"></span>';
        node = { el, points: -1 };
        nodes.set(row.id, node);
      }

      const { el } = node;
      el.querySelector(".rank").textContent = medal(rank);
      const nameEl = el.querySelector(".name");
      nameEl.textContent = "";
      const lv = levelFor(row.points);
      if (lv) {
        const b = document.createElement("span");
        b.textContent = lv.name;
        b.style.cssText = `display:inline-block;font-size:10px;font-weight:900;padding:1px 5px;margin-right:5px;border:2px solid #000;background:${lv.color};color:#000;`;
        nameEl.appendChild(b);
      }
      nameEl.appendChild(document.createTextNode(cleanName(row.name)));
      el.querySelector(".pts").textContent = `${row.points} 🪙`;
      el.className = "item" + (rank <= 3 ? ` top${rank}` : "");

      // efek "bump" kalau point bertambah
      if (node.points >= 0 && row.points > node.points) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }
      node.points = row.points;

      listEl.appendChild(el); // pindah ke urutan yang benar
    });

    // buang node yang keluar dari top-N
    for (const [id, node] of nodes) {
      if (!keep.has(id)) {
        node.el.remove();
        nodes.delete(id);
      }
    }
  }

  async function loadInitial() {
    try {
      const res = await fetch(`/public/leaderboard?limit=${LIMIT}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.levels)) levels = data.levels;
      for (const e of data.entries || []) board.set(e.authorChannelId, { name: e.name, points: e.points });
      render();
    } catch {
      /* diam, WS akan mengisi */
    }
  }

  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws?role=chat`);
    ws.onopen = () => (connEl.dataset.state = "open");
    ws.onclose = () => {
      connEl.dataset.state = "closed";
      setTimeout(connect, 1500);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "points") upsert(msg.data.authorChannelId, msg.data.name, msg.data.points);
      else if (msg.type === "reset") {
        board.clear();
        render();
      }
    };
  }

  loadInitial();
  connect();
})();
