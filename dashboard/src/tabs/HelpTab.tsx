import type { ReactNode } from "react";
import { Card, Tag } from "../components/ui";
import { useLang, registerDict } from "../i18n";

// Terjemahan: satu kalimat utuh per key (dengan penanda **tebal** dan `kode`),
// jadi mudah dibaca & dirawat — tak lagi terpecah jadi t(".")/t(" & ").
registerDict({
  // Judul kartu
  "🚀 Mulai Cepat": "🚀 Quick Start",
  "📺 Pasang Overlay di OBS": "📺 Install Overlays in OBS",
  "🪙 Point, Command & Profil": "🪙 Points, Commands & Profiles",
  "🎁 Reward, Mini-Game, Giveaway & Kuis": "🎁 Rewards, Mini-Games, Giveaway & Quiz",
  "🔊 Soundboard & 📊 Statistik": "🔊 Soundboard & 📊 Statistics",
  "🔔 Discord & 🎬 OBS WebSocket": "🔔 Discord & 🎬 OBS WebSocket",
  "🎨 Alert, Video, GIF & Riwayat": "🎨 Alerts, Video, GIF & History",
  "🤖 Setup Nightbot (!point & !rank)": "🤖 Nightbot Setup (!point & !rank)",

  // Tag overlay
  Alert: "Alert",
  "Live Chat": "Live Chat",
  Leaderboard: "Leaderboard",
  Ticker: "Ticker",
  "Antrian Request": "Request Queue",
  "Request (ticker)": "Request (ticker)",
  "Goal Bar": "Goal Bar",
  "Running Text": "Running Text",

  // Mulai Cepat
  "Buka tab **📡 Monitor** → tempel URL/ID video live YouTube → klik **Mulai**.":
    "Open the **📡 Monitor** tab → paste the YouTube live URL/ID → click **Start**.",
  "Point terkumpul tiap penonton komentar. Lihat di tab **🏆 Leaderboard**.":
    "Points accumulate whenever a viewer comments. See them in **🏆 Leaderboard**.",
  "Tab **📺 Overlay** → salin URL, pasang di OBS sebagai **Browser Source**.":
    "**📺 Overlay** tab → copy a URL, add it in OBS as a **Browser Source**.",
  "Penonton ketik `!alert pesan` → point terpotong → alert muncul di layar.":
    "A viewer types `!alert message` → points are deducted → the alert appears on screen.",
  "Atur biaya, cooldown, template, dll di tab **⚙️ Aturan** & **🎨 Alert**.":
    "Set the cost, cooldown, templates, and more in **⚙️ Settings** & **🎨 Alert**.",

  // Overlay OBS
  "Di OBS: **Sources → + → Browser**, lalu tempel salah satu URL berikut:":
    "In OBS: **Sources → + → Browser**, then paste one of these URLs:",
  "Ukuran source = ukuran canvas (mis. 1920×1080). Latar overlay transparan.":
    "Source size = canvas size (e.g. 1920×1080). The overlay background is transparent.",
  "Matikan **Shutdown source when not visible** agar WebSocket tetap tersambung.":
    "Turn off **Shutdown source when not visible** so the WebSocket stays connected.",
  "Di OBS, suara & autoplay video/TTS jalan otomatis.":
    "In OBS, sound & video/TTS autoplay run automatically.",

  // Point, Command & Profil
  "Tiap komentar memberi **point** (dengan cooldown anti-spam) — atur di **⚙️ Aturan → Point**.":
    "Each comment gives **points** (with an anti-spam cooldown) — set it in **⚙️ Settings → Points**.",
  "Tiap **template** punya **command** & **biaya** sendiri (tab **🎨 Alert**), jadi alert teks & video bisa **beda harga**. Contoh:":
    "Each **template** has its own **command** & **cost** (**🎨 Alert** tab), so text and video alerts can have **different prices**. Example:",
  "**Penyimpanan point** (Aturan → Point): **Selamanya** atau **Per streaming**. Reset manual di **🏆 Leaderboard**.":
    "**Point storage** (Settings → Points): **Forever** or **Per stream**. Manual reset in **🏆 Leaderboard**.",
  "Klik nama penonton di **🏆 Leaderboard** untuk buka **profil**: point, level, rank, & riwayat alert.":
    "Click a viewer's name in **🏆 Leaderboard** to open their **profile**: points, level, rank & alert history.",
  " → 50 point (teks)": " → 50 points (text)",
  " → 200 point (video YouTube)": " → 200 points (YouTube video)",

  // Reward, Game, Giveaway, Kuis
  "**🎁 Reward store** — buat reward di tab **🎁 Reward** (nama, command, biaya). Penonton ketik command + teks → point terpotong → masuk **Antrian Request**. Klik **Selesai** saat sudah dikerjakan, atau **Batal** untuk refund.":
    "**🎁 Reward store** — create rewards in the **🎁 Reward** tab (name, command, cost). A viewer types the command + text → points deducted → it enters the **Request Queue**. Click **Done** when finished, or **Cancel** to refund.",
  "**🎡 Giveaway** — di tab **🎡 Giveaway & Kuis** isi **kata syarat** (mis. `!ikut`) → Mulai. Penonton yang mengetik kata itu jadi peserta → **Tarik Pemenang** (tampil di overlay alert).":
    "**🎡 Giveaway** — in the **🎡 Giveaway & Quiz** tab enter a **keyword** (e.g. `!ikut`) → Start. Viewers who type it become entrants → **Draw Winner** (shown in the alert overlay).",
  "**🎯 Kuis (Trivia)** — mulai soal → penonton jawab di chat → yang **benar pertama** otomatis dapat point + alert muncul di overlay.":
    "**🎯 Quiz (Trivia)** — start a question → viewers answer in chat → whoever is **correct first** automatically gets points + an alert on the overlay.",
  "**🎲 Mini-game** (via Nightbot) — bisa menambah & mengurangi point. Buat command di Nightbot:":
    "**🎲 Mini-game** (via Nightbot) — can add & subtract points. Create commands in Nightbot:",
  "Penonton ketik `!coinflip 50` (taruhan 50). Atur peluang & batas di **⚙️ Aturan → Mini-Game**.":
    "A viewer types `!coinflip 50` (a bet of 50). Set the odds & limits in **⚙️ Settings → Mini-Game**.",
  "**🏅 Level/Badge** — tier otomatis dari total point (Bronze→Diamond), tampil di chat & leaderboard. Atur di **⚙️ Aturan → Level**.":
    "**🏅 Level/Badge** — tiers are automatic from total points (Bronze→Diamond), shown in chat & the leaderboard. Set them in **⚙️ Settings → Level**.",

  // Soundboard & Statistik
  "**🔊 Soundboard** — upload suara (+ GIF opsional), tekan tombol untuk memainkannya di overlay Alert (OBS). Tombol **Stop** menghentikan semua suara + menutup GIF.":
    "**🔊 Soundboard** — upload sounds (+ optional GIF), press a button to play it on the Alert overlay (OBS). The **Stop** button halts all sounds + hides the GIF.",
  "Centang **Dengar di sini** untuk memutar juga di dashboard (berguna saat overlay belum dibuka di OBS).":
    "Tick **Listen here** to also play it in the dashboard (handy when the overlay isn't open in OBS yet).",
  "**📊 Statistik** — rekap tiap sesi live: jumlah chat, alert, reward, point dibagi/dipakai, penonton baru, top spender, & durasi.":
    "**📊 Statistics** — a recap of each live session: chats, alerts, rewards, points awarded/spent, new viewers, top spenders & duration.",

  // Discord & OBS
  "**🔔 Discord** — kirim notifikasi ke server Discord saat live mulai, SuperChat masuk, atau ada pemenang giveaway.":
    "**🔔 Discord** — send notifications to a Discord server when the stream starts, a SuperChat arrives, or a giveaway winner is drawn.",
  "Buat webhook: **Server Settings → Integrations → Webhooks → New Webhook**, salin URL-nya ke **⚙️ Aturan → Discord**, lalu klik **Kirim Test**.":
    "Create a webhook: **Server Settings → Integrations → Webhooks → New Webhook**, copy its URL into **⚙️ Settings → Discord**, then click **Send Test**.",
  "**🎬 OBS WebSocket** — ganti scene otomatis selama alert tampil, lalu kembali. Aktifkan **Tools → WebSocket Server Settings** di OBS, samakan port & password di **⚙️ Aturan → OBS**.":
    "**🎬 OBS WebSocket** — switch scene automatically while an alert is showing, then switch back. Enable **Tools → WebSocket Server Settings** in OBS, and match the port & password in **⚙️ Settings → OBS**.",

  // Alert, Video, GIF & Riwayat
  "Buat template di **🎨 Alert**: warna, animasi, posisi, durasi, TTS.":
    "Create templates in **🎨 Alert**: color, animation, position, duration, TTS.",
  "Media terpisah: **Gambar** (ikon kecil di samping teks), **GIF** (tampil besar seperti video), **Suara**, atau **URL YouTube** untuk alert video.":
    "Separate media: **Image** (small icon beside the text), **GIF** (shows large like a video), **Sound**, or a **YouTube URL** for a video alert.",
  "Untuk video/GIF: **Durasi** = berapa lama diputar (alert menutup saat selesai/durasi tercapai).":
    "For video/GIF: **Duration** = how long it plays (the alert closes when it ends / the duration is reached).",
  "Tombol **Kirim Test** untuk mencoba tanpa menunggu penonton.":
    "The **Send Test** button lets you try it without waiting for viewers.",
  "Tab **📜 Riwayat**: semua alert tersimpan; **Tampilkan lagi** untuk memutar ulang. Bisa **Export**, **Import**, & **Kosongkan**.":
    "**📜 History** tab: all alerts are saved; **Show again** replays them. You can **Export**, **Import**, & **Clear**.",
  "**Suara tidak keluar?** Browser memblokir autoplay audio sampai ada interaksi — di halaman overlay **klik sekali** dulu. Di **OBS suara otomatis jalan**. Paling pasti: **upload file suara** di template (TTS bisa saja tak tersedia di OBS).":
    "**No sound?** The browser blocks audio autoplay until there's interaction — on the overlay page **click once** first. In **OBS sound runs automatically**. Most reliable: **upload a sound file** in the template (TTS may be unavailable in OBS).",

  // Nightbot
  "Bot ini **tidak posting ke chat**. Command yang butuh balasan (cek point/rank) dijalankan lewat **Nightbot** yang memanggil endpoint kita.":
    "This bot **does not post to chat**. Commands that need a reply (checking points/rank) run through **Nightbot**, which calls our endpoint.",
  Langkah: "Steps",
  "Command Nightbot": "Nightbot Commands",
  "Server harus bisa diakses dari internet. Jika jalan di komputer sendiri, buka **tunnel**:":
    "The server must be reachable from the internet. If it runs on your own computer, open a **tunnel**:",
  "Catat URL publiknya, mis. `https://xxxx.trycloudflare.com`.":
    "Note the public URL, e.g. `https://xxxx.trycloudflare.com`.",
  "Buka **dashboard Nightbot → Custom Commands** (atau ketik di chat `!commands add …`).":
    "Open **Nightbot dashboard → Custom Commands** (or type `!commands add …` in chat).",
  "Tambahkan 2 command berikut (ganti URL dengan URL publikmu).":
    "Add the following 2 commands (replace the URL with your public URL).",
  "Contoh lokal (butuh tunnel agar Nightbot bisa akses):":
    "Local example (needs a tunnel so Nightbot can reach it):",
  "💡 Penonton ketik `!point` → Nightbot balas mis. **@budi point kamu: 120 🪙**. Teks balasan bisa diubah di **⚙️ Aturan → Nightbot** (placeholder `{name} {points} {rank} {total}`).":
    "💡 A viewer types `!point` → Nightbot replies e.g. **@budi your points: 120 🪙**. The reply text can be changed in **⚙️ Settings → Nightbot** (placeholder `{name} {points} {rank} {total}`).",
});

const SERVER_BASE =
  location.port === "4301"
    ? `${location.protocol}//${location.hostname}:4300`
    : location.origin;

/** Render string terjemahan dengan penanda **tebal** dan `kode` inline. */
function Rich({ children }: { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="px-1" style={{ background: "#eee", border: "1px solid #ccc" }}>
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre
      className="text-xs overflow-x-auto p-2 my-1"
      style={{ border: "2px solid #000", background: "#f5f5f0" }}
    >
      <code>{children}</code>
    </pre>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3 mb-2">
      <span
        className="shrink-0 w-6 h-6 grid place-items-center font-black text-sm"
        style={{ background: "var(--yellow)", border: "2px solid #000" }}
      >
        {n}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

const OVERLAYS: { tag: string; path: string }[] = [
  { tag: "Alert", path: "/overlay/" },
  { tag: "Live Chat", path: "/overlay/chat.html" },
  { tag: "Leaderboard", path: "/overlay/leaderboard.html" },
  { tag: "Ticker", path: "/overlay/ticker.html" },
  { tag: "Antrian Request", path: "/overlay/requests.html" },
  { tag: "Request (ticker)", path: "/overlay/requests-ticker.html" },
  { tag: "Goal Bar", path: "/overlay/goal.html" },
  { tag: "Running Text", path: "/overlay/runtext.html" },
];

export function HelpTab() {
  const { t } = useLang();
  const li = (key: string) => (
    <li>
      <Rich>{t(key)}</Rich>
    </li>
  );

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      {/* MULAI CEPAT */}
      <Card title={t("🚀 Mulai Cepat")} accent="var(--cyan)">
        <Step n={1}>
          <Rich>{t("Buka tab **📡 Monitor** → tempel URL/ID video live YouTube → klik **Mulai**.")}</Rich>
        </Step>
        <Step n={2}>
          <Rich>{t("Point terkumpul tiap penonton komentar. Lihat di tab **🏆 Leaderboard**.")}</Rich>
        </Step>
        <Step n={3}>
          <Rich>{t("Tab **📺 Overlay** → salin URL, pasang di OBS sebagai **Browser Source**.")}</Rich>
        </Step>
        <Step n={4}>
          <Rich>{t("Penonton ketik `!alert pesan` → point terpotong → alert muncul di layar.")}</Rich>
        </Step>
        <Step n={5}>
          <Rich>{t("Atur biaya, cooldown, template, dll di tab **⚙️ Aturan** & **🎨 Alert**.")}</Rich>
        </Step>
      </Card>

      {/* OVERLAY OBS */}
      <Card title={t("📺 Pasang Overlay di OBS")} accent="var(--pink)">
        <p className="text-sm mb-2">
          <Rich>{t("Di OBS: **Sources → + → Browser**, lalu tempel salah satu URL berikut:")}</Rich>
        </p>
        <div className="text-sm flex flex-col gap-1">
          {OVERLAYS.map((o) => (
            <div key={o.path}>
              <Tag>{t(o.tag)}</Tag>{" "}
              <code className="ml-1 select-all">{SERVER_BASE}{o.path}</code>
            </div>
          ))}
        </div>
        <ul className="text-sm mt-3 list-disc pl-5 space-y-1">
          {li("Ukuran source = ukuran canvas (mis. 1920×1080). Latar overlay transparan.")}
          {li("Matikan **Shutdown source when not visible** agar WebSocket tetap tersambung.")}
          {li("Di OBS, suara & autoplay video/TTS jalan otomatis.")}
        </ul>
      </Card>

      {/* POINT, COMMAND & PROFIL */}
      <Card title={t("🪙 Point, Command & Profil")} accent="var(--green)">
        <ul className="text-sm list-disc pl-5 space-y-1">
          {li("Tiap komentar memberi **point** (dengan cooldown anti-spam) — atur di **⚙️ Aturan → Point**.")}
          {li(
            "Tiap **template** punya **command** & **biaya** sendiri (tab **🎨 Alert**), jadi alert teks & video bisa **beda harga**. Contoh:",
          )}
        </ul>
        <div className="text-sm mt-2 flex flex-col gap-1">
          <div>
            <code>!alert pesan</code>
            <Rich>{t(" → 50 point (teks)")}</Rich>
          </div>
          <div>
            <code>!clip pesan</code>
            <Rich>{t(" → 200 point (video YouTube)")}</Rich>
          </div>
        </div>
        <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
          {li("**Penyimpanan point** (Aturan → Point): **Selamanya** atau **Per streaming**. Reset manual di **🏆 Leaderboard**.")}
          {li("Klik nama penonton di **🏆 Leaderboard** untuk buka **profil**: point, level, rank, & riwayat alert.")}
        </ul>
      </Card>

      {/* REWARD, GAME, GIVEAWAY, KUIS */}
      <Card title={t("🎁 Reward, Mini-Game, Giveaway & Kuis")} accent="var(--yellow)" className="md:col-span-2">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <ul className="text-sm list-disc pl-5 space-y-2">
              {li(
                "**🎁 Reward store** — buat reward di tab **🎁 Reward** (nama, command, biaya). Penonton ketik command + teks → point terpotong → masuk **Antrian Request**. Klik **Selesai** saat sudah dikerjakan, atau **Batal** untuk refund.",
              )}
              <li>
                <div className="text-xs mt-1">
                  <code>!reqlagu Judul Lagu</code> · <code>!hero Miya</code>
                </div>
              </li>
              {li(
                "**🎡 Giveaway** — di tab **🎡 Giveaway & Kuis** isi **kata syarat** (mis. `!ikut`) → Mulai. Penonton yang mengetik kata itu jadi peserta → **Tarik Pemenang** (tampil di overlay alert).",
              )}
              {li(
                "**🎯 Kuis (Trivia)** — mulai soal → penonton jawab di chat → yang **benar pertama** otomatis dapat point + alert muncul di overlay.",
              )}
            </ul>
          </div>
          <div>
            <p className="text-sm mb-1">
              <Rich>{t("**🎲 Mini-game** (via Nightbot) — bisa menambah & mengurangi point. Buat command di Nightbot:")}</Rich>
            </p>
            <div className="text-sm font-bold">!coinflip (50:50)</div>
            <Code>{`$(urlfetch https://URL-PUBLIK/nb/coinflip?u=$(user)&amount=$(1))`}</Code>
            <div className="text-sm font-bold mt-1">!gamble</div>
            <Code>{`$(urlfetch https://URL-PUBLIK/nb/gamble?u=$(user)&amount=$(1))`}</Code>
            <p className="text-xs opacity-70 mt-1">
              <Rich>{t("Penonton ketik `!coinflip 50` (taruhan 50). Atur peluang & batas di **⚙️ Aturan → Mini-Game**.")}</Rich>
            </p>
            <p className="text-sm mt-3">
              <Rich>{t("**🏅 Level/Badge** — tier otomatis dari total point (Bronze→Diamond), tampil di chat & leaderboard. Atur di **⚙️ Aturan → Level**.")}</Rich>
            </p>
          </div>
        </div>
      </Card>

      {/* SOUNDBOARD & STATISTIK */}
      <Card title={t("🔊 Soundboard & 📊 Statistik")} accent="var(--pink)">
        <ul className="text-sm list-disc pl-5 space-y-2">
          {li(
            "**🔊 Soundboard** — upload suara (+ GIF opsional), tekan tombol untuk memainkannya di overlay Alert (OBS). Tombol **Stop** menghentikan semua suara + menutup GIF.",
          )}
          {li("Centang **Dengar di sini** untuk memutar juga di dashboard (berguna saat overlay belum dibuka di OBS).")}
          {li(
            "**📊 Statistik** — rekap tiap sesi live: jumlah chat, alert, reward, point dibagi/dipakai, penonton baru, top spender, & durasi.",
          )}
        </ul>
      </Card>

      {/* DISCORD & OBS */}
      <Card title={t("🔔 Discord & 🎬 OBS WebSocket")} accent="var(--cyan)">
        <ul className="text-sm list-disc pl-5 space-y-2">
          {li("**🔔 Discord** — kirim notifikasi ke server Discord saat live mulai, SuperChat masuk, atau ada pemenang giveaway.")}
          {li(
            "Buat webhook: **Server Settings → Integrations → Webhooks → New Webhook**, salin URL-nya ke **⚙️ Aturan → Discord**, lalu klik **Kirim Test**.",
          )}
          {li(
            "**🎬 OBS WebSocket** — ganti scene otomatis selama alert tampil, lalu kembali. Aktifkan **Tools → WebSocket Server Settings** di OBS, samakan port & password di **⚙️ Aturan → OBS**.",
          )}
        </ul>
      </Card>

      {/* ALERT, VIDEO, GIF & RIWAYAT */}
      <Card title={t("🎨 Alert, Video, GIF & Riwayat")} accent="var(--yellow)" className="md:col-span-2">
        <ul className="text-sm list-disc pl-5 space-y-1">
          {li("Buat template di **🎨 Alert**: warna, animasi, posisi, durasi, TTS.")}
          {li("Media terpisah: **Gambar** (ikon kecil di samping teks), **GIF** (tampil besar seperti video), **Suara**, atau **URL YouTube** untuk alert video.")}
          {li("Untuk video/GIF: **Durasi** = berapa lama diputar (alert menutup saat selesai/durasi tercapai).")}
          {li("Tombol **Kirim Test** untuk mencoba tanpa menunggu penonton.")}
          {li("Tab **📜 Riwayat**: semua alert tersimpan; **Tampilkan lagi** untuk memutar ulang. Bisa **Export**, **Import**, & **Kosongkan**.")}
        </ul>
        <div className="mt-3 p-3 text-sm" style={{ border: "2px dashed #000", background: "#fafaf5" }}>
          🔊{" "}
          <Rich>
            {t(
              "**Suara tidak keluar?** Browser memblokir autoplay audio sampai ada interaksi — di halaman overlay **klik sekali** dulu. Di **OBS suara otomatis jalan**. Paling pasti: **upload file suara** di template (TTS bisa saja tak tersedia di OBS).",
            )}
          </Rich>
        </div>
      </Card>

      {/* NIGHTBOT */}
      <Card title={t("🤖 Setup Nightbot (!point & !rank)")} accent="var(--green)" className="md:col-span-2">
        <p className="text-sm mb-3">
          <Rich>{t("Bot ini **tidak posting ke chat**. Command yang butuh balasan (cek point/rank) dijalankan lewat **Nightbot** yang memanggil endpoint kita.")}</Rich>
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="font-extrabold uppercase text-sm mb-2">{t("Langkah")}</div>
            <Step n={1}>
              <Rich>{t("Server harus bisa diakses dari internet. Jika jalan di komputer sendiri, buka **tunnel**:")}</Rich>
              <Code>cloudflared tunnel --url http://localhost:4300</Code>
              <Code>ngrok http 4300</Code>
              <Rich>{t("Catat URL publiknya, mis. `https://xxxx.trycloudflare.com`.")}</Rich>
            </Step>
            <Step n={2}>
              <a className="underline" href="https://nightbot.tv/commands/custom" target="_blank" rel="noreferrer">
                <Rich>{t("Buka **dashboard Nightbot → Custom Commands** (atau ketik di chat `!commands add …`).")}</Rich>
              </a>
            </Step>
            <Step n={3}>{t("Tambahkan 2 command berikut (ganti URL dengan URL publikmu).")}</Step>
          </div>

          <div>
            <div className="font-extrabold uppercase text-sm mb-2">{t("Command Nightbot")}</div>
            <div className="text-sm font-bold">!point</div>
            <Code>{`$(urlfetch https://URL-PUBLIK/nb/points?u=$(user))`}</Code>
            <div className="text-sm font-bold mt-2">!rank</div>
            <Code>{`$(urlfetch https://URL-PUBLIK/nb/rank?u=$(user))`}</Code>
            <p className="text-xs opacity-70 mt-2">
              <Rich>{t("Contoh lokal (butuh tunnel agar Nightbot bisa akses):")}</Rich>{" "}
              <code className="select-all">{SERVER_BASE}/nb/points?u=budi</code>
            </p>
          </div>
        </div>

        <div className="mt-3 p-3 text-sm" style={{ border: "2px dashed #000", background: "#fafaf5" }}>
          <Rich>
            {t(
              "💡 Penonton ketik `!point` → Nightbot balas mis. **@budi point kamu: 120 🪙**. Teks balasan bisa diubah di **⚙️ Aturan → Nightbot** (placeholder `{name} {points} {rank} {total}`).",
            )}
          </Rich>
        </div>
      </Card>
    </div>
  );
}
