// Route OBS WebSocket: status koneksi + connect/disconnect + daftar scene.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ObsClient } from "../obs/client.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

const connectSchema = z
  .object({ url: z.string().optional(), password: z.string().optional(), enabled: z.boolean().optional() })
  .optional();

export function obsRoutes(app: FastifyInstance, deps: { obs: ObsClient; settings: SettingsRepo }): void {
  app.get("/api/obs/status", async () => deps.obs.status());

  // Simpan setting koneksi (opsional) lalu sambungkan + ambil daftar scene.
  app.post("/api/obs/connect", async (req) => {
    const p = connectSchema.safeParse(req.body ?? {});
    if (p.success && p.data) {
      const patch: Record<string, unknown> = {};
      if (typeof p.data.url === "string") patch["obs.url"] = p.data.url;
      if (typeof p.data.password === "string") patch["obs.password"] = p.data.password;
      if (typeof p.data.enabled === "boolean") patch["obs.enabled"] = p.data.enabled;
      if (Object.keys(patch).length) {
        deps.settings.setMany(patch);
        deps.settings.reload();
      }
    }
    await deps.obs.disconnect();
    return deps.obs.connect();
  });

  app.post("/api/obs/disconnect", async () => {
    await deps.obs.disconnect();
    return deps.obs.status();
  });
}
