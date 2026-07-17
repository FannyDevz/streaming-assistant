// Overlay OBS: sambung WebSocket sebagai "overlay", tampilkan alert satu per satu,
// mainkan suara + TTS, lalu kirim ack "alert:shown" supaya server kirim berikutnya.
(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const card = document.getElementById("card");
  const mediaEl = document.getElementById("media");
  const imageEl = document.getElementById("image");
  const nameEl = document.getElementById("name");
  const messageEl = document.getElementById("message");
  const videoBox = document.getElementById("video");
  const gifBox = document.getElementById("gif");
  const gifImg = document.getElementById("gifImg");
  const connEl = document.getElementById("conn");
  const sfxEl = document.getElementById("sfx");
  const sfxImg = document.getElementById("sfxImg");

  const EXIT_MS = 550; // selaras dgn durasi transisi keluar di CSS
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cleanName = (s) => String(s || "").replace(/^@+/, "");

  let ws = null;
  let busy = false;
  const localQueue = [];

  // Untuk interupsi alert yang sedang tampil (tombol Skip/Hide dari dashboard).
  let skipResolver = null;
  function waitOrSkip(promise) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        skipResolver = null;
        resolve();
      };
      skipResolver = fin;
      Promise.resolve(promise).then(fin, fin);
    });
  }
  const seen = new Set(); // dedupe id (mis. saat reconnect kirim ulang)

  // ---- WebSocket ----
  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws?role=overlay`);

    ws.onopen = () => {
      setConn("open");
      send({ type: "ready" });
      unlockAudio();
    };
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
      if (msg.type === "alert") enqueue(msg.data);
      else if (msg.type === "skip" && skipResolver) skipResolver();
      else if (msg.type === "sound" && msg.data && msg.data.url) {
        unlockAudio();
        let audio = null;
        try {
          audio = new Audio(msg.data.url);
          audio.volume = 1;
          activeAudios.push(audio);
          const drop = () => {
            const i = activeAudios.indexOf(audio);
            if (i >= 0) activeAudios.splice(i, 1);
          };
          audio.addEventListener("ended", drop, { once: true });
          audio.addEventListener("error", drop, { once: true });
          audio.play().catch(() => {});
        } catch {
          /* abaikan */
        }
        if (msg.data.imageUrl) showSfx(msg.data.imageUrl, audio);
      } else if (msg.type === "soundStop") {
        stopAllSounds();
      }
    };
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function setConn(state) {
    connEl.dataset.state = state;
    connEl.textContent =
      state === "open" ? "tersambung" : state === "closed" ? "terputus" : "menyambung…";
  }

  // ---- GIF/gambar soundboard ----
  const activeAudios = [];
  function stopAllSounds() {
    for (const a of activeAudios.splice(0)) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* abaikan */
      }
    }
    hideSfx();
  }
  let sfxTimer = null;
  function hideSfx() {
    if (sfxTimer) {
      clearTimeout(sfxTimer);
      sfxTimer = null;
    }
    sfxEl.classList.remove("show");
    setTimeout(() => {
      if (!sfxEl.classList.contains("show")) sfxEl.hidden = true;
    }, 350);
  }
  function showSfx(url, audio) {
    // cache-buster supaya GIF animasi selalu mulai dari awal tiap ditekan
    sfxImg.src = url + (url.includes("?") ? "&" : "?") + "t=" + performance.now().toFixed(0);
    sfxEl.hidden = false;
    void sfxEl.offsetWidth; // reflow untuk transisi masuk
    sfxEl.classList.add("show");
    if (sfxTimer) clearTimeout(sfxTimer);
    // sembunyikan saat audio selesai (min 2,5s, maks 12s)
    const MIN = 2500,
      MAX = 12000;
    const start = performance.now();
    const finish = () => {
      const left = Math.max(0, MIN - (performance.now() - start));
      sfxTimer = setTimeout(hideSfx, left);
    };
    if (audio) {
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
    }
    // fallback: pasti hilang setelah MAX
    setTimeout(() => {
      if (sfxEl.classList.contains("show")) hideSfx();
    }, MAX);
  }

  // ---- Antrian lokal ----
  function enqueue(alert) {
    if (!alert || seen.has(alert.id)) return;
    seen.add(alert.id);
    localQueue.push(alert);
    processQueue();
  }

  async function processQueue() {
    if (busy) return;
    const alert = localQueue.shift();
    if (!alert) return;
    busy = true;
    try {
      await showAlert(alert);
    } catch (err) {
      console.error("gagal menampilkan alert", err);
    }
    send({ type: "alert:shown", data: { id: alert.id } });
    seen.delete(alert.id);
    busy = false;
    processQueue();
  }

  // ---- Tampilkan satu alert ----
  async function showAlert(alert) {
    const t = alert.template || {};
    const anim = ["slide", "pop", "fade"].includes(t.animation) ? t.animation : "slide";
    const duration = Number(t.durationMs) || 6000;
    const hasVideo = !!t.youtubeId;

    // posisi
    stage.className = "stage pos-" + (["top", "center", "bottom"].includes(t.position) ? t.position : "top");

    // warna
    card.style.setProperty("--bg", t.bgColor || "#ffde00");
    card.style.setProperty("--fg", t.textColor || "#000000");

    // Gambar = thumbnail kecil di samping teks (disembunyikan kalau ada video).
    if (t.imageUrl && !hasVideo) {
      imageEl.src = t.imageUrl;
      mediaEl.hidden = false;
    } else {
      mediaEl.hidden = true;
    }

    // GIF = media BESAR di bawah teks, posisi seperti video (field terpisah dari gambar).
    const hasGif = !!(t.gifUrl && !hasVideo);
    if (hasGif) {
      gifImg.src = t.gifUrl;
      gifBox.hidden = false;
    } else {
      gifBox.hidden = true;
    }

    // teks
    nameEl.textContent = "@" + cleanName(alert.name);
    messageEl.textContent = alert.message || "";

    // siapkan keadaan tersembunyi lalu animasikan masuk
    card.className =
      `card anim-${anim} hidden-${anim}` + (hasVideo ? " has-video" : "") + (hasGif ? " has-gif" : "");
    card.hidden = false;
    void card.offsetWidth; // paksa reflow supaya transisi jalan
    card.classList.add("show");

    if (hasVideo) {
      // Alert video YouTube: putar video sampai selesai (bisa di-skip).
      videoBox.hidden = false;
      await waitOrSkip(playYouTube(t.youtubeId, Number(t.youtubeStart) || 0, duration).catch(() => {}));
    } else {
      // Alert biasa: SUARA dulu, TTS menyusul setelah suara selesai.
      playSound(t.soundUrl).then(() => {
        if (t.ttsEnabled) speak(`${cleanName(alert.name)} bilang, ${alert.message}`);
      });
      await waitOrSkip(sleep(duration));
    }

    card.classList.remove("show");
    try {
      speechSynthesis.cancel(); // stop TTS kalau di-skip di tengah
    } catch {
      /* abaikan */
    }
    await sleep(EXIT_MS);
    card.hidden = true;
    videoBox.hidden = true;
    gifBox.hidden = true;
    stopYouTube();
  }

  // ---- YouTube IFrame API ----
  let ytApiPromise = null;
  let ytPlayer = null;

  function loadYTApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
    return ytApiPromise;
  }

  function stopYouTube() {
    if (ytPlayer) {
      try {
        ytPlayer.destroy();
      } catch {
        /* abaikan */
      }
      ytPlayer = null;
    }
    videoBox.innerHTML = '<div id="yt"></div>';
  }

  async function playYouTube(videoId, start, cap) {
    await loadYTApi();
    stopYouTube();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      // Tutup saat video selesai ATAU durasi template tercapai (mana duluan).
      setTimeout(finish, Math.max(cap || 6000, 3000));

      ytPlayer = new window.YT.Player("yt", {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: start || 0,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo(); // coba dengan suara (jalan di OBS)
            } catch {
              /* abaikan */
            }
            // Fallback: kalau browser memblokir autoplay-bersuara, mute lalu putar
            // supaya video tetap jalan (autoplay muted selalu diizinkan).
            setTimeout(() => {
              try {
                if (e.target.getPlayerState && e.target.getPlayerState() !== 1) {
                  e.target.mute();
                  e.target.playVideo();
                }
              } catch {
                /* abaikan */
              }
            }, 1200);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) finish();
          },
          onError: () => finish(),
        },
      });
      // Simpan referensi supaya klik pertama bisa membuka suara (lihat handler klik).
      window.__saYtPlayer = ytPlayer;
    });
  }

  // ---- Audio ----
  let audioCtx = null;
  function ensureCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function chime(ctx) {
    const now = ctx.currentTime;
    // "ding-dong" dua nada, cukup keras & jelas
    [
      [784, 0],
      [1175, 0.13],
    ].forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.32);
    });
  }
  function beep() {
    try {
      const ctx = ensureCtx();
      if (ctx.state === "suspended") ctx.resume().then(() => chime(ctx)).catch(() => {});
      else chime(ctx);
    } catch {
      /* abaikan */
    }
  }

  /** Putar suara alert; resolve saat suara selesai (biar TTS bisa menyusul). */
  function playSound(url) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      setTimeout(finish, 15000); // guard supaya TTS tak menggantung
      if (url) {
        const audio = new Audio(url);
        audio.volume = 1;
        audio.onended = finish;
        audio.onerror = () => {
          beep();
          setTimeout(finish, 500);
        };
        audio.play().catch(() => {
          beep(); // browser blokir? fallback beep
          setTimeout(finish, 500);
        });
      } else {
        beep();
        setTimeout(finish, 500); // durasi chime ~0.45 dtk
      }
    });
  }

  // Coba buka audio sedini mungkin (berhasil di OBS; di browser nunggu klik).
  function unlockAudio() {
    try {
      const ctx = ensureCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch {
      /* abaikan */
    }
  }

  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "id-ID";
      const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("id"));
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    } catch {
      /* abaikan */
    }
  }

  // Browser biasa: buka kunci audio setelah interaksi (OBS autoplay tetap jalan).
  window.addEventListener("click", () => {
    unlockAudio();
    try {
      const p = window.__saYtPlayer;
      if (p && p.unMute) {
        p.unMute();
        if (p.setVolume) p.setVolume(100);
        p.playVideo();
      }
    } catch {
      /* abaikan */
    }
  });

  connect();
})();
