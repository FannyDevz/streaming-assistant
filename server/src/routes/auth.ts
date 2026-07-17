// Route auth: login / check / logout.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Auth, bearer } from "../auth.ts";

const loginSchema = z.object({ password: z.string().min(1) });

export function authRoutes(app: FastifyInstance, deps: { auth: Auth }): void {
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "password wajib diisi" });

    const token = deps.auth.login(parsed.data.password);
    if (!token) return reply.code(401).send({ error: "password salah" });
    return { token };
  });

  // Endpoint ini dilewati guard hanya bila token valid (guard global),
  // jadi kalau sampai sini berarti sudah terautentikasi.
  app.get("/api/auth/check", async () => ({ ok: true }));

  app.post("/api/auth/logout", async (req) => {
    deps.auth.logout(bearer(req.headers.authorization));
    return { ok: true };
  });
}
