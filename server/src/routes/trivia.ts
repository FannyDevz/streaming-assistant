// Route kuis (trivia): mulai soal, hentikan, lihat status. Pemenang ditentukan
// real-time dari chat (lihat wiring di index.ts).
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TriviaEngine } from "../engine/trivia.ts";

const startSchema = z.object({
  question: z.string().min(1, "soal wajib diisi").max(200),
  answer: z.string().min(1, "jawaban wajib diisi").max(120),
  reward: z.number().int().min(0).max(100000).default(0),
});

export function triviaRoutes(app: FastifyInstance, deps: { trivia: TriviaEngine }): void {
  app.get("/api/trivia", async () => deps.trivia.status());

  app.post("/api/trivia/start", async (req, reply) => {
    const p = startSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? "input tidak valid" });
    deps.trivia.start(p.data.question, p.data.answer, p.data.reward);
    return deps.trivia.status();
  });

  app.post("/api/trivia/stop", async () => {
    deps.trivia.stop();
    return deps.trivia.status();
  });
}
