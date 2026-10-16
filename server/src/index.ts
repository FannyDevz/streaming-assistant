// Bootstrap server: Fastify + WebSocket + reader chat + route monitor.
import { mkdirSync, existsSync } from "node:fs";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import type { FastifyRequest } from "fastify";
import { config } from "./config.ts";
import { getDb, closeDb } from "./db/index.ts";
import { ChatReader } from "./chat/reader.ts";
import { WsHub } from "./ws/hub.ts";
import { AlertQueue } from "./ws/queue.ts";
import { SettingsRepo } from "./db/repo/settings.ts";
import { ViewersRepo } from "./db/repo/viewers.ts";
import { RedemptionsRepo } from "./db/repo/redemptions.ts";
import { TemplatesRepo } from "./db/repo/templates.ts";
import { RewardsRepo } from "./db/repo/rewards.ts";
import { GiveawayWinnersRepo } from "./db/repo/giveawayWinners.ts";
import { SoundsRepo } from "./db/repo/sounds.ts";
import { StatsRepo } from "./db/repo/stats.ts";
import { DiscordNotifier } from "./notify/discord.ts";
import { ObsClient } from "./obs/client.ts";
import { PointsEngine } from "./engine/points.ts";
import { CommandsEngine } from "./engine/commands.ts";
import { RewardsEngine } from "./engine/rewards.ts";
import { GiveawayEngine } from "./engine/giveaway.ts";
import { TriviaEngine } from "./engine/trivia.ts";
import { levelFor, type Level } from "./engine/levels.ts";
import { Auth, bearer } from "./auth.ts";
import { authRoutes } from "./routes/auth.ts";
import { monitorRoutes } from "./routes/monitor.ts";
import { pointsRoutes } from "./routes/points.ts";
import { nightbotRoutes } from "./routes/nightbot.ts";
import { alertRoutes } from "./routes/alerts.ts";
import { templateRoutes } from "./routes/templates.ts";
import { publicRoutes } from "./routes/public.ts";
import { configRoutes } from "./routes/config.ts";
import { rewardRoutes } from "./routes/rewards.ts";
import { gameRoutes } from "./routes/games.ts";
import { giveawayRoutes } from "./routes/giveaway.ts";
import { triviaRoutes } from "./routes/trivia.ts";
import { soundRoutes } from "./routes/sounds.ts";
import { statsRoutes } from "./routes/stats.ts";
import { profileRoutes } from "./routes/profile.ts";
import { discordRoutes } from "./routes/discord.ts";
import { obsRoutes } from "./routes/obs.ts";
import type { ClientEvent, WsRole } from "../../shared/types.ts";

const app = Fastify({
  logger: { transport: { target: "pino-pretty" } },
});

// DB harus siap sebelum auth (sesi disimpan di DB agar tahan restart).
const db = getDb();
const auth = new Auth(db, config.adminPassword);

// Guard: semua /api butuh token, KECUALI login.
// Overlay, /nb (Nightbot), /uploads, /ws, /health tetap publik.
app.addHook("onRequest", async (req, reply) => {
  const path = req.url.split("?")[0];
  if (!path.startsWith("/api/")) return;
  if (path === "/api/auth/login") return;
  if (!auth.valid(bearer(req.headers.authorization))) {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

// Terima body JSON kosong (POST tanpa body, mis. /stop) sebagai {} agar tidak 400.
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (_req, body, done) => {
    const text = body as string;
    if (!text || text.length === 0) return done(null, {});
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

const settings = new SettingsRepo(db);
const viewers = new ViewersRepo(db);
const redemptions = new RedemptionsRepo(db);
const templates = new TemplatesRepo(db);
const rewards = new RewardsRepo(db);
const giveawayWinners = new GiveawayWinnersRepo(db);
const sounds = new SoundsRepo(db);
const stats = new StatsRepo(db);
const discord = new DiscordNotifier(settings);
const obs = new ObsClient(settings);
let currentSessionId: number | null = stats.current()?.id ?? null;
const engine = new PointsEngine(viewers, settings);
const commands = new CommandsEngine(viewers, settings, redemptions, templates);
const rewardsEngine = new RewardsEngine(viewers, settings, rewards);
const giveaway = new GiveawayEngine();
const trivia = new TriviaEngine();

const hub = new WsHub();
const queue = new AlertQueue(
  (event) => hub.broadcast(event, "overlay"),
  () => hub.count("overlay") > 0,
  redemptions,
);
// OBS: ganti scene selama alert tampil.
queue.setHooks({ onStart: () => obs.onAlertStart(), onEnd: () => obs.onAlertEnd() });

// Helper: beri point ke penonton (buat viewer kalau belum ada).
function awardTo(host: string, author: string, name: string, pts: number, reason: string): void {
  if (pts <= 0) return;
  let v = viewers.getByAuthor(host, author);
  if (!v) {
    viewers.earn(host, author, name, 0, 0, Date.now());
    v = viewers.getByAuthor(host, author);
  }
  if (v) {
    const p = viewers.addPoints(v.id, pts, reason, Date.now());
    hub.broadcast({ type: "points", data: { authorChannelId: author, name, points: p } });
  }
}
// Helper: kirim alert khusus (SuperChat/member) ke overlay + riwayat.
function enqueueSpecialAlert(host: string, name: string, message: string): void {
  const template = templates.getDefault(settings.get<number>("alert.defaultTemplateId", 1));
  const id = redemptions.create({
    hostChannelId: host,
    authorChannelId: "SPECIAL",
    displayName: name,
    message,
    cost: 0,
    templateId: template.id,
    now: Date.now(),
  });
  queue.enqueue({ id, name, message, template });
}
const fillTpl = (t: string, v: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : `{${k}}`)).replace(/\s+/g, " ").trim();
const cleanNm = (s: string) => s.replace(/^@+/, "");

const reader = new ChatReader({
  onSuperChat: (e) => {
    const host = reader.getStatus().hostChannelId;
    if (!host || !settings.get<boolean>("superchat.enabled", true)) return;
    awardTo(host, e.authorChannelId, e.name, settings.get<number>("superchat.points", 0), "superchat");
    const msg = fillTpl(settings.get<string>("superchat.message", "💎 {name} SuperChat {amount}!"), {
      name: cleanNm(e.name),
      amount: e.amount,
      message: e.message,
    });
    enqueueSpecialAlert(host, e.name, msg);
    discord.superchat(cleanNm(e.name), e.amount, e.message);
    app.log.info(`💎 SuperChat ${e.name} ${e.amount}`);
  },
  onMember: (e) => {
    const host = reader.getStatus().hostChannelId;
    if (!host || !settings.get<boolean>("member.enabled", true)) return;
    awardTo(host, e.authorChannelId, e.name, settings.get<number>("member.points", 0), "member");
    const msg = fillTpl(settings.get<string>("member.message", "🌟 {name} jadi member baru! 🎉"), {
      name: cleanNm(e.name),
      level: e.level,
    });
    enqueueSpecialAlert(host, e.name, msg);
    app.log.info(`🌟 member baru ${e.name}`);
  },
  onMessage: (msg) => {
    const host = reader.getStatus().hostChannelId;
    if (currentSessionId != null) stats.bumpChats(currentSessionId);
    if (!host) {
      hub.broadcast({ type: "chat", data: msg });
      return;
    }

    // 1) Beri point (earn + bonus). Dibungkus try agar error config (mis. bonus
    //    command malformed) TIDAK menghentikan chat masuk ke overlay/dashboard.
    try {
      const update = engine.handle(host, msg);
      if (update) hub.broadcast({ type: "points", data: update });
    } catch (e) {
      app.log.error(`points engine error: ${e instanceof Error ? e.message : e}`);
    }

    // 2) Hitung level/badge lalu broadcast chat.
    try {
      const viewer = viewers.getByAuthor(host, msg.authorChannelId);
      if (viewer) {
        const lv = levelFor(viewer.total_earned, settings.get<Level[]>("levels", []));
        if (lv) msg.level = { name: lv.name, color: lv.color };
      }
    } catch {
      /* badge opsional — abaikan */
    }
    hub.broadcast({ type: "chat", data: msg });

    // 3) Reward store (Req Lagu, Hero, dll).
    const rw = rewardsEngine.handle(host, msg);
    if (rw.status === "ok") {
      hub.broadcast({
        type: "points",
        data: { authorChannelId: msg.authorChannelId, name: msg.name, points: rw.points },
      });
      app.log.info(`🎁 reward "${rw.reward.name}" dari ${rw.name}`);

      // Alert pop di overlay kalau reward mengaktifkan alert.
      if (rw.reward.alert) {
        const template = templates.getDefault(settings.get<number>("alert.defaultTemplateId", 1));
        const text = `🎁 ${rw.reward.name}` + (rw.message ? ` — ${rw.message}` : "");
        const alertId = redemptions.create({
          hostChannelId: host,
          authorChannelId: msg.authorChannelId,
          displayName: msg.name,
          message: text,
          cost: rw.reward.cost,
          templateId: template.id,
          now: Date.now(),
        });
        queue.enqueue({ id: alertId, name: msg.name, message: text, template });
      }
    }

    // 4) Command !alert. DILEWATI kalau pesan ini sudah diklaim reward di langkah 3:
    //    command kembar antara reward & template (bisa lolos lewat import config,
    //    yang menulis langsung ke repo tanpa cek bentrok) akan memotong point DUA KALI
    //    untuk satu pesan. Cek bentrok di route hanya menjaga pintu dashboard.
    if (rw.status === "notcommand") {
      const result = commands.handle(host, msg);
      if (result.status === "ok") {
        queue.enqueue(result.alert);
        hub.broadcast({
          type: "points",
          data: { authorChannelId: msg.authorChannelId, name: msg.name, points: result.points },
        });
        app.log.info(`🔔 alert dari ${result.name}: "${result.alert.message}"`);
      }
    }

    // 5) Giveaway: kumpulkan peserta.
    giveaway.feed(msg);

    // 6) Trivia: pemenang = jawaban benar pertama.
    const tw = trivia.feed(msg);
    if (tw) {
      const reward = trivia.getReward();
      if (reward > 0) awardTo(host, tw.authorChannelId, tw.name, reward, "trivia");
      const text = `🎯 ${cleanNm(tw.name)} benar!` + (reward > 0 ? ` +${reward} 🪙` : "");
      enqueueSpecialAlert(host, "🎯 KUIS", text);
      app.log.info(`🎯 trivia menang: ${tw.name} ("${tw.answer}")`);
    }
  },
  onError: (err) => app.log.error(`chat error: ${err.message}`),
  onEnd: (reason) => {
    app.log.warn(`stream berakhir: ${reason}`);
    hub.broadcast({ type: "status", data: reader.getStatus() });
  },
});

await app.register(websocket);
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Endpoint WebSocket untuk overlay & dashboard.
app.get("/ws", { websocket: true }, (socket, req: FastifyRequest) => {
  const url = new URL(req.url, "http://localhost");
  const roleParam = url.searchParams.get("role");
  const role: WsRole =
    roleParam === "overlay" ? "overlay" : roleParam === "chat" ? "chat" : "dashboard";
  const client = hub.add(socket, role);
  app.log.info(`ws connect: ${role} (total ${hub.count()})`);

  // Kirim status terkini begitu terhubung.
  socket.send(JSON.stringify({ type: "status", data: reader.getStatus() }));

  // Overlay baru konek → jalankan antrian yang mungkin tertahan.
  if (role === "overlay") queue.kick();

  socket.on("message", (raw: Buffer) => {
    let event: ClientEvent;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (event.type === "alert:shown") queue.ack(event.data.id);
    else if (event.type === "ready" && role === "overlay") queue.kick();
  });

  socket.on("close", () => {
    hub.remove(client);
    app.log.info(`ws disconnect: ${role} (sisa ${hub.count()})`);
  });
});

// Serve halaman overlay (OBS Browser Source) + folder upload.
mkdirSync(config.uploadDir, { recursive: true });
await app.register(fastifyStatic, {
  root: config.overlayDir,
  prefix: "/overlay/",
  redirect: true,
});
await app.register(fastifyStatic, {
  root: config.uploadDir,
  prefix: "/uploads/",
  decorateReply: false,
});
mkdirSync(config.publicDir, { recursive: true });
await app.register(fastifyStatic, {
  root: config.publicDir,
  prefix: "/leaderboard/",
  decorateReply: false,
  redirect: true,
});

// Produksi: sajikan dashboard (hasil build) di root supaya satu port saja.
// Saat dev, folder dist belum ada → dashboard dijalankan via Vite (:4301).
if (existsSync(config.dashboardDir)) {
  await app.register(fastifyStatic, {
    root: config.dashboardDir,
    prefix: "/",
    decorateReply: false,
  });
  // SPA fallback: rute non-API/aset → index.html (dashboard pakai hash routing).
  app.setNotFoundHandler((req, reply) => {
    const p = req.url.split("?")[0];
    if (req.method !== "GET" || p.startsWith("/api/") || p.startsWith("/ws")) {
      return reply.code(404).send({ error: "not found" });
    }
    return reply.sendFile("index.html", config.dashboardDir);
  });
  app.log.info("dashboard disajikan di / (mode produksi satu-port)");
}

authRoutes(app, { auth });
monitorRoutes(app, {
  reader,
  hub,
  viewers,
  settings,
  onStart: (status) => {
    engine.resetSession();
    currentSessionId = stats.startSession(
      status.hostChannelId ?? null,
      status.videoId ?? null,
      status.title ?? "",
      Date.now(),
    );
    discord.streamStart(status.title ?? "", status.videoId ?? null);
    if (settings.get<boolean>("obs.enabled", false)) void obs.connect();
  },
  onStop: () => {
    stats.endOpen(Date.now());
    currentSessionId = null;
  },
});
pointsRoutes(app, { reader, hub, viewers, settings });
nightbotRoutes(app, { reader, viewers, settings });
alertRoutes(app, { reader, queue, redemptions, templates, settings });
templateRoutes(app, { templates, rewards });
publicRoutes(app, { reader, viewers, redemptions, settings, rewards });
configRoutes(app, { settings, templates, rewards });
rewardRoutes(app, { rewards, viewers, templates });
gameRoutes(app, { reader, viewers, settings });
giveawayRoutes(app, {
  giveaway,
  winners: giveawayWinners,
  reader,
  queue,
  redemptions,
  templates,
  settings,
  onWinner: (name, reward) => discord.giveaway(name, reward),
});
soundRoutes(app, { sounds, hub });
triviaRoutes(app, { trivia });
statsRoutes(app, { stats });
profileRoutes(app, { reader, viewers, redemptions, settings });
discordRoutes(app, { discord });
obsRoutes(app, { obs, settings });

// Pulihkan antrian alert yang belum sempat tampil (mis. setelah restart).
for (const r of redemptions.getPending()) {
  const templateId = r.template_id ?? settings.get<number>("alert.defaultTemplateId", 1);
  const template = templates.getById(templateId) ?? templates.getDefault(1);
  queue.enqueue({ id: r.id, name: r.display_name, message: r.message, template });
}

// Sambungkan OBS di awal kalau diaktifkan (best-effort).
if (settings.get<boolean>("obs.enabled", false)) {
  void obs.connect().then((s) => {
    if (s.connected) app.log.info("OBS WebSocket tersambung");
    else app.log.warn(`OBS WebSocket gagal: ${s.error ?? "?"}`);
  });
}

app.get("/health", async () => ({ ok: true, monitoring: reader.getStatus().monitoring }));

async function shutdown() {
  app.log.info("shutting down...");
  reader.stop();
  await app.close();
  closeDb();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (config.usingDefaultPassword) {
  app.log.warn(
    "⚠️  ADMIN_PASSWORD belum di-set — memakai default 'admin'. Set di server/.env demi keamanan!",
  );
}

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
