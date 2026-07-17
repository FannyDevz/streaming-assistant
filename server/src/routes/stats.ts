// Route statistik sesi live.
import type { FastifyInstance } from "fastify";
import type { StatsRepo } from "../db/repo/stats.ts";

export function statsRoutes(app: FastifyInstance, deps: { stats: StatsRepo }): void {
  // Sesi yang sedang berjalan (null kalau belum mulai).
  app.get("/api/stats/current", async () => {
    const row = deps.stats.current();
    return { session: row ? deps.stats.summary(row, Date.now()) : null };
  });

  // Riwayat sesi (termasuk yang live).
  app.get("/api/stats/sessions", async (req) => {
    const q = req.query as { limit?: string };
    const limit = Math.min(Math.max(1, Number(q.limit ?? 20) || 20), 100);
    const now = Date.now();
    return { entries: deps.stats.list(limit).map((r) => deps.stats.summary(r, now)) };
  });
}
