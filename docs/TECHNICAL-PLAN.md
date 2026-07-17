# Streaming Assistant — Rencana Teknis (MVP-1)

Bot untuk YouTube Live: baca live chat channel manapun (tanpa auth), sistem point
per penonton, command `!alert` yang menukar point jadi notifikasi ala Saweria di
OBS. Balasan command umum & moderasi in-chat diserahkan ke Nightbot.

## 1. Prinsip arsitektur

- **Baca chat = read-only, tanpa OAuth.** Pakai `masterchat` (tanpa API key,
  tanpa kuota, jalan di channel publik manapun). Abstraksi tipis `ChatReader`
  supaya bisa ganti ke YouTube Data API resmi kalau masterchat rusak.
- **Tidak pernah posting ke chat.** Fitur "balas kalau ada kata X" = Nightbot.
- **Point → alert loop sepenuhnya lokal.** Poller lihat `!alert`, potong point,
  push ke overlay lewat WebSocket. OBS cukup pakai Browser Source ke halaman kita.
- **Semua aturan configurable** dari dashboard, tersimpan di SQLite.

```
YouTube live chat ──(masterchat, no auth)──▶ ChatReader
                                                  │ normalized ChatMessage
                                                  ▼
                    ┌──────────── Engine ─────────────┐
                    │ points (earn+cooldown)          │
                    │ commands (!alert, bonus)        │
                    │ moderation (badword, panjang)   │
                    └───────────────┬─────────────────┘
                     SQLite ◀───────┤────────▶ WS Hub
                                    │        ┌────┴─────┐
                                    ▼        ▼          ▼
                                REST API  Overlay    Dashboard
                                          (OBS)      (neobrutalism)
```

## 2. Tech stack

| Lapisan | Pilihan |
|---|---|
| Runtime | Node.js LTS, TypeScript (dev pakai `tsx`) |
| Server | Fastify + `@fastify/websocket` + `@fastify/static` + `@fastify/multipart` |
| Baca chat | `masterchat` (fallback: YouTube Data API v3) |
| Database | SQLite via `better-sqlite3` (sinkron, 1 file) |
| Validasi | `zod` |
| Frontend | React + Vite + TypeScript + Tailwind + komponen neobrutalism.dev |
| Suara/TTS | `<audio>` + Web Speech `SpeechSynthesis` di overlay (tanpa dependency) |

## 3. Struktur repo (monorepo sederhana)

```
streaming-assistant/
├─ server/
│  ├─ src/
│  │  ├─ index.ts              bootstrap Fastify + plugins + routes + WS
│  │  ├─ config.ts             env + default settings
│  │  ├─ db/{index,migrate}.ts better-sqlite3 + skema
│  │  ├─ db/repo/*.ts          viewers, settings, templates, redemptions, ledger
│  │  ├─ chat/reader.ts        wrapper masterchat → emit ChatMessage
│  │  ├─ engine/points.ts      earn + cooldown
│  │  ├─ engine/commands.ts    parse !alert + bonus command
│  │  ├─ engine/moderation.ts  filter kata + panjang
│  │  ├─ ws/hub.ts             broadcast overlay + dashboard, antrian alert
│  │  └─ routes/*.ts           monitor, settings, viewers, templates, alerts
│  ├─ uploads/                 gambar & suara custom
│  └─ data.sqlite
├─ overlay/                    halaman alert untuk OBS Browser Source
├─ dashboard/                  React + Vite (neobrutalism)
└─ shared/                     tipe & konstanta bersama (ChatMessage, WS events)
```

Dev: Vite proxy `/api` & `/ws` ke Fastify. Prod: Fastify serve build dashboard + overlay.

## 4. Skema database (SQLite)

```sql
-- penonton, point-nya dilingkup per channel host yang dipantau
CREATE TABLE viewers (
  id                INTEGER PRIMARY KEY,
  host_channel_id   TEXT NOT NULL,      -- channel yang dipantau
  author_channel_id TEXT NOT NULL,      -- ID penonton dari YouTube (stabil)
  display_name      TEXT NOT NULL,
  points            INTEGER NOT NULL DEFAULT 0,
  total_earned      INTEGER NOT NULL DEFAULT 0,
  last_earn_at      INTEGER,            -- epoch ms, untuk cooldown earn
  last_alert_at     INTEGER,            -- epoch ms, untuk cooldown alert
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  UNIQUE(host_channel_id, author_channel_id)
);

-- catatan transaksi point (audit & transparansi)
CREATE TABLE point_ledger (
  id         INTEGER PRIMARY KEY,
  viewer_id  INTEGER NOT NULL REFERENCES viewers(id),
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,             -- comment | bonus | alert | admin
  created_at INTEGER NOT NULL
);

-- redemption / antrian alert (persist supaya tahan restart)
CREATE TABLE redemptions (
  id                INTEGER PRIMARY KEY,
  host_channel_id   TEXT NOT NULL,
  author_channel_id TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  message           TEXT NOT NULL,
  cost              INTEGER NOT NULL,
  template_id       INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending|shown|skipped
  created_at        INTEGER NOT NULL,
  shown_at          INTEGER
);

-- template tampilan alert (custom gambar/suara/animasi)
CREATE TABLE alert_templates (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  image_path  TEXT,
  sound_path  TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 6000,
  animation   TEXT NOT NULL DEFAULT 'slide',  -- slide|pop|fade
  position    TEXT NOT NULL DEFAULT 'top',    -- top|center|bottom
  text_color  TEXT NOT NULL DEFAULT '#000000',
  bg_color    TEXT NOT NULL DEFAULT '#ffde00',
  tts_enabled INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

-- key/value settings (semua aturan configurable)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                    -- JSON
);
```

### Default settings (bisa diubah dari dashboard)

```jsonc
{
  "earn.amount": 1,
  "earn.cooldownSec": 60,
  "earn.bonusCommands": [
    { "trigger": "!hadir", "points": 5, "oncePerStream": true }
  ],
  "alert.command": "!alert",
  "alert.cost": 50,
  "alert.cooldownSec": 300,
  "alert.maxLen": 100,
  "alert.badWords": [],
  "alert.defaultTemplateId": 1,

  "nightbot.pointsCommand": "!point",
  "nightbot.pointsReply": "@{name} point kamu: {points} 🪙",
  "nightbot.notFoundReply": "@{name} belum punya point, komen dulu ya!"
}
```

## 5. REST API

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/monitor/start` | `{ url }` → ekstrak videoId, mulai reader, balikin judul & channelId |
| POST | `/api/monitor/stop` | hentikan reader |
| GET  | `/api/monitor/status` | status pantau (videoId, judul, jumlah pesan) |
| GET  | `/api/settings` / PUT | baca / ubah semua aturan |
| GET  | `/api/leaderboard?limit=` | top point |
| GET  | `/api/viewers?search=` | cari penonton |
| POST | `/api/viewers/:id/adjust` | `{ delta, reason }` tweak point manual |
| GET/POST/PUT/DELETE | `/api/templates[/:id]` | kelola template alert |
| POST | `/api/templates/upload` | upload gambar/suara (multipart) |
| GET  | `/api/redemptions?status=` | log/antrian alert |
| POST | `/api/alerts/test` | `{ templateId, name, message }` kirim alert dummy ke overlay |
| POST | `/api/alerts/:id/replay` | putar ulang alert |

### Endpoint Nightbot (`/nb/*`, balikan **plain text** untuk `$(urlfetch)`)

| Method | Path | Command Nightbot | Balasan |
|---|---|---|---|
| GET | `/nb/points?u=$(user)` | `!point` | `@budi point kamu: 120 🪙` |
| GET | `/nb/rank?u=$(user)` | `!rank` | `@budi peringkat #4 (120 🪙)` |

- Balasan **plain text**, langsung ditempel Nightbot ke chat.
- Matching penonton **berdasarkan nama tampilan** (`$(user)`) di channel yang
  dipantau — Nightbot tidak mengirim `authorChannelId`. Point earning tetap akurat
  (poller pakai `authorChannelId`); hanya lookup command yang pakai nama.
- Butuh server **bisa diakses publik** (tunnel `cloudflared`/`ngrok` saat lokal).
- Command yang butuh balasan (cek point/rank) = Nightbot. Command yang cuma memicu
  aksi (`!alert` → overlay) tetap ditangani poller lokal, tanpa tunnel.

## 6. Protokol WebSocket (`/ws?role=overlay|dashboard`)

**Server → client**
- `alert` `{ id, name, message, template }` — overlay tampilkan (satu per satu)
- `chat` `{ name, message, isMember, ... }` — feed live di dashboard
- `points` `{ authorChannelId, name, points }` — update leaderboard
- `status` `{ monitoring, videoId, title }`

**Client → server**
- overlay `ready` — minta alert berikutnya
- overlay `alert:shown { id }` — tanda selesai → server kirim antrian berikutnya

**Antrian:** FIFO in-memory + persist di `redemptions`. Server kirim 1 alert,
tunggu `alert:shown` (atau timeout = durasi template + buffer) sebelum kirim
berikutnya. Saat boot, muat ulang video terpantau + antrian `pending`.

## 7. Alur inti

1. Dashboard: paste URL live → `POST /api/monitor/start` → `ChatReader` mulai.
2. Tiap pesan masuk → Engine:
   - **Earn:** kalau lewat `earn.cooldownSec`, `+earn.amount`, catat di ledger.
   - **Command `!alert <pesan>`:** cek `points >= cost`, cooldown, panjang,
     badword → potong point → buat `redemption` → push WS `alert` ke overlay.
   - **Bonus command** (mis. `!hadir`) sesuai konfigurasi.
   - Push WS `chat` + `points` ke dashboard.
3. Overlay (Browser Source OBS) terima `alert` → animasi + suara + TTS → ack.
4. Dashboard: kontrol monitor, edit aturan, leaderboard, kelola template, test.

## 8. Urutan pembangunan

- **M1 — Fondasi + baca chat:** Fastify, migrate SQLite, `ChatReader` masterchat,
  `monitor/start|stop`, chat tampil di console + WS. *Uji: paste URL, chat masuk.*
- **M2 — Sistem point:** earn + cooldown + ledger + leaderboard + endpoint Nightbot
  `/nb/points` & `/nb/rank`. *Uji via REST + `curl` endpoint Nightbot.*
- **M3 — Command `!alert` + engine:** parse, validasi, moderation, redemption, WS.
- **M4 — Overlay OBS:** halaman alert + WS + antrian + suara/TTS + tombol test.
  *Titik "wow": alert muncul di OBS.*
- **M5 — Dashboard neobrutalism:** monitor, settings editor, leaderboard, template.
- **M6 — Poles:** upload gambar/suara custom, animasi, dokumentasi setup Nightbot
  + OBS Browser Source.

## 9. Catatan risiko & keputusan

- **masterchat tidak resmi** → bisa rusak kalau YouTube ubah format. Mitigasi:
  interface `ChatReader` supaya gampang ganti ke API resmi (butuh API key + kuota).
- **Cocokkan `!alert` ke pemilik point:** masterchat kasih `authorChannelId`
  (stabil) — jadi pemotongan point akurat, tidak bergantung nama tampilan.
- **Nightbot opsional untuk konfirmasi in-chat** lewat `$(urlfetch ...)` — perlu
  server bisa diakses publik (tunnel cloudflared/ngrok kalau jalan lokal).
- **Tahan restart:** muat ulang video terpantau + antrian `pending` saat boot.
- **Keamanan dashboard** (token login) & deploy 24/7 = fase setelah MVP.
```