// Deteksi & proses command `!alert <pesan>`: validasi, potong point,
// buat redemption, dan hasilkan AlertPayload untuk dikirim ke overlay.
import type { AlertPayload, ChatMessage } from "../../../shared/types.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { TemplatesRepo } from "../db/repo/templates.ts";
import { moderate } from "./moderation.ts";

export type AlertResult =
  | { status: "notcommand" }
  | { status: "empty" | "toolong" | "badword" | "insufficient" | "cooldown"; name: string }
  | { status: "ok"; alert: AlertPayload; points: number; name: string };

export class CommandsEngine {
  constructor(
    private readonly viewers: ViewersRepo,
    private readonly settings: SettingsRepo,
    private readonly redemptions: RedemptionsRepo,
    private readonly templates: TemplatesRepo,
  ) {}

  handle(host: string, msg: ChatMessage): AlertResult {
    // Alert dijeda (tombol Hide/Pause) → abaikan command, point tak terpotong.
    if (this.settings.get<boolean>("alert.paused", false)) return { status: "notcommand" };

    const raw = msg.text.trim();
    const lower = raw.toLowerCase();

    // Cari template yang command-nya cocok (biaya point ikut template → video bisa beda harga).
    const template = this.templates.list().find((t) => {
      const cmd = (t.command ?? "").trim().toLowerCase();
      return cmd.length > 0 && (lower === cmd || lower.startsWith(cmd + " "));
    });
    if (!template) return { status: "notcommand" };

    const message = raw.slice(template.command.length).trim();
    const maxLen = this.settings.get<number>("alert.maxLen", 100);
    const badWords = this.settings.get<string[]>("alert.badWords", []);

    const mod = moderate(message, { maxLen, badWords });
    if (!mod.ok) return { status: mod.reason, name: msg.name };

    const viewer = this.viewers.getByAuthor(host, msg.authorChannelId);
    if (!viewer) return { status: "insufficient", name: msg.name };

    const cost = template.cost ?? 0;
    const cooldownMs = this.settings.get<number>("alert.cooldownSec", 300) * 1000;
    const now = Date.now();

    if (viewer.points < cost) return { status: "insufficient", name: msg.name };
    if (viewer.last_alert_at != null && now - viewer.last_alert_at < cooldownMs) {
      return { status: "cooldown", name: msg.name };
    }

    // Lolos semua: potong point (sesuai biaya template), catat redemption, siapkan payload.
    const points = this.viewers.spendForAlert(viewer.id, cost, now);
    const id = this.redemptions.create({
      hostChannelId: host,
      authorChannelId: msg.authorChannelId,
      displayName: msg.name,
      message,
      cost,
      templateId: template.id,
      now,
    });

    return {
      status: "ok",
      name: msg.name,
      points,
      alert: { id, name: msg.name, message, template },
    };
  }
}
