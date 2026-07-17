// Backup / restore konfigurasi: export & import settings + template ke/dari JSON.
import type { FastifyInstance } from "fastify";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { TemplatesRepo, TemplateInput } from "../db/repo/templates.ts";
import type { RewardsRepo, RewardInput } from "../db/repo/rewards.ts";

function toInput(t: Record<string, unknown>): TemplateInput {
  const s = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const n = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    name: s(t.name, "Alert"),
    command: s(t.command, ""),
    cost: n(t.cost, 0),
    durationMs: n(t.durationMs, 6000),
    animation: s(t.animation, "slide"),
    position: s(t.position, "top"),
    textColor: s(t.textColor, "#000000"),
    bgColor: s(t.bgColor, "#ffde00"),
    ttsEnabled: b(t.ttsEnabled, true),
    imagePath: (t.imagePath as string) ?? null,
    gifPath: (t.gifPath as string) ?? null,
    soundPath: (t.soundPath as string) ?? null,
    youtubeId: (t.youtubeId as string) ?? null,
    youtubeStart: n(t.youtubeStart, 0),
  };
}

function toRewardInput(r: Record<string, unknown>): RewardInput {
  const s = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const n = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    name: s(r.name, "Reward"),
    command: s(r.command, ""),
    cost: n(r.cost, 100),
    prompt: s(r.prompt, ""),
    enabled: b(r.enabled, true),
    alert: b(r.alert, true),
  };
}

export function configRoutes(
  app: FastifyInstance,
  deps: { settings: SettingsRepo; templates: TemplatesRepo; rewards: RewardsRepo },
): void {
  app.get("/api/config/export", async () => {
    // "alert" = template alert; "overlay" & aturan lain semuanya ada di settings.
    const templates = deps.templates.list().map((t) => ({
      name: t.name,
      command: t.command,
      cost: t.cost,
      durationMs: t.durationMs,
      animation: t.animation,
      position: t.position,
      textColor: t.textColor,
      bgColor: t.bgColor,
      ttsEnabled: t.ttsEnabled,
      imagePath: t.imageUrl ? t.imageUrl.replace("/uploads/", "") : null,
      gifPath: t.gifUrl ? t.gifUrl.replace("/uploads/", "") : null,
      soundPath: t.soundUrl ? t.soundUrl.replace("/uploads/", "") : null,
      youtubeId: t.youtubeId ?? null,
      youtubeStart: t.youtubeStart ?? 0,
    }));
    const rewards = deps.rewards.list().map((r) => ({
      name: r.name,
      command: r.command,
      cost: r.cost,
      prompt: r.prompt,
      enabled: r.enabled,
      alert: r.alert,
    }));
    return { app: "streaming-assistant", version: 2, settings: deps.settings.getAll(), templates, rewards };
  });

  app.post("/api/config/import", async (req, reply) => {
    const body = req.body as {
      settings?: Record<string, unknown>;
      templates?: Record<string, unknown>[];
      rewards?: Record<string, unknown>[];
    };
    if (!body || typeof body !== "object") {
      return reply.code(400).send({ error: "format config tidak valid" });
    }

    if (body.settings && typeof body.settings === "object") {
      deps.settings.setMany(body.settings);
    }
    let importedTemplates = 0;
    if (Array.isArray(body.templates) && body.templates.length > 0) {
      deps.templates.deleteAll();
      for (const t of body.templates) {
        deps.templates.create(toInput(t));
        importedTemplates += 1;
      }
    }
    let importedRewards = 0;
    if (Array.isArray(body.rewards)) {
      deps.rewards.deleteAll();
      for (const r of body.rewards) {
        deps.rewards.create(toRewardInput(r));
        importedRewards += 1;
      }
    }
    deps.settings.reload();
    return { ok: true, importedTemplates, importedRewards };
  });
}
