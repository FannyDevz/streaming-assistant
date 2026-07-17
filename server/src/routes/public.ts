// Route PUBLIK (di luar /api, tanpa auth) — untuk halaman leaderboard penonton.
import type { FastifyInstance } from "fastify";
import type { ChatReader } from "../chat/reader.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { RewardsRepo } from "../db/repo/rewards.ts";

export function publicRoutes(
  app: FastifyInstance,
  deps: {
    reader: ChatReader;
    viewers: ViewersRepo;
    redemptions: RedemptionsRepo;
    settings: SettingsRepo;
    rewards: RewardsRepo;
  },
): void {
  // Antrian request reward yang masih pending (untuk overlay request).
  app.get("/public/requests", async (req) => {
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 15);
    const limit = Math.min(Math.max(1, limitRaw || 15), 50);
    const rows = deps.rewards.listClaims("pending", limit);
    return {
      entries: rows.map((r) => ({
        id: r.id,
        reward: r.reward_name,
        name: r.display_name,
        message: r.message,
      })),
    };
  });

  // Goal bar (progress menuju target).
  app.get("/public/goal", async () => {
    const source = deps.settings.get<string>("goal.source", "points");
    let current = deps.settings.get<number>("goal.current", 0);
    if (source === "points") {
      const host = deps.reader.getStatus().hostChannelId;
      current = host ? deps.viewers.sumPoints(host) : 0;
    }
    return {
      enabled: deps.settings.get<boolean>("goal.enabled", false),
      label: deps.settings.get<string>("goal.label", "Target"),
      current,
      target: deps.settings.get<number>("goal.target", 1000),
    };
  });

  // Running text (teks bebas untuk overlay marquee).
  app.get("/public/runtext", async () => ({
    label: deps.settings.get<string>("runtext.label", "📢 INFO"),
    text: deps.settings.get<string>("runtext.text", ""),
  }));

  // Alert terbaru (untuk ticker overlay).
  app.get("/public/recent", async (req) => {
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 12);
    const limit = Math.min(Math.max(1, limitRaw || 12), 50);
    const rows = deps.redemptions.listByStatus(undefined, limit);
    return {
      entries: rows.map((r) => ({
        id: r.id,
        name: r.display_name,
        message: r.message,
        cost: r.cost,
        createdAt: r.created_at,
      })),
    };
  });

  app.get("/public/leaderboard", async (req) => {
    const status = deps.reader.getStatus();
    const host = status.hostChannelId;
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 20);
    const limit = Math.min(Math.max(1, limitRaw || 20), 100);

    const levels = deps.settings.get("levels", []);
    if (!host) {
      return { title: null, monitoring: false, total: 0, entries: [], levels };
    }
    return {
      title: status.title ?? null,
      monitoring: status.monitoring,
      total: deps.viewers.countForHost(host),
      entries: deps.viewers.leaderboard(host, limit),
      levels,
    };
  });
}
