// Kuis live: host mulai soal, penonton jawab di chat, yang benar PERTAMA menang.
import type { ChatMessage } from "../../../shared/types.ts";

export interface TriviaStatus {
  active: boolean;
  question: string;
  reward: number;
  answered: number; // jumlah pesan masuk selama soal aktif
  winner: { authorChannelId: string; name: string; answer: string } | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "") // buang tanda baca
    .replace(/\s+/g, " ")
    .trim();

export class TriviaEngine {
  private active = false;
  private question = "";
  private answers: string[] = []; // jawaban diterima (sudah dinormalisasi)
  private reward = 0;
  private answered = 0;
  private winner: TriviaStatus["winner"] = null;

  /** Mulai soal. Jawaban bisa beberapa, dipisah "|" atau ",". */
  start(question: string, answer: string, reward = 0): void {
    this.active = true;
    this.question = question.trim();
    this.answers = answer
      .split(/[|,]/)
      .map((a) => norm(a))
      .filter(Boolean);
    this.reward = Math.max(0, Math.floor(reward));
    this.answered = 0;
    this.winner = null;
  }

  stop(): void {
    this.active = false;
  }

  /** Proses pesan chat. Kembalikan pemenang bila ini jawaban benar pertama. */
  feed(msg: ChatMessage): TriviaStatus["winner"] {
    if (!this.active || this.winner || this.answers.length === 0) return null;
    this.answered += 1;
    const text = norm(msg.text);
    if (!text) return null;
    // Cocok bila jawaban muncul sebagai kata/frasa UTUH (batas spasi), bukan
    // potongan kata — kalau tidak, jawaban pendek seperti "ok" ikut menang dari
    // pesan "oke juga", dan "5" menang dari "525".
    const padded = ` ${text} `;
    const hit = this.answers.some((a) => padded.includes(` ${a} `));
    if (hit) {
      this.winner = { authorChannelId: msg.authorChannelId, name: msg.name, answer: msg.text.trim() };
      this.active = false; // soal selesai begitu ada pemenang
      return this.winner;
    }
    return null;
  }

  getReward(): number {
    return this.reward;
  }
  getQuestion(): string {
    return this.question;
  }

  status(): TriviaStatus {
    return {
      active: this.active,
      question: this.question,
      reward: this.reward,
      answered: this.answered,
      winner: this.winner,
    };
  }
}
