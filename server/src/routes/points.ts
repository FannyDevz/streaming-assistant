// Route point: leaderboard, adjust manual, dan baca/ubah settings.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChatReader } from "../chat/reader.ts";
import type { WsHub } from "../ws/hub.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

const adjustSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1).default("admin"),
});

export function pointsRoutes(
  app: FastifyInstance,
  deps: {
    reader: ChatReader;
    hub: WsHub;
    viewers: ViewersRepo;
    settings: SettingsRepo;
  },
): void {
  app.get("/api/leaderboard", async (req) => {
    const host = deps.reader.getStatus().hostChannelId;
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 20);
    const limit = Math.min(Math.max(1, limitRaw || 20), 100);
    const levels = deps.settings.get("levels", []);
    if (!host) return { host: null, entries: [], total: 0, levels };
    return {
      host,
      total: deps.viewers.countForHost(host),
      entries: deps.viewers.leaderboard(host, limit),
      levels,
    };
  });

  app.post("/api/viewers/:id/adjust", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const viewer = deps.viewers.getById(id);
    if (!viewer) return reply.code(404).send({ error: "penonton tidak ditemukan" });

    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }

    const points = deps.viewers.addPoints(
      id,
      parsed.data.delta,
      parsed.data.reason,
      Date.now(),
    );
    deps.hub.broadcast({
      type: "points",
      data: { authorChannelId: viewer.author_channel_id, name: viewer.display_name, points },
    });
    return { id, points };
  });

  // Adjust berdasarkan authorChannelId (dipakai leaderboard yang tak menyimpan id).
  app.post("/api/viewers/adjust", async (req, reply) => {
    const host = deps.reader.getStatus().hostChannelId;
    if (!host) return reply.code(409).send({ error: "belum memantau live manapun" });

    const schema = adjustSchema.extend({ authorChannelId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }
    const viewer = deps.viewers.getByAuthor(host, parsed.data.authorChannelId);
    if (!viewer) return reply.code(404).send({ error: "penonton tidak ditemukan" });

    const points = deps.viewers.addPoints(
      viewer.id,
      parsed.data.delta,
      parsed.data.reason,
      Date.now(),
    );
    deps.hub.broadcast({
      type: "points",
      data: { authorChannelId: viewer.author_channel_id, name: viewer.display_name, points },
    });
    return { id: viewer.id, points };
  });

  // Reset manual seluruh leaderboard channel yang sedang/terakhir dipantau.
  // Fallback ke host terakhir (tersimpan di settings) supaya tetap jalan walau
  // sedang tidak memantau atau server baru restart.
  app.post("/api/viewers/reset", async () => {
    const host =
      deps.reader.getStatus().hostChannelId ||
      deps.settings.get<string>("points.lastHostId", "");
    if (!host) return { ok: true, deleted: 0 };
    const deleted = deps.viewers.resetHost(host);
    deps.hub.broadcast({ type: "reset" });
    return { ok: true, deleted };
  });

  app.get("/api/settings", async () => deps.settings.getAll());

  app.put("/api/settings", async (req, reply) => {
    const body = req.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return reply.code(400).send({ error: "body harus objek key-value" });
    }
    deps.settings.setMany(body as Record<string, unknown>);
    return deps.settings.getAll();
  });
}
