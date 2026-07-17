// Route kontrol pemantauan live: start / stop / status.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChatReader } from "../chat/reader.ts";
import type { WsHub } from "../ws/hub.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

const startSchema = z.object({
  url: z.string().min(1, "url atau videoId wajib diisi"),
});

export function monitorRoutes(
  app: FastifyInstance,
  deps: {
    reader: ChatReader;
    hub: WsHub;
    viewers: ViewersRepo;
    settings: SettingsRepo;
    onStart?: (status: Awaited<ReturnType<ChatReader["start"]>>) => void;
    onStop?: () => void;
  },
): void {
  app.post("/api/monitor/start", async (req, reply) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }
    try {
      const status = await deps.reader.start(parsed.data.url);
      deps.onStart?.(status);

      // Mode "per streaming": reset point kalau ini video/stream BARU.
      const persistence = deps.settings.get<string>("points.persistence", "forever");
      const lastVideoId = deps.settings.get<string>("points.lastVideoId", "");
      if (
        persistence === "perStream" &&
        status.hostChannelId &&
        status.videoId &&
        status.videoId !== lastVideoId
      ) {
        const n = deps.viewers.resetHost(status.hostChannelId);
        app.log.info(`mode per-stream: reset ${n} penonton untuk stream baru`);
        deps.hub.broadcast({ type: "reset" });
      }
      if (status.videoId) deps.settings.set("points.lastVideoId", status.videoId);
      if (status.hostChannelId) deps.settings.set("points.lastHostId", status.hostChannelId);

      deps.hub.broadcast({ type: "status", data: status });
      app.log.info({ videoId: status.videoId, title: status.title }, "monitor started");
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "gagal memulai pemantauan";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/monitor/stop", async () => {
    deps.reader.stop();
    deps.onStop?.();
    const status = deps.reader.getStatus();
    deps.hub.broadcast({ type: "status", data: status });
    return status;
  });

  app.get("/api/monitor/status", async () => deps.reader.getStatus());
}
