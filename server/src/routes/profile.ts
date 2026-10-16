// Route profil penonton: detail point, level, riwayat alert & mutasi point.
import type { FastifyInstance } from "fastify";
import type { ChatReader } from "../chat/reader.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import { buildProfile } from "../engine/profile.ts";

export function profileRoutes(
  app: FastifyInstance,
  deps: {
    reader: ChatReader;
    viewers: ViewersRepo;
    redemptions: RedemptionsRepo;
    settings: SettingsRepo;
  },
): void {
  app.get("/api/viewers/profile", async (req, reply) => {
    const q = req.query as { channelId?: string; name?: string };
    const host =
      deps.reader.getStatus().hostChannelId ?? deps.settings.get<string>("points.lastHostId", "");
    if (!host) return reply.code(400).send({ error: "belum ada host aktif" });

    const viewer = q.channelId
      ? deps.viewers.getByAuthor(host, q.channelId)
      : q.name
        ? deps.viewers.findByName(host, q.name)
        : undefined;
    if (!viewer) return reply.code(404).send({ error: "penonton tidak ditemukan" });

    return buildProfile(deps, host, viewer);
  });
}
