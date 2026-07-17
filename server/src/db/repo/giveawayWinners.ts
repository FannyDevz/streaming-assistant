// Penyimpanan pemenang giveaway (username + hadiah).
import type { DatabaseSync } from "node:sqlite";

export interface Winner {
  id: number;
  name: string;
  reward: string;
  created_at: number;
}

export class GiveawayWinnersRepo {
  constructor(private readonly db: DatabaseSync) {}

  add(name: string, reward: string, now: number): number {
    const info = this.db
      .prepare("INSERT INTO giveaway_winners(name, reward, created_at) VALUES(?, ?, ?)")
      .run(name, reward, now);
    return Number(info.lastInsertRowid);
  }

  list(limit: number): Winner[] {
    return this.db
      .prepare("SELECT * FROM giveaway_winners ORDER BY created_at DESC LIMIT ?")
      .all(limit) as unknown as Winner[];
  }

  remove(id: number): boolean {
    return this.db.prepare("DELETE FROM giveaway_winners WHERE id = ?").run(id).changes > 0;
  }
}
