// Skema database + seed default settings. Idempotent: aman dijalankan tiap boot.
import type { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS viewers (
  id                INTEGER PRIMARY KEY,
  host_channel_id   TEXT NOT NULL,
  author_channel_id TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  points            INTEGER NOT NULL DEFAULT 0,
  total_earned      INTEGER NOT NULL DEFAULT 0,
  last_earn_at      INTEGER,
  last_alert_at     INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  UNIQUE(host_channel_id, author_channel_id)
);
CREATE INDEX IF NOT EXISTS idx_viewers_leaderboard
  ON viewers(host_channel_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_viewers_name
  ON viewers(host_channel_id, display_name);

CREATE TABLE IF NOT EXISTS point_ledger (
  id         INTEGER PRIMARY KEY,
  viewer_id  INTEGER NOT NULL REFERENCES viewers(id),
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS redemptions (
  id                INTEGER PRIMARY KEY,
  host_channel_id   TEXT NOT NULL,
  author_channel_id TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  message           TEXT NOT NULL,
  cost              INTEGER NOT NULL,
  template_id       INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        INTEGER NOT NULL,
  shown_at          INTEGER
);
CREATE INDEX IF NOT EXISTS idx_redemptions_status
  ON redemptions(status, created_at);

CREATE TABLE IF NOT EXISTS alert_templates (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  command      TEXT NOT NULL DEFAULT '!alert',
  cost         INTEGER NOT NULL DEFAULT 50,
  image_path   TEXT,
  gif_path     TEXT,
  sound_path   TEXT,
  duration_ms  INTEGER NOT NULL DEFAULT 6000,
  animation    TEXT NOT NULL DEFAULT 'slide',
  position     TEXT NOT NULL DEFAULT 'top',
  text_color   TEXT NOT NULL DEFAULT '#000000',
  bg_color     TEXT NOT NULL DEFAULT '#ffde00',
  tts_enabled  INTEGER NOT NULL DEFAULT 1,
  youtube_id   TEXT,
  youtube_start INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  command    TEXT NOT NULL,
  cost       INTEGER NOT NULL DEFAULT 100,
  prompt     TEXT NOT NULL DEFAULT '',
  enabled    INTEGER NOT NULL DEFAULT 1,
  alert      INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id                INTEGER PRIMARY KEY,
  reward_id         INTEGER,
  reward_name       TEXT NOT NULL,
  host_channel_id   TEXT NOT NULL,
  author_channel_id TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  message           TEXT NOT NULL,
  cost              INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        INTEGER NOT NULL,
  done_at           INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON reward_claims(status, created_at);

CREATE TABLE IF NOT EXISTS giveaway_winners (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  reward     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sounds (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  image_path TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stream_sessions (
  id              INTEGER PRIMARY KEY,
  host_channel_id TEXT,
  video_id        TEXT,
  title           TEXT NOT NULL DEFAULT '',
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  chats           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_started ON stream_sessions(started_at DESC);
`;

/** Nilai default semua aturan — bisa diubah dari dashboard nanti. */
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  "earn.amount": 1,
  "earn.cooldownSec": 60,
  "earn.bonusCommands": [{ trigger: "!hadir", points: 5, oncePerStream: true }],
  "alert.command": "!alert",
  "alert.cost": 50,
  "alert.cooldownSec": 300,
  "alert.maxLen": 100,
  "alert.badWords": [],
  "alert.defaultTemplateId": 1,
  "alert.paused": false,
  "points.persistence": "forever",
  "nightbot.pointsCommand": "!point",
  "nightbot.rankCommand": "!rank",
  "nightbot.pointsReply": "@{name} point kamu: {points} 🪙",
  "nightbot.rankReply": "@{name} peringkat #{rank} dari {total} penonton ({points} 🪙)",
  "nightbot.notFoundReply": "@{name} belum punya point, komen dulu ya!",

  // Level/badge (tier dari total point earned).
  "levels": [
    { name: "Bronze", min: 0, color: "#cd7f32" },
    { name: "Silver", min: 100, color: "#9aa5b1" },
    { name: "Gold", min: 500, color: "#ffcc00" },
    { name: "Diamond", min: 2000, color: "#4dd0e1" },
  ],

  // Mini-game (dipicu lewat Nightbot $(urlfetch)).
  "game.enabled": true,
  "game.coinflip.command": "!coinflip",
  "game.gamble.command": "!gamble",
  "game.minBet": 5,
  "game.maxBet": 1000,
  "game.coinflip.winChance": 0.5,
  "game.gamble.winChance": 0.35,
  "game.gamble.payout": 2,
  "game.winReply": "@{name} MENANG {game} 🎉 +{delta} 🪙 (sisa {points})",
  "game.loseReply": "@{name} kalah {game} 😢 -{bet} 🪙 (sisa {points})",

  // Alert otomatis SuperChat & member baru.
  "superchat.enabled": true,
  "superchat.message": "💎 {name} SuperChat {amount}! {message}",
  "superchat.points": 0,
  "member.enabled": true,
  "member.message": "🌟 {name} jadi member baru! 🎉",
  "member.points": 0,

  // Goal bar overlay.
  "goal.enabled": false,
  "goal.label": "Target Point",
  "goal.target": 1000,
  "goal.source": "points",
  "goal.current": 0,

  // Running text (teks bebas berjalan).
  "runtext.label": "📢 INFO",
  "runtext.text": "Selamat datang di stream! Jangan lupa follow & share 🙌 | Ketik !point untuk cek point kamu",

  // Discord webhook (notifikasi ke server Discord).
  "discord.enabled": false,
  "discord.webhookUrl": "",
  "discord.username": "Streaming Assistant",
  "discord.onStreamStart": true,
  "discord.onSuperchat": true,
  "discord.onGiveaway": true,

  // OBS WebSocket (kontrol scene saat alert).
  "obs.enabled": false,
  "obs.url": "ws://127.0.0.1:4455",
  "obs.password": "",
  "obs.alertScene": "",
};

/** Tambah kolom bila belum ada (untuk DB lama). */
function ensureColumn(db: DatabaseSync, table: string, col: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function runMigrations(db: DatabaseSync): void {
  db.exec(SCHEMA);

  // Kolom baru untuk fitur alert video YouTube (DB lama).
  ensureColumn(db, "alert_templates", "youtube_id", "youtube_id TEXT");
  ensureColumn(db, "alert_templates", "youtube_start", "youtube_start INTEGER NOT NULL DEFAULT 0");
  // GIF besar (tampil seperti video), terpisah dari gambar thumbnail.
  ensureColumn(db, "alert_templates", "gif_path", "gif_path TEXT");
  // Command + biaya per template (DB lama). Default ambil dari settings alert.* bila ada.
  ensureColumn(db, "alert_templates", "command", "command TEXT NOT NULL DEFAULT '!alert'");
  ensureColumn(db, "alert_templates", "cost", "cost INTEGER NOT NULL DEFAULT 50");
  ensureColumn(db, "rewards", "alert", "alert INTEGER NOT NULL DEFAULT 1");
  // GIF/gambar opsional untuk soundboard (DB lama).
  ensureColumn(db, "sounds", "image_path", "image_path TEXT");

  // Seed default settings hanya untuk key yang belum ada.
  const now = Date.now();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)",
  );
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insert.run(key, JSON.stringify(value));
  }

  // Template alert default (id 1) supaya alert bisa langsung dites.
  const templateCount = db
    .prepare("SELECT COUNT(*) AS n FROM alert_templates")
    .get() as { n: number };
  if (templateCount.n === 0) {
    db.prepare(
      `INSERT INTO alert_templates
        (id, name, command, cost, duration_ms, animation, position, text_color, bg_color, tts_enabled, created_at)
       VALUES (1, 'Default', '!alert', 50, 6000, 'slide', 'top', '#000000', '#ffde00', 1, ?)`,
    ).run(now);
  }
}
