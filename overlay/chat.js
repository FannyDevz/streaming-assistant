// Overlay live chat: sambung WebSocket sebagai "chat", tampilkan pesan masuk
// sebagai bubble neobrutalism. Otomatis buang pesan lama.
(() => {
  "use strict";

  const chatEl = document.getElementById("chat");
  const connEl = document.getElementById("conn");
  const MAX = 14; // jumlah bubble maksimal di layar

  const cleanName = (s) => String(s || "").replace(/^@+/, "");

  function setConn(state) {
    connEl.dataset.state = state;
    connEl.textContent =
      state === "open" ? "tersambung" : state === "closed" ? "terputus" : "menyambung…";
  }

  function addMessage(m) {
    const el = document.createElement("div");
    el.className = "msg";

    // badge role
    let badge = "";
    if (m.isOwner) badge = '<span class="badge owner">host</span>';
    else if (m.isModerator) badge = '<span class="badge mod">mod</span>';
    else if (m.isMember) badge = '<span class="badge member">member</span>';

    // badge level
    let lvl = "";
    if (m.level && m.level.name) {
      lvl = `<span class="badge lvl"></span>`;
    }

    const whoClass = m.isOwner ? "who owner" : m.isModerator ? "who mod" : "who";

    el.innerHTML =
      lvl +
      badge +
      `<span class="${whoClass}"></span>` +
      `<span class="text"></span>`;
    if (m.level && m.level.name) {
      const lb = el.querySelector(".lvl");
      lb.textContent = m.level.name;
      lb.style.background = m.level.color || "#ffde00";
      lb.style.color = "#000";
    }
    el.querySelector(".who").textContent = "@" + cleanName(m.name);
    el.querySelector(".text").textContent = m.text || "";

    chatEl.appendChild(el);

    // buang yang paling lama bila kebanyakan
    while (chatEl.children.length > MAX) {
      const old = chatEl.firstElementChild;
      if (!old) break;
      old.classList.add("leaving");
      const node = old;
      setTimeout(() => node.remove(), 300);
      // longgarkan batas sementara animasi keluar berjalan
      if (chatEl.children.length > MAX + 3) node.remove();
      break;
    }
  }

  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws?role=chat`);
    ws.onopen = () => setConn("open");
    ws.onclose = () => {
      setConn("closed");
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
      if (msg.type === "chat") addMessage(msg.data);
    };
  }

  connect();
})();
