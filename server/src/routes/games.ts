// Mini-game via Nightbot $(urlfetch): coinflip & gamble (bisa nambah/ngurangi point).
import type { FastifyInstance } from "fastify";
import type { ChatReader } from "../chat/reader.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

const clean = (s: string) => "@" + String(s || "").replace(/^@+/, "");
function fill(t: string, v: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));
}
function qstr(query: unknown, ...keys: string[]): string {
  const q = (query ?? {}) as Record<string, string>;
  for (const k of keys) if (q[k]) return q[k];
  return "";
}

export function gameRoutes(
  app: FastifyInstance,
  deps: { reader: ChatReader; viewers: ViewersRepo; settings: SettingsRepo },
): void {
  function play(kind: "coinflip" | "gamble", req: { query: unknown }, reply: { type: (s: string) => void }): string {
    reply.type("text/plain; charset=utf-8");
    const s = deps.settings;
    if (!s.get<boolean>("game.enabled", true)) return "Mini-game sedang nonaktif.";

    const name = qstr(req.query, "u", "user").trim();
    const amount = Math.floor(Number(qstr(req.query, "amount", "bet", "1")) || 0);
    const host = deps.reader.getStatus().hostChannelId;
    if (!host || !name) return `${clean(name || "kamu")} belum bisa main sekarang.`;

    const viewer = deps.viewers.findByName(host, name);
    if (!viewer) return `${clean(name)} belum punya point, komen dulu ya!`;

    const minBet = s.get<number>("game.minBet", 5);
    const maxBet = s.get<number>("game.maxBet", 1000);
    if (amount < minBet) return `${clean(viewer.display_name)} taruhan minimal ${minBet} 🪙.`;
    const bet = Math.min(amount, maxBet);
    if (viewer.points < bet) return `${clean(viewer.display_name)} point kurang (punya ${viewer.points}).`;

    const winChance =
      kind === "coinflip"
        ? s.get<number>("game.coinflip.winChance", 0.5)
        : s.get<number>("game.gamble.winChance", 0.35);
    const now = Date.now();

    if (Math.random() < winChance) {
      const payout = kind === "gamble" ? s.get<number>("game.gamble.payout", 2) : 1;
      const delta = Math.max(1, Math.round(bet * payout));
      const points = deps.viewers.addPoints(viewer.id, delta, "game-win", now);
      return fill(s.get<string>("game.winReply", "@{name} MENANG {game} 🎉 +{delta} 🪙 (sisa {points})"), {
        name: clean(viewer.display_name).slice(1),
        game: kind,
        delta,
        bet,
        points,
      });
    }
    const points = deps.viewers.addPoints(viewer.id, -bet, "game-lose", now);
    return fill(s.get<string>("game.loseReply", "@{name} kalah {game} 😢 -{bet} 🪙 (sisa {points})"), {
      name: clean(viewer.display_name).slice(1),
      game: kind,
      bet,
      points,
    });
  }

  app.get("/nb/coinflip", async (req, reply) => play("coinflip", req, reply));
  app.get("/nb/gamble", async (req, reply) => play("gamble", req, reply));
}
