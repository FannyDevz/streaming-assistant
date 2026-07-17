// Statistik per sesi live. Sesi = satu rentang streaming (Mulai → Stop).
// Angka detail dihitung on-the-fly dari ledger/redemptions/viewers pada rentang waktu sesi,
// jadi tabel stream_sessions cukup menyimpan rentang + jumlah chat (chat tak dipersist).
import type { DatabaseSync } from "node:sqlite";

export interface SessionRow {
  id: number;
  host_channel_id: string | null;
  video_id: string | null;
  title: string;
  started_at: number;
  ended_at: number | null;
  chats: number;
}

export interface SessionSummary {
  id: number;
  title: string;
  videoId: string | null;
  startedAt: number;
  endedAt: number | null;
  live: boolean;
  durationMs: number;
  chats: number;
  alerts: number;
  rewards: number;
  pointsAwarded: number;
  pointsSpent: number;
  newViewers: number;
  topSpenders: { name: string; spent: number }[];
}

export class StatsRepo {
  constructor(private readonly db: DatabaseSync) {}

  /** Mulai sesi baru. Kalau ada sesi terbuka untuk video yang sama, pakai lagi. */
  startSession(host: string | null, videoId: string | null, title: string, now: number): number {
    const open = this.current();
    if (open && videoId && open.video_id === videoId) {
      // Reconnect ke video sama: lanjutkan sesi & segarkan judul.
      this.db
        .prepare("UPDATE stream_sessions SET title = ?, ended_at = NULL WHERE id = ?")
        .run(title, open.id);
      return open.id;
    }
    this.endOpen(now);
    const info = this.db
      .prepare(
        "INSERT INTO stream_sessions(host_channel_id, video_id, title, started_at) VALUES(?, ?, ?, ?)",
      )
      .run(host, videoId, title, now);
    return Number(info.lastInsertRowid);
  }

  /** Tutup semua sesi yang masih terbuka. */
  endOpen(now: number): void {
    this.db
      .prepare("UPDATE stream_sessions SET ended_at = ? WHERE ended_at IS NULL")
      .run(now);
  }

  bumpChats(id: number): void {
    this.db.prepare("UPDATE stream_sessions SET chats = chats + 1 WHERE id = ?").run(id);
  }

  current(): SessionRow | undefined {
    return this.db
      .prepare("SELECT * FROM stream_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
      .get() as SessionRow | undefined;
  }

  getById(id: number): SessionRow | undefined {
    return this.db.prepare("SELECT * FROM stream_sessions WHERE id = ?").get(id) as
      | SessionRow
      | undefined;
  }

  list(limit: number): SessionRow[] {
    return this.db
      .prepare("SELECT * FROM stream_sessions ORDER BY started_at DESC LIMIT ?")
      .all(limit) as unknown as SessionRow[];
  }

  /** Hitung ringkasan statistik untuk sebuah sesi. `now` = waktu sekarang (untuk sesi live). */
  summary(row: SessionRow, now: number): SessionSummary {
    const start = row.started_at;
    const end = row.ended_at ?? now;
    const host = row.host_channel_id;

    const num = (v: unknown) => Number((v as { n?: number } | undefined)?.n ?? 0);

    const alerts = num(
      this.db
        .prepare("SELECT COUNT(*) AS n FROM redemptions WHERE created_at BETWEEN ? AND ?")
        .get(start, end),
    );
    const rewards = num(
      this.db
        .prepare("SELECT COUNT(*) AS n FROM reward_claims WHERE created_at BETWEEN ? AND ?")
        .get(start, end),
    );

    // Point dari ledger (join viewers untuk filter host bila ada).
    const hostFilter = host ? "AND v.host_channel_id = ?" : "";
    const hostArg: string[] = host ? [host] : [];
    const awarded = num(
      this.db
        .prepare(
          `SELECT COALESCE(SUM(l.delta),0) AS n FROM point_ledger l JOIN viewers v ON v.id = l.viewer_id
             WHERE l.delta > 0 AND l.created_at BETWEEN ? AND ? ${hostFilter}`,
        )
        .get(start, end, ...hostArg),
    );
    const spent = num(
      this.db
        .prepare(
          `SELECT COALESCE(SUM(-l.delta),0) AS n FROM point_ledger l JOIN viewers v ON v.id = l.viewer_id
             WHERE l.delta < 0 AND l.created_at BETWEEN ? AND ? ${hostFilter}`,
        )
        .get(start, end, ...hostArg),
    );
    const newViewers = num(
      this.db
        .prepare(
          `SELECT COUNT(*) AS n FROM viewers WHERE created_at BETWEEN ? AND ? ${host ? "AND host_channel_id = ?" : ""}`,
        )
        .get(start, end, ...hostArg),
    );

    const topRows = this.db
      .prepare(
        `SELECT v.display_name AS name, SUM(-l.delta) AS spent
           FROM point_ledger l JOIN viewers v ON v.id = l.viewer_id
          WHERE l.delta < 0 AND l.created_at BETWEEN ? AND ? ${hostFilter}
          GROUP BY l.viewer_id ORDER BY spent DESC LIMIT 3`,
      )
      .all(start, end, ...hostArg) as { name: string; spent: number }[];

    return {
      id: row.id,
      title: row.title,
      videoId: row.video_id,
      startedAt: start,
      endedAt: row.ended_at,
      live: row.ended_at == null,
      durationMs: Math.max(0, end - start),
      chats: row.chats,
      alerts,
      rewards,
      pointsAwarded: awarded,
      pointsSpent: spent,
      newViewers,
      topSpenders: topRows.map((r) => ({ name: r.name, spent: Number(r.spent) })),
    };
  }
}
