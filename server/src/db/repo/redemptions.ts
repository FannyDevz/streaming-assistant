// Log & antrian redeem alert. Persist supaya antrian tahan restart (dipakai M4).
import type { DatabaseSync } from "node:sqlite";

export interface RedemptionRow {
  id: number;
  host_channel_id: string;
  author_channel_id: string;
  display_name: string;
  message: string;
  cost: number;
  template_id: number | null;
  status: string;
  created_at: number;
  shown_at: number | null;
}

export interface CreateRedemption {
  hostChannelId: string;
  authorChannelId: string;
  displayName: string;
  message: string;
  cost: number;
  templateId: number;
  now: number;
}

export class RedemptionsRepo {
  constructor(private readonly db: DatabaseSync) {}

  create(input: CreateRedemption): number {
    const info = this.db
      .prepare(
        `INSERT INTO redemptions
          (host_channel_id, author_channel_id, display_name, message, cost, template_id, status, created_at)
         VALUES(?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(
        input.hostChannelId,
        input.authorChannelId,
        input.displayName,
        input.message,
        input.cost,
        input.templateId,
        input.now,
      );
    return Number(info.lastInsertRowid);
  }

  getById(id: number): RedemptionRow | undefined {
    return this.db.prepare("SELECT * FROM redemptions WHERE id = ?").get(id) as
      | RedemptionRow
      | undefined;
  }

  markShown(id: number, now: number): void {
    this.db
      .prepare("UPDATE redemptions SET status = 'shown', shown_at = ? WHERE id = ?")
      .run(now, id);
  }

  listByStatus(status: string | undefined, limit: number): RedemptionRow[] {
    if (status) {
      return this.db
        .prepare(
          "SELECT * FROM redemptions WHERE status = ? ORDER BY created_at DESC LIMIT ?",
        )
        .all(status, limit) as unknown as RedemptionRow[];
    }
    return this.db
      .prepare("SELECT * FROM redemptions ORDER BY created_at DESC LIMIT ?")
      .all(limit) as unknown as RedemptionRow[];
  }

  listByAuthor(host: string, author: string, limit: number): RedemptionRow[] {
    return this.db
      .prepare(
        "SELECT * FROM redemptions WHERE host_channel_id = ? AND author_channel_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(host, author, limit) as unknown as RedemptionRow[];
  }

  countByAuthor(host: string, author: string): number {
    const r = this.db
      .prepare("SELECT COUNT(*) AS n FROM redemptions WHERE host_channel_id = ? AND author_channel_id = ?")
      .get(host, author) as { n: number };
    return r.n;
  }

  getPending(): RedemptionRow[] {
    return this.db
      .prepare(
        "SELECT * FROM redemptions WHERE status = 'pending' ORDER BY created_at ASC",
      )
      .all() as unknown as RedemptionRow[];
  }

  /** Semua baris (untuk export riwayat). */
  listAll(): RedemptionRow[] {
    return this.db
      .prepare("SELECT * FROM redemptions ORDER BY created_at ASC")
      .all() as unknown as RedemptionRow[];
  }

  /** Kosongkan seluruh riwayat. Kembalikan jumlah baris terhapus. */
  clearAll(): number {
    return Number(this.db.prepare("DELETE FROM redemptions").run().changes);
  }

  /** Impor baris riwayat (id baru dibuat otomatis). Kembalikan jumlah baris masuk. */
  importMany(rows: Partial<RedemptionRow>[]): number {
    const stmt = this.db.prepare(
      `INSERT INTO redemptions
        (host_channel_id, author_channel_id, display_name, message, cost, template_id, status, created_at, shown_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let n = 0;
    for (const r of rows) {
      if (!r || typeof r.display_name !== "string") continue;
      stmt.run(
        typeof r.host_channel_id === "string" ? r.host_channel_id : "IMPORT",
        typeof r.author_channel_id === "string" ? r.author_channel_id : "IMPORT",
        r.display_name,
        typeof r.message === "string" ? r.message : "",
        typeof r.cost === "number" ? r.cost : 0,
        typeof r.template_id === "number" ? r.template_id : null,
        typeof r.status === "string" ? r.status : "shown",
        typeof r.created_at === "number" ? r.created_at : Date.now(),
        typeof r.shown_at === "number" ? r.shown_at : null,
      );
      n += 1;
    }
    return n;
  }
}
