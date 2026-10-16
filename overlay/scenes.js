// Logika bersama untuk scene overlay. Membaca konfigurasi dari <body data-*> dan
// bisa di-override lewat query string, jadi satu file HTML bisa dipakai fleksibel:
//   ?title=...    ganti judul
//   ?sub=...      ganti subjudul
//   ?handle=@nama tampilkan handle di bar bawah
//   ?until=19:30  hitung mundur ke jam tsb (kalau sudah lewat → besok)
//   ?mins=10      hitung mundur 10 menit (tahan reload OBS via sessionStorage)
//   ?clock=off    sembunyikan jam
(() => {
  "use strict";

  const body = document.body;
  const params = new URLSearchParams(location.search);
  const pick = (q, d) => (params.get(q) != null ? params.get(q) : d);

  const $ = (sel) => document.querySelector(sel);
  const setText = (sel, val) => {
    const el = $(sel);
    if (el && val != null) el.textContent = val;
  };

  setText(".title", pick("title", body.dataset.title || "STREAM"));
  setText(".subtitle", pick("sub", body.dataset.subtitle || ""));
  setText(".emoji", body.dataset.emoji || "✨");
  setText(".badge .badge-text", body.dataset.badge || "");

  // Handle sosial (opsional).
  const handle = pick("handle", body.dataset.handle || "");
  const handleChip = $(".chip.handle");
  if (handleChip) {
    if (handle) handleChip.textContent = handle;
    else handleChip.hidden = true;
  }

  // Jam berjalan.
  const clockChip = $(".chip.clock");
  const showClock = pick("clock", "on") !== "off";
  if (clockChip) {
    if (!showClock) {
      clockChip.hidden = true;
    } else {
      const tickClock = () => {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        clockChip.textContent = `🕒 ${hh}:${mm}`;
      };
      tickClock();
      setInterval(tickClock, 15000);
    }
  }

  // Hitung mundur (opsional). Absolut (until) lebih tahan reload; mins disimpan
  // di sessionStorage supaya reload scene di OBS tidak mereset hitungannya.
  const cd = $(".countdown");
  if (cd) {
    let target = null;
    const until = params.get("until");
    const mins = params.get("mins");
    if (until && /^\d{1,2}:\d{2}$/.test(until)) {
      const [h, m] = until.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); // sudah lewat → besok
      target = d.getTime();
    } else if (mins && Number(mins) > 0) {
      const key = "sa_scene_cd_" + body.dataset.scene + "_" + mins;
      const saved = Number(sessionStorage.getItem(key));
      if (saved && saved > Date.now()) {
        target = saved;
      } else {
        target = Date.now() + Number(mins) * 60000;
        try {
          sessionStorage.setItem(key, String(target));
        } catch {
          /* mode privat → abaikan */
        }
      }
    }

    if (target) {
      cd.classList.add("on");
      const timeEl = cd.querySelector(".cd-time");
      const doneText = body.dataset.cdDone || "🚀 MULAI!";
      const render = () => {
        const left = Math.max(0, target - Date.now());
        if (left <= 0) {
          timeEl.textContent = doneText;
          clearInterval(timer);
          return;
        }
        const totalSec = Math.round(left / 1000);
        const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        timeEl.textContent = `${m}:${s}`;
      };
      render();
      const timer = setInterval(render, 250);
    }
  }
})();
