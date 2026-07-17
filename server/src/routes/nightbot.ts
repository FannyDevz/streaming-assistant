// Endpoint untuk Nightbot $(urlfetch): balasan PLAIN TEXT yang langsung
// ditempel Nightbot ke live chat. Matching penonton berdasarkan nama.
import type { FastifyInstance } from "fastify";
import type { ChatReader } from "../chat/reader.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

/** Ambil nama user dari query (`u` atau `user`). */
function getUser(query: unknown): string {
  const q = (query ?? {}) as Record<string, string>;
  return (q.u ?? q.user ?? "").trim();
}

/** Buang '@' di depan supaya template `@{name}` tidak jadi dobel '@'. */
function cleanName(name: string): string {
  return name.replace(/^@+/, "");
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function nightbotRoutes(
  app: FastifyInstance,
  deps: { reader: ChatReader; viewers: ViewersRepo; settings: SettingsRepo },
): void {
  app.get("/nb/points", async (req, reply) => {
    reply.type("text/plain; charset=utf-8");
    const name = getUser(req.query);
    const host = deps.reader.getStatus().hostChannelId;
    const notFound = deps.settings.get<string>(
      "nightbot.notFoundReply",
      "@{name} belum punya point.",
    );
    if (!host || !name) return fill(notFound, { name: cleanName(name) || "kamu" });

    const viewer = deps.viewers.findByName(host, name);
    if (!viewer) return fill(notFound, { name: cleanName(name) });

    const reply1 = deps.settings.get<string>(
      "nightbot.pointsReply",
      "@{name} point kamu: {points} 🪙",
    );
    return fill(reply1, { name: cleanName(viewer.display_name), points: viewer.points });
  });

  app.get("/nb/rank", async (req, reply) => {
    reply.type("text/plain; charset=utf-8");
    const name = getUser(req.query);
    const host = deps.reader.getStatus().hostChannelId;
    const notFound = deps.settings.get<string>(
      "nightbot.notFoundReply",
      "@{name} belum punya point.",
    );
    if (!host || !name) return fill(notFound, { name: cleanName(name) || "kamu" });

    const viewer = deps.viewers.findByName(host, name);
    if (!viewer) return fill(notFound, { name: cleanName(name) });

    const rank = deps.viewers.rankOf(host, viewer.points);
    const total = deps.viewers.countForHost(host);
    const tmpl = deps.settings.get<string>(
      "nightbot.rankReply",
      "@{name} peringkat #{rank} dari {total} ({points} 🪙)",
    );
    return fill(tmpl, {
      name: cleanName(viewer.display_name),
      rank,
      total,
      points: viewer.points,
    });
  });
}
