// Auth sederhana untuk satu streamer: login password → token sesi.
// Token disimpan di DB (tabel sessions) supaya TAHAN restart server.
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export class Auth {
  private tokens = new Set<string>();

  constructor(
    private readonly db: DatabaseSync,
    private readonly password: string,
  ) {
    // Bersihkan sesi lama, lalu muat sesi yang masih berlaku ke memori.
    this.db
      .prepare("DELETE FROM sessions WHERE created_at < ?")
      .run(Date.now() - THIRTY_DAYS);
    const rows = this.db.prepare("SELECT token FROM sessions").all() as {
      token: string;
    }[];
    for (const r of rows) this.tokens.add(r.token);
  }

  /** Verifikasi password → keluarkan token, atau null bila salah. */
  login(password: string): string | null {
    if (!safeEqual(password, this.password)) return null;
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
    this.tokens.add(token);
    this.db
      .prepare("INSERT INTO sessions(token, created_at) VALUES(?, ?)")
      .run(token, Date.now());
    return token;
  }

  valid(token: string | undefined): boolean {
    return !!token && this.tokens.has(token);
  }

  logout(token: string | undefined): void {
    if (!token) return;
    this.tokens.delete(token);
    this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
}

/** Ambil token dari header Authorization: Bearer <token>. */
export function bearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m?.[1];
}
