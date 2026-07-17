// Route alert: kirim alert percobaan ke overlay + lihat log redemption.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChatReader } from "../chat/reader.ts";
import type { AlertQueue } from "../ws/queue.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { TemplatesRepo } from "../db/repo/templates.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

const testSchema = z.object({
  name: z.string().min(1).max(60).default("Test User"),
  message: z.string().min(1).max(200).default("Ini alert percobaan! 🎉"),
  templateId: z.number().int().optional(),
});

export function alertRoutes(
  app: FastifyInstance,
  deps: {
    reader: ChatReader;
    queue: AlertQueue;
    redemptions: RedemptionsRepo;
    templates: TemplatesRepo;
    settings: SettingsRepo;
  },
): void {
  app.post("/api/alerts/test", async (req, reply) => {
    const parsed = testSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }
    const { name, message, templateId } = parsed.data;

    const defaultTemplateId = deps.settings.get<number>("alert.defaultTemplateId", 1);
    const template =
      (templateId != null ? deps.templates.getById(templateId) : undefined) ??
      deps.templates.getDefault(defaultTemplateId);

    const host = deps.reader.getStatus().hostChannelId ?? "TEST";
    const id = deps.redemptions.create({
      hostChannelId: host,
      authorChannelId: "TEST",
      displayName: name,
      message,
      cost: 0,
      templateId: template.id,
      now: Date.now(),
    });

    deps.queue.enqueue({ id, name, message, template });
    return { ok: true, id, queued: deps.queue.size() };
  });

  // Sembunyikan alert yang sedang tampil + kosongkan antrian (anti pesan iseng).
  app.post("/api/alerts/skip", async () => {
    const skipped = deps.queue.skipActive();
    deps.queue.clearPending();
    return { ok: true, skipped };
  });

  app.get("/api/redemptions", async (req) => {
    const q = req.query as { status?: string; limit?: string };
    const limit = Math.min(Math.max(1, Number(q.limit ?? 50) || 50), 200);
    return { entries: deps.redemptions.listByStatus(q.status, limit) };
  });

  // Export seluruh riwayat alert ke JSON.
  app.get("/api/redemptions/export", async () => ({
    app: "streaming-assistant",
    kind: "alert-history",
    version: 1,
    exportedAt: Date.now(),
    entries: deps.redemptions.listAll(),
  }));

  // Import riwayat alert dari JSON (ditambahkan, tidak menimpa).
  app.post("/api/redemptions/import", async (req, reply) => {
    const body = req.body as { entries?: unknown };
    const entries = Array.isArray(body?.entries) ? body.entries : Array.isArray(body) ? body : null;
    if (!entries) return reply.code(400).send({ error: "format riwayat tidak valid" });
    const imported = deps.redemptions.importMany(entries as Record<string, unknown>[]);
    return { ok: true, imported };
  });

  // Kosongkan seluruh riwayat alert.
  app.delete("/api/redemptions", async () => {
    const cleared = deps.redemptions.clearAll();
    return { ok: true, cleared };
  });

  // Tampilkan ulang alert dari riwayat.
  app.post("/api/redemptions/:id/replay", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const r = deps.redemptions.getById(id);
    if (!r) return reply.code(404).send({ error: "riwayat tidak ditemukan" });

    const defaultTemplateId = deps.settings.get<number>("alert.defaultTemplateId", 1);
    const template =
      (r.template_id != null ? deps.templates.getById(r.template_id) : undefined) ??
      deps.templates.getDefault(defaultTemplateId);

    deps.queue.enqueue({ id: r.id, name: r.display_name, message: r.message, template });
    return { ok: true, queued: deps.queue.size() };
  });
}
