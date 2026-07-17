// Route Discord: kirim pesan test ke webhook.
import type { FastifyInstance } from "fastify";
import type { DiscordNotifier } from "../notify/discord.ts";

export function discordRoutes(app: FastifyInstance, deps: { discord: DiscordNotifier }): void {
  app.post("/api/discord/test", async (_req, reply) => {
    const r = await deps.discord.send({
      title: "✅ Test Webhook",
      description: "Koneksi Discord berhasil! Notifikasi akan tampil di channel ini.",
      color: 0x22c55e,
    });
    if (!r.ok) return reply.code(400).send({ error: r.error ?? "gagal kirim" });
    return { ok: true };
  });
}
