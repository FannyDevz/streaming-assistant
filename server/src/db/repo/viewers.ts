// Penyimpanan point per penonton (dilingkup per channel host) + audit ledger.
// Kunci penonton = authorChannelId (stabil), bukan nama tampilan.
import type { DatabaseSync } from "node:sqlite";

export interface ViewerRow {
  id: number;
  host_channel_id: string;
  author_channel_id: string;
  display_name: string;
  points: number;
  total_earned: number;
  last_earn_at: number | null;
  last_alert_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface LeaderboardEntry {
  rank: number;
  authorChannelId: string;
  name: string;
  points: number;
  totalEarned: number;
}

export interface EarnResult {
  id: number;
  points: number;
  earned: boolean;
}

export class ViewersRepo {
  constructor(private readonly db: DatabaseSync) {}

  private ledger(viewerId: number, delta: number, reason: string, now: number): void {
    this.db
      .prepare(
        "INSERT INTO point_ledger(viewer_id, delta, reason, created_at) VALUES(?, ?, ?, ?)",
      )
      .run(viewerId, delta, reason, now);
  }

  getByAuthor(host: string, author: string): ViewerRow | undefined {
    return this.db
      .prepare(
        "SELECT * FROM viewers WHERE host_channel_id = ? AND author_channel_id = ?",
      )
      .get(host, author) as ViewerRow | undefined;
  }

  getById(id: number): ViewerRow | undefined {
    return this.db.prepare("SELECT * FROM viewers WHERE id = ?").get(id) as
      | ViewerRow
      | undefined;
  }

  /** Beri point untuk sebuah komentar, hormati cooldown. */
  earn(
    host: string,
    author: string,
    name: string,
    amount: number,
    cooldownMs: number,
    now: number,
  ): EarnResult {
    const existing = this.getByAuthor(host, author);

    if (!existing) {
      const info = this.db
        .prepare(
          `INSERT INTO viewers
            (host_channel_id, author_channel_id, display_name, points, total_earned, last_earn_at, created_at, updated_at)
           VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(host, author, name, amount, amount, now, now, now);
      const id = Number(info.lastInsertRowid);
      this.ledger(id, amount, "comment", now);
      return { id, points: amount, earned: true };
    }

    const canEarn =
      existing.last_earn_at == null || now - existing.last_earn_at >= cooldownMs;

    if (canEarn) {
      const points = existing.points + amount;
      this.db
        .prepare(
          `UPDATE viewers
             SET display_name = ?, points = ?, total_earned = total_earned + ?, last_earn_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(name, points, amount, now, now, existing.id);
      this.ledger(existing.id, amount, "comment", now);
      return { id: existing.id, points, earned: true };
    }

    // Masih cooldown: cukup segarkan nama kalau berubah.
    if (existing.display_name !== name) {
      this.db
        .prepare("UPDATE viewers SET display_name = ?, updated_at = ? WHERE id = ?")
        .run(name, now, existing.id);
    }
    return { id: existing.id, points: existing.points, earned: false };
  }

  /** Tambah/kurangi point manual atau bonus. Return saldo terbaru. */
  addPoints(viewerId: number, delta: number, reason: string, now: number): number {
    this.db
      .prepare(
        `UPDATE viewers
           SET points = points + ?,
               total_earned = total_earned + CASE WHEN ? > 0 THEN ? ELSE 0 END,
               updated_at = ?
         WHERE id = ?`,
      )
      .run(delta, delta, delta, now, viewerId);
    this.ledger(viewerId, delta, reason, now);
    const row = this.db
      .prepare("SELECT points FROM viewers WHERE id = ?")
      .get(viewerId) as { points: number };
    return row.points;
  }

  /** Potong point untuk redeem alert + set cooldown alert. Return saldo baru. */
  spendForAlert(viewerId: number, cost: number, now: number): number {
    this.db
      .prepare(
        "UPDATE viewers SET points = points - ?, last_alert_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(cost, now, now, viewerId);
    this.ledger(viewerId, -cost, "alert", now);
    const row = this.db
      .prepare("SELECT points FROM viewers WHERE id = ?")
      .get(viewerId) as { points: number };
    return row.points;
  }

  leaderboard(host: string, limit: number): LeaderboardEntry[] {
    const rows = this.db
      .prepare(
        `SELECT author_channel_id, display_name, points, total_earned
           FROM viewers WHERE host_channel_id = ?
          ORDER BY points DESC, updated_at ASC LIMIT ?`,
      )
      .all(host, limit) as {
      author_channel_id: string;
      display_name: string;
      points: number;
      total_earned: number;
    }[];
    return rows.map((r, i) => ({
      rank: i + 1,
      authorChannelId: r.author_channel_id,
      name: r.display_name,
      points: r.points,
      totalEarned: r.total_earned,
    }));
  }

  /** Cari penonton berdasarkan nama (untuk Nightbot). Normalisasi '@' & case. */
  findByName(host: string, name: string): ViewerRow | undefined {
    return this.db
      .prepare(
        `SELECT * FROM viewers
          WHERE host_channel_id = ?
            AND LOWER(TRIM(display_name, '@')) = LOWER(TRIM(?, '@'))
          ORDER BY points DESC LIMIT 1`,
      )
      .get(host, name) as ViewerRow | undefined;
  }

  /** Peringkat penonton (1 = tertinggi) berdasarkan point. */
  rankOf(host: string, points: number): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM viewers WHERE host_channel_id = ? AND points > ?",
      )
      .get(host, points) as { n: number };
    return row.n + 1;
  }

  /** Hapus semua point + ledger untuk satu channel host (reset leaderboard). */
  resetHost(host: string): number {
    this.db
      .prepare(
        "DELETE FROM point_ledger WHERE viewer_id IN (SELECT id FROM viewers WHERE host_channel_id = ?)",
      )
      .run(host);
    const info = this.db
      .prepare("DELETE FROM viewers WHERE host_channel_id = ?")
      .run(host);
    return Number(info.changes);
  }

  sumPoints(host: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(SUM(points),0) AS s FROM viewers WHERE host_channel_id = ?")
      .get(host) as { s: number };
    return Number(row.s);
  }

  countForHost(host: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS n FROM viewers WHERE host_channel_id = ?")
      .get(host) as { n: number };
    return row.n;
  }

  /** Riwayat mutasi point terakhir untuk satu penonton (buat profil). */
  ledgerFor(viewerId: number, limit: number): { delta: number; reason: string; created_at: number }[] {
    return this.db
      .prepare(
        "SELECT delta, reason, created_at FROM point_ledger WHERE viewer_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(viewerId, limit) as unknown as { delta: number; reason: string; created_at: number }[];
  }
}
