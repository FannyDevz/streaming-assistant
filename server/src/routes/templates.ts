// Route template alert: list + CRUD + upload gambar/suara.
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TemplatesRepo } from "../db/repo/templates.ts";
import type { RewardsRepo } from "../db/repo/rewards.ts";
import { config } from "../config.ts";

const HEX = /^#[0-9a-fA-F]{6}$/;

const bodySchema = z.object({
  name: z.string().min(1).max(40),
  command: z.string().max(30).default(""),
  cost: z.number().int().min(0).max(1000000).default(0),
  durationMs: z.number().int().min(1000).max(120000),
  animation: z.enum(["slide", "pop", "fade"]),
  position: z.enum(["top", "center", "bottom"]),
  textColor: z.string().regex(HEX),
  bgColor: z.string().regex(HEX),
  ttsEnabled: z.boolean(),
  imagePath: z.string().max(200).nullable().optional(),
  gifPath: z.string().max(200).nullable().optional(),
  soundPath: z.string().max(200).nullable().optional(),
  youtubeUrl: z.string().max(300).nullable().optional(),
  youtubeStart: z.number().int().min(0).max(86400).optional(),
});

/** Ekstrak ID video (11 karakter) dari URL YouTube atau ID mentah. */
function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  const m =
    s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/|\/shorts\/)([A-Za-z0-9_-]{11})/) ??
    s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

function toInput(data: z.infer<typeof bodySchema>) {
  return {
    name: data.name,
    command: data.command.trim(),
    cost: data.cost,
    durationMs: data.durationMs,
    animation: data.animation,
    position: data.position,
    textColor: data.textColor,
    bgColor: data.bgColor,
    ttsEnabled: data.ttsEnabled,
    imagePath: data.imagePath ?? null,
    gifPath: data.gifPath ?? null,
    soundPath: data.soundPath ?? null,
    youtubeId: extractYoutubeId(data.youtubeUrl),
    youtubeStart: data.youtubeStart ?? 0,
  };
}

export function templateRoutes(
  app: FastifyInstance,
  deps: { templates: TemplatesRepo; rewards: RewardsRepo },
): void {
  // Cari command yang sama (case-insensitive) di template MAUPUN reward. Null bila aman.
  // Reward ikut dicek karena kedua pipeline jalan untuk pesan yang sama di index.ts —
  // command kembar berarti point penonton terpotong dua kali.
  function commandClash(command: string, exceptId: number | null) {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return null;
    const tpl = deps.templates
      .list()
      .find((t) => (t.command ?? "").trim().toLowerCase() === cmd && t.id !== exceptId);
    if (tpl) return { name: tpl.name, kind: "template" };
    const rw = deps.rewards.list().find((r) => r.command.trim().toLowerCase() === cmd);
    if (rw) return { name: rw.name, kind: "reward" };
    return null;
  }

  app.get("/api/templates", async () => ({ entries: deps.templates.list() }));

  app.post("/api/templates", async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }
    const input = toInput(parsed.data);
    const clash = commandClash(input.command, null);
    if (clash) {
      return reply
        .code(409)
        .send({ error: `Command "${input.command}" sudah dipakai ${clash.kind} "${clash.name}".` });
    }
    const id = deps.templates.create(input);
    return deps.templates.getById(id);
  });

  app.put("/api/templates/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "input tidak valid" });
    }
    const input = toInput(parsed.data);
    const clash = commandClash(input.command, id);
    if (clash) {
      return reply
        .code(409)
        .send({ error: `Command "${input.command}" sudah dipakai ${clash.kind} "${clash.name}".` });
    }
    if (!deps.templates.update(id, input)) {
      return reply.code(404).send({ error: "template tidak ditemukan" });
    }
    return deps.templates.getById(id);
  });

  app.delete("/api/templates/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (deps.templates.count() <= 1) {
      return reply.code(409).send({ error: "tidak bisa menghapus template terakhir" });
    }
    if (!deps.templates.remove(id)) {
      return reply.code(404).send({ error: "template tidak ditemukan" });
    }
    return { ok: true };
  });

  // Upload gambar / suara → simpan ke uploadDir, balikin nama file + url.
  app.post("/api/templates/upload", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "tidak ada file" });

    const mime = data.mimetype || "";
    const isImage = mime.startsWith("image/");
    const isAudio = mime.startsWith("audio/");
    if (!isImage && !isAudio) {
      return reply.code(415).send({ error: "hanya gambar atau audio yang diperbolehkan" });
    }

    const ext = (extname(data.filename || "") || (isImage ? ".png" : ".mp3")).slice(0, 8);
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const dest = join(config.uploadDir, filename);

    try {
      await pipeline(data.file, createWriteStream(dest));
    } catch (err) {
      await unlink(dest).catch(() => {});
      const msg = err instanceof Error ? err.message : "gagal menyimpan file";
      return reply.code(400).send({ error: msg });
    }

    // @fastify/multipart menandai file terpotong bila melebihi limit.
    if (data.file.truncated) {
      await unlink(dest).catch(() => {});
      return reply.code(413).send({ error: "file terlalu besar (maks 5 MB)" });
    }

    return { filename, url: `/uploads/${filename}`, kind: isImage ? "image" : "sound" };
  });
}
