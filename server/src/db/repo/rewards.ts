// Reward store: definisi reward (Req Lagu, Hero, dll) + antrian klaim.
import type { DatabaseSync } from "node:sqlite";

export interface Reward {
  id: number;
  name: string;
  command: string;
  cost: number;
  prompt: string;
  enabled: boolean;
  alert: boolean;
}

export interface RewardInput {
  name: string;
  command: string;
  cost: number;
  prompt: string;
  enabled: boolean;
  alert: boolean;
}

export interface ClaimRow {
  id: number;
  reward_id: number | null;
  reward_name: string;
  host_channel_id: string;
  author_channel_id: string;
  display_name: string;
  message: string;
  cost: number;
  status: string;
  created_at: number;
  done_at: number | null;
}

interface RewardRow {
  id: number;
  name: string;
  command: string;
  cost: number;
  prompt: string;
  enabled: number;
  alert: number;
  created_at: number;
}

const toReward = (r: RewardRow): Reward => ({
  id: r.id,
  name: r.name,
  command: r.command,
  cost: r.cost,
  prompt: r.prompt,
  enabled: r.enabled === 1,
  alert: r.alert === 1,
});

export class RewardsRepo {
  constructor(private readonly db: DatabaseSync) {}

  list(): Reward[] {
    const rows = this.db
      .prepare("SELECT * FROM rewards ORDER BY id ASC")
      .all() as unknown as RewardRow[];
    return rows.map(toReward);
  }

  getById(id: number): Reward | undefined {
    const r = this.db.prepare("SELECT * FROM rewards WHERE id = ?").get(id) as
      | RewardRow
      | undefined;
    return r ? toReward(r) : undefined;
  }

  create(t: RewardInput): number {
    const info = this.db
      .prepare(
        "INSERT INTO rewards(name, command, cost, prompt, enabled, alert, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
      )
      .run(t.name, t.command, t.cost, t.prompt, t.enabled ? 1 : 0, t.alert ? 1 : 0, Date.now());
    return Number(info.lastInsertRowid);
  }

  update(id: number, t: RewardInput): boolean {
    const info = this.db
      .prepare(
        "UPDATE rewards SET name=?, command=?, cost=?, prompt=?, enabled=?, alert=? WHERE id=?",
      )
      .run(t.name, t.command, t.cost, t.prompt, t.enabled ? 1 : 0, t.alert ? 1 : 0, id);
    return info.changes > 0;
  }

  remove(id: number): boolean {
    return this.db.prepare("DELETE FROM rewards WHERE id=?").run(id).changes > 0;
  }

  /** Hapus semua reward (dipakai saat import config). */
  deleteAll(): void {
    this.db.prepare("DELETE FROM rewards").run();
  }

  // ---- Klaim ----
  createClaim(c: {
    rewardId: number;
    rewardName: string;
    host: string;
    author: string;
    name: string;
    message: string;
    cost: number;
    now: number;
  }): number {
    const info = this.db
      .prepare(
        `INSERT INTO reward_claims
          (reward_id, reward_name, host_channel_id, author_channel_id, display_name, message, cost, status, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(c.rewardId, c.rewardName, c.host, c.author, c.name, c.message, c.cost, c.now);
    return Number(info.lastInsertRowid);
  }

  listClaims(status: string | undefined, limit: number): ClaimRow[] {
    if (status) {
      return this.db
        .prepare("SELECT * FROM reward_claims WHERE status=? ORDER BY created_at DESC LIMIT ?")
        .all(status, limit) as unknown as ClaimRow[];
    }
    return this.db
      .prepare("SELECT * FROM reward_claims ORDER BY created_at DESC LIMIT ?")
      .all(limit) as unknown as ClaimRow[];
  }

  getClaim(id: number): ClaimRow | undefined {
    return this.db.prepare("SELECT * FROM reward_claims WHERE id=?").get(id) as
      | ClaimRow
      | undefined;
  }

  setClaimStatus(id: number, status: string, now: number): boolean {
    return (
      this.db
        .prepare("UPDATE reward_claims SET status=?, done_at=? WHERE id=?")
        .run(status, now, id).changes > 0
    );
  }

  deleteClaim(id: number): boolean {
    return this.db.prepare("DELETE FROM reward_claims WHERE id=?").run(id).changes > 0;
  }
}
