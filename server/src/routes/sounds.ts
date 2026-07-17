// Route soundboard: kelola sound + putar ke overlay.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SoundsRepo } from "../db/repo/sounds.ts";
import type { WsHub } from "../ws/hub.ts";

const bodySchema = z.object({
  name: z.string().min(1).max(40),
  path: z.string().min(1).max(200),
  imagePath: z.string().max(200).optional().nullable(),
});

export function soundRoutes(
  app: FastifyInstance,
  deps: { sounds: SoundsRepo; hub: WsHub },
): void {
  app.get("/api/sounds", async () => ({ entries: deps.sounds.list() }));

  app.post("/api/sounds", async (req, reply) => {
    const p = bodySchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? "input tidak valid" });
    const id = deps.sounds.create(p.data.name, p.data.path, p.data.imagePath ?? null);
    return { ok: true, id };
  });

  app.delete("/api/sounds/:id", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return { ok: deps.sounds.remove(id) };
  });

  // Hentikan semua sound + sembunyikan GIF di overlay (anti audio kepanjangan).
  app.post("/api/sounds/stop", async () => {
    deps.hub.broadcast({ type: "soundStop" }, "overlay");
    return { ok: true, overlays: deps.hub.count("overlay") };
  });

  // Putar sound di overlay (Browser Source alert).
  app.post("/api/sounds/:id/play", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const s = deps.sounds.getForPlay(id);
    if (!s) return reply.code(404).send({ error: "sound tidak ditemukan" });
    deps.hub.broadcast({ type: "sound", data: { url: s.url, imageUrl: s.imageUrl } }, "overlay");
    return { ok: true, overlays: deps.hub.count("overlay") };
  });
}
