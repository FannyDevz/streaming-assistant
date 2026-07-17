// Akses settings dengan cache in-memory. Semua aturan (earn, alert, nightbot)
// dibaca lewat sini supaya bisa diubah dari dashboard tanpa restart.
import type { DatabaseSync } from "node:sqlite";

export class SettingsRepo {
  private cache = new Map<string, unknown>();

  constructor(private readonly db: DatabaseSync) {
    this.reload();
  }

  reload(): void {
    this.cache.clear();
    const rows = this.db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
    for (const row of rows) {
      try {
        this.cache.set(row.key, JSON.parse(row.value));
      } catch {
        this.cache.set(row.key, row.value);
      }
    }
  }

  get<T>(key: string, fallback: T): T {
    return this.cache.has(key) ? (this.cache.get(key) as T) : fallback;
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.cache);
  }

  set(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO settings(key, value) VALUES(?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, JSON.stringify(value));
    this.cache.set(key, value);
  }

  setMany(obj: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(obj)) this.set(key, value);
  }
}
