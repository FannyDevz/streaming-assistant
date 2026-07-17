// Route giveaway: mulai (dengan kata syarat), lihat status, tarik pemenang.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GiveawayEngine } from "../engine/giveaway.ts";
import type { ChatReader } from "../chat/reader.ts";
import type { AlertQueue } from "../ws/queue.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { TemplatesRepo } from "../db/repo/templates.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { GiveawayWinnersRepo } from "../db/repo/giveawayWinners.ts";

const startSchema = z.object({
  keyword: z.string().min(1).max(40),
  reward: z.string().max(80).default(""),
});
const cleanName = (s: string) => String(s || "").replace(/^@+/, "");

export function giveawayRoutes(
  app: FastifyInstance,
  deps: {
    giveaway: GiveawayEngine;
    winners: GiveawayWinnersRepo;
    reader: ChatReader;
    queue: AlertQueue;
    redemptions: RedemptionsRepo;
    templates: TemplatesRepo;
    settings: SettingsRepo;
    onWinner?: (name: string, reward: string) => void;
  },
): void {
  app.get("/api/giveaway", async () => ({
    ...deps.giveaway.status(),
    entrants: deps.giveaway.list(),
  }));

  app.get("/api/giveaway/winners", async () => ({ entries: deps.winners.list(50) }));

  app.delete("/api/giveaway/winners/:id", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return { ok: deps.winners.remove(id) };
  });

  app.post("/api/giveaway/start", async (req, reply) => {
    const p = startSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "kata syarat wajib diisi" });
    deps.giveaway.start(p.data.keyword, p.data.reward);
    return deps.giveaway.status();
  });

  app.post("/api/giveaway/stop", async () => {
    deps.giveaway.stop();
    return deps.giveaway.status();
  });

  app.post("/api/giveaway/draw", async (_req, reply) => {
    const winner = deps.giveaway.draw(Math.random);
    if (!winner) return reply.code(409).send({ error: "belum ada peserta" });

    const reward = deps.giveaway.getReward();
    const now = Date.now();
    // Simpan pemenang (username + hadiah).
    deps.winners.add(cleanName(winner.name), reward, now);

    // Tampilkan pemenang sebagai alert + catat di riwayat.
    const host = deps.reader.getStatus().hostChannelId ?? "GIVEAWAY";
    const template = deps.templates.getDefault(deps.settings.get<number>("alert.defaultTemplateId", 1));
    const msg = reward
      ? `${cleanName(winner.name)} menang: ${reward}! 🎉`
      : `${cleanName(winner.name)} menang! 🎉`;
    const id = deps.redemptions.create({
      hostChannelId: host,
      authorChannelId: winner.authorChannelId,
      displayName: "🎡 GIVEAWAY",
      message: msg,
      cost: 0,
      templateId: template.id,
      now,
    });
    deps.queue.enqueue({ id, name: "🎡 GIVEAWAY", message: msg, template });
    deps.onWinner?.(cleanName(winner.name), reward);

    return { ok: true, winner: winner.name, reward, count: deps.giveaway.status().count };
  });
}
