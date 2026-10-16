# Streaming Assistant

Bot untuk **YouTube Live**: baca live chat channel manapun, beri **point** ke tiap
penonton yang komen, dan command **`!alert <pesan>`** menukar point jadi notifikasi
ala Saweria yang tampil di **OBS**. Balasan command umum & moderasi di chat
diserahkan ke **Nightbot**.

> Baca chat **tanpa login/OAuth** (pakai `masterchat`) — cukup URL/ID video live.

## ✨ Fitur

- 📡 **Baca live chat** channel publik manapun (tanpa API key, tanpa kuota).
- 🪙 **Sistem point**: +1 per komentar (cooldown), bonus command, leaderboard.
- 🔔 **`!alert <pesan>`**: potong point → alert muncul di OBS (gambar/suara/TTS custom).
- 🎨 **Overlay OBS** gaya neobrutalism + antrian alert 1-per-1 (anti numpuk).
- 🎛️ **Dashboard**: monitor, leaderboard, atur semua aturan, editor template + Test Alert.
- 🤖 **Nightbot**: command `!point` / `!rank` lewat `$(urlfetch)`.

## 🧩 Arsitektur singkat

```
YouTube live chat ──(masterchat)──▶ Backend Fastify ──WebSocket──▶ Overlay (OBS)
                                        │  SQLite                └▶ Dashboard
                                        └──/nb/*──▶ Nightbot $(urlfetch)
```

Detail teknis lengkap: [`docs/TECHNICAL-PLAN.md`](docs/TECHNICAL-PLAN.md).

## ✅ Prasyarat

- **Node.js 22+** (butuh modul bawaan `node:sqlite`). Diuji di Node 25.
- Port default: backend **4300**, dashboard dev **4301** (ubah lewat `PORT` bila bentrok).

## 🚀 Menjalankan (mode dev)

Dua terminal:

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev            # http://localhost:4300

# Terminal 2 — dashboard
cd dashboard
npm install
npm run dev            # http://localhost:4301
```

Lalu buka **http://localhost:4301** di browser.

## 🌐 Deploy 24/7 (produksi)

Di produksi semua jalan **satu port** (4300): dashboard hasil build disajikan langsung
oleh server di `/`, jadi tak perlu Vite. Data (SQLite + upload) disimpan di folder
`./data` (Docker) atau `server/` (PM2).

### Cara A — Docker (paling simpel)

```bash
# 1) set password admin
echo "ADMIN_PASSWORD=passwordku" > .env

# 2) build & jalankan (auto-restart, data persist di ./data)
docker compose up -d --build

# lihat log / stop
docker compose logs -f
docker compose down
```

Buka **http://SERVER:4300** — dashboard, overlay, dan API semuanya di sini.

### Cara B — PM2 (tanpa Docker)

```bash
npm i -g pm2
cd dashboard && npm ci && npm run build      # build dashboard sekali
cd ../server && npm ci
cp .env.example .env                          # lalu set ADMIN_PASSWORD
cd .. && pm2 start ecosystem.config.cjs
pm2 save && pm2 startup                        # auto-start saat reboot
```

> Butuh **Node 25+** (memakai `node:sqlite` bawaan). URL overlay untuk OBS jadi
> `http://SERVER:4300/overlay/`.

### Akses dari internet (untuk Nightbot / nonton dari luar)

Pakai tunnel supaya server lokal bisa diakses publik:

```bash
cloudflared tunnel --url http://localhost:4300
# atau: ngrok http 4300
```

Pakai URL publik yang muncul untuk endpoint Nightbot (lihat bagian Integrasi Nightbot).

### Alur pemakaian

1. Tab **📡 Monitor** → paste URL/ID video live → **Mulai**.
2. Point mulai terkumpul; cek tab **🏆 Leaderboard**.
3. Tab **🎨 Alert** → atur template, klik **Kirim Test** untuk mencoba.
4. Tab **⚙️ Aturan** → ubah biaya `!alert`, cooldown, kata kasar, dll → **Simpan**.

## 🔒 Keamanan / Login

Dashboard dilindungi password. Atur di `server/.env`:

```bash
ADMIN_PASSWORD=password-rahasia-kamu   # default 'admin' — WAJIB diganti
```

- Semua endpoint admin (`/api/*`) butuh login; dashboard menyimpan token sesi.
- Yang **tetap publik** (memang harus): overlay OBS (`/overlay/*`), endpoint Nightbot
  (`/nb/*`), file upload (`/uploads/*`), WebSocket, dan `/health`.
- Token sesi disimpan di tabel `sessions` (tahan restart, kedaluwarsa 30 hari).

## 📺 Setup OBS

Dua overlay tersedia (pasang sebagai Browser Source masing-masing):

| Overlay | URL |
|---|---|
| **Alert** (notif `!alert` ala Saweria) | `http://localhost:4300/overlay/` |
| **Live Chat** (chat box di layar) | `http://localhost:4300/overlay/chat.html` |
| **Leaderboard** (kompak, live via WS) | `http://localhost:4300/overlay/leaderboard.html` |
| **Ticker** (alert terbaru berjalan) | `http://localhost:4300/overlay/ticker.html` |

Halaman **Leaderboard publik** (tanpa login, bisa dibagikan ke penonton) ada di
`http://localhost:4300/leaderboard/` — tambah `?overlay` untuk versi transparan OBS.

**Overlay leaderboard** (kompak, update live via WebSocket) untuk dipajang di stream:
`http://localhost:4300/overlay/leaderboard.html`. Parameter opsional:
`?limit=5` (jumlah baris), `?pos=top-right|top-left|bottom-right|bottom-left` (posisi),
`?title=TOP%20DONATUR` (judul).

1. Di OBS: **Sources → + → Browser**.
2. Isi URL sesuai tabel di atas.
3. Ukuran: samakan dengan canvas (mis. 1920×1080). Background overlay transparan.
4. Centang **"Shutdown source when not visible"** = OFF supaya WebSocket tetap tersambung.
5. Alert muncul otomatis tiap ada `!alert` (atau klik Test di dashboard); chat overlay
   menampilkan pesan live yang masuk.

> Di OBS suara & TTS autoplay. Di browser biasa, klik dulu sekali di halaman overlay
> agar audio terbuka.

## 🤖 Integrasi Nightbot (opsional, untuk `!point`)

Karena bot **tidak posting ke chat**, command yang butuh balasan diserahkan ke Nightbot
yang memanggil endpoint kita:

1. Server harus bisa diakses publik. Kalau jalan lokal, buka tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:4300
   # atau: ngrok http 4300
   ```
   Catat URL publiknya, mis. `https://xxxx.trycloudflare.com`.
2. Di Nightbot, buat custom command:
   - **`!point`** →
     `$(urlfetch https://xxxx.trycloudflare.com/nb/points?u=$(user))`
   - **`!rank`** →
     `$(urlfetch https://xxxx.trycloudflare.com/nb/rank?u=$(user))`
3. Penonton ketik `!point` → Nightbot posting balasannya, mis.
   `@budi point kamu: 120 🪙`.

Format balasan bisa diubah di tab **Aturan** (`nightbot.pointsReply`, dll).
Command chat umum lain (`!jadwal`, `!sosmed`) + moderasi kata cukup diatur di Nightbot.

## 🪙 Cara kerja point & `!alert`

- Tiap komentar: **+1 point** (default), dibatasi **cooldown** agar spam tak menghasilkan point.
- Penonton ketik **`!alert pesan keren`**:
  - dicek: point cukup? cooldown lewat? pesan tak terlalu panjang / tak ada kata kasar?
  - kalau lolos → point dipotong (`alert.cost`, default 50) → alert tampil di OBS.
- Semua angka (earn, cost, cooldown, panjang, kata kasar, bonus command) **diatur dari
  dashboard** dan tersimpan di SQLite.

## 🗂️ Struktur

```
server/     Backend Fastify + masterchat + SQLite (data.sqlite) + uploads/
overlay/    Halaman alert untuk OBS Browser Source
dashboard/  Panel kontrol (React + Vite + Tailwind, gaya neobrutalism)
public/     Halaman penonton: leaderboard
shared/     Tipe bersama (WebSocket events, dll)
docs/       Rencana teknis
```

## ⚠️ Catatan

- **`masterchat` tidak resmi** — bisa rusak bila YouTube mengubah format internalnya.
  Reader ada di balik interface `ChatReader` sehingga bisa diganti ke YouTube Data API
  resmi (butuh API key + kuota) bila perlu.
- Data disimpan di `server/data.sqlite` (backup = salin file itu). Upload di `server/uploads/`.
- Untuk produksi 24/7: build dashboard (`npm run build` di `dashboard/`) dan serve
  hasilnya, jalankan server dengan process manager (mis. `pm2`/systemd), dan pasang
  tunnel/reverse-proxy bila butuh Nightbot.
```