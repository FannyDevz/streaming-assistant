// Route reward store: CRUD reward + antrian klaim (Selesai / Batal+refund).
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RewardsRepo } from "../db/repo/rewards.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { TemplatesRepo } from "../db/repo/templates.ts";

const bodySchema = z.object({
  name: z.string().min(1).max(40),
  command: z.string().min(1).max(30),
  cost: z.number().int().min(0).max(1000000),
  prompt: z.string().max(120).default(""),
  enabled: z.boolean().default(true),
  alert: z.boolean().default(true),
});

export function rewardRoutes(
  app: FastifyInstance,
  deps: { rewards: RewardsRepo; viewers: ViewersRepo; templates: TemplatesRepo },
): void {
  // Template alert ikut dicek: kalau command kembar, pipeline reward DAN pipeline
  // !alert di index.ts sama-sama jalan untuk satu pesan → point terpotong dua kali.
  function clash(command: string, exceptId: number | null) {
    const c = command.trim().toLowerCase();
    if (!c) return null;
    const rw = deps.rewards.list().find((r) => r.command.trim().toLowerCase() === c && r.id !== exceptId);
    if (rw) return { name: rw.name, kind: "reward" };
    const tpl = deps.templates.list().find((t) => (t.command ?? "").trim().toLowerCase() === c);
    if (tpl) return { name: tpl.name, kind: "template" };
    return null;
  }

  app.get("/api/rewards", async () => ({ entries: deps.rewards.list() }));

  app.post("/api/rewards", async (req, reply) => {
    const p = bodySchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? "input tidak valid" });
    const c = clash(p.data.command, null);
    if (c) return reply.code(409).send({ error: `Command "${p.data.command}" sudah dipakai ${c.kind} "${c.name}".` });
    const id = deps.rewards.create(p.data);
    return deps.rewards.getById(id);
  });

  app.put("/api/rewards/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const p = bodySchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? "input tidak valid" });
    const c = clash(p.data.command, id);
    if (c) return reply.code(409).send({ error: `Command "${p.data.command}" sudah dipakai ${c.kind} "${c.name}".` });
    if (!deps.rewards.update(id, p.data)) return reply.code(404).send({ error: "reward tidak ditemukan" });
    return deps.rewards.getById(id);
  });

  app.delete("/api/rewards/:id", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return { ok: deps.rewards.remove(id) };
  });

  // ---- Antrian klaim ----
  app.get("/api/rewards/claims", async (req) => {
    const q = req.query as { status?: string; limit?: string };
    const limit = Math.min(Math.max(1, Number(q.limit ?? 50) || 50), 200);
    return { entries: deps.rewards.listClaims(q.status, limit) };
  });

  // Tambah request manual (tanpa potong point).
  const manualSchema = z.object({
    rewardName: z.string().min(1).max(40),
    name: z.string().min(1).max(60),
    message: z.string().max(200).default(""),
  });
  app.post("/api/rewards/claims", async (req, reply) => {
    const p = manualSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? "input tidak valid" });
    const id = deps.rewards.createClaim({
      rewardId: 0,
      rewardName: p.data.rewardName,
      host: "MANUAL",
      author: "MANUAL",
      name: p.data.name,
      message: p.data.message,
      cost: 0,
      now: Date.now(),
    });
    return { ok: true, id };
  });

  // Hapus request dari antrian (tanpa refund).
  app.delete("/api/rewards/claims/:id", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return { ok: deps.rewards.deleteClaim(id) };
  });

  app.post("/api/rewards/claims/:id/done", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!deps.rewards.setClaimStatus(id, "done", Date.now())) {
      return reply.code(404).send({ error: "klaim tidak ditemukan" });
    }
    return { ok: true };
  });

  // Batalkan klaim + kembalikan point ke penonton.
  app.post("/api/rewards/claims/:id/cancel", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const claim = deps.rewards.getClaim(id);
    if (!claim) return reply.code(404).send({ error: "klaim tidak ditemukan" });
    if (claim.status === "pending") {
      const viewer = deps.viewers.getByAuthor(claim.host_channel_id, claim.author_channel_id);
      if (viewer) deps.viewers.addPoints(viewer.id, claim.cost, "reward-refund", Date.now());
    }
    deps.rewards.setClaimStatus(id, "canceled", Date.now());
    return { ok: true, refunded: claim.status === "pending" ? claim.cost : 0 };
  });
}
