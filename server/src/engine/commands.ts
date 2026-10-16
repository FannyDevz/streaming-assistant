// Deteksi & proses command `!alert <pesan>`: validasi, potong point,
// buat redemption, dan hasilkan AlertPayload untuk dikirim ke overlay.
import type { AlertPayload, AlertTemplate, ChatMessage } from "../../../shared/types.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { TemplatesRepo } from "../db/repo/templates.ts";
import { moderate } from "./moderation.ts";

/** Hasil penukaran point jadi alert, lepas dari asalnya (chat atau web). */
export type RedeemResult =
  | {
      status: "empty" | "toolong" | "badword" | "insufficient" | "cooldown" | "paused";
      name: string;
    }
  | { status: "ok"; alert: AlertPayload; points: number; name: string };

export type AlertResult = { status: "notcommand" } | RedeemResult;

export class CommandsEngine {
  constructor(
    private readonly viewers: ViewersRepo,
    private readonly settings: SettingsRepo,
    private readonly redemptions: RedemptionsRepo,
    private readonly templates: TemplatesRepo,
  ) {}

  handle(host: string, msg: ChatMessage): AlertResult {
    const raw = msg.text.trim();
    const lower = raw.toLowerCase();

    // Cari template yang command-nya cocok (biaya point ikut template → video bisa beda harga).
    const template = this.templates.list().find((t) => {
      const cmd = (t.command ?? "").trim().toLowerCase();
      return cmd.length > 0 && (lower === cmd || lower.startsWith(cmd + " "));
    });
    if (!template) return { status: "notcommand" };

    const message = raw.slice(template.command.length).trim();
    return this.redeemTemplate(host, msg.authorChannelId, msg.name, template, message);
  }

  /**
   * Validasi + potong point + catat redemption untuk satu template.
   *
   * Sengaja tidak tahu-menahu soal chat (dipanggil oleh handle di atas). Semua aturan
   * biaya, cooldown, dan moderasi hidup DI SINI saja supaya jalur lain yang ditambah
   * nanti mustahil menyimpang.
   */
  redeemTemplate(
    host: string,
    authorChannelId: string,
    name: string,
    template: AlertTemplate,
    message: string,
  ): RedeemResult {
    // Alert dijeda (tombol Jeda) → tolak, point tak terpotong.
    if (this.settings.get<boolean>("alert.paused", false)) return { status: "paused", name };

    const maxLen = this.settings.get<number>("alert.maxLen", 100);
    const badWords = this.settings.get<string[]>("alert.badWords", []);

    const mod = moderate(message, { maxLen, badWords });
    if (!mod.ok) return { status: mod.reason, name };

    const viewer = this.viewers.getByAuthor(host, authorChannelId);
    if (!viewer) return { status: "insufficient", name };

    const cost = template.cost ?? 0;
    const cooldownMs = this.settings.get<number>("alert.cooldownSec", 300) * 1000;
    const now = Date.now();

    if (viewer.points < cost) return { status: "insufficient", name };
    if (viewer.last_alert_at != null && now - viewer.last_alert_at < cooldownMs) {
      return { status: "cooldown", name };
    }

    // Lolos semua: potong point (sesuai biaya template), catat redemption, siapkan payload.
    const points = this.viewers.spendForAlert(viewer.id, cost, now);
    const id = this.redemptions.create({
      hostChannelId: host,
      authorChannelId,
      displayName: name,
      message,
      cost,
      templateId: template.id,
      now,
    });

    return { status: "ok", name, points, alert: { id, name, message, template } };
  }
}
