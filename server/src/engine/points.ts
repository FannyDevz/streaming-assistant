// Logika point: beri point per komentar (dengan cooldown) + bonus command.
import type { ChatMessage } from "../../../shared/types.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";

interface BonusCommand {
  trigger: string;
  points: number;
  oncePerStream?: boolean;
}

export interface PointsUpdate {
  authorChannelId: string;
  name: string;
  points: number;
}

export class PointsEngine {
  /** Penanda bonus oncePerStream yang sudah dipakai: `${authorChannelId}|${trigger}`. */
  private bonusUsed = new Set<string>();

  constructor(
    private readonly viewers: ViewersRepo,
    private readonly settings: SettingsRepo,
  ) {}

  /** Reset penanda bonus saat mulai memantau stream baru. */
  resetSession(): void {
    this.bonusUsed.clear();
  }

  /**
   * Proses satu pesan. Return update point kalau saldo berubah, selain itu null.
   */
  handle(host: string, msg: ChatMessage): PointsUpdate | null {
    const now = Date.now();
    const amount = this.settings.get<number>("earn.amount", 1);
    const cooldownMs = this.settings.get<number>("earn.cooldownSec", 60) * 1000;

    const res = this.viewers.earn(
      host,
      msg.authorChannelId,
      msg.name,
      amount,
      cooldownMs,
      now,
    );
    let points = res.points;
    let changed = res.earned;

    // Bonus command (mis. "!hadir" +5 sekali per stream).
    // Tahan config malformed: entri tanpa trigger/points valid dilewati (jangan sampai
    // melempar error dan menghentikan pemrosesan pesan chat).
    const raw = this.settings.get<BonusCommand[]>("earn.bonusCommands", []);
    const bonuses = Array.isArray(raw) ? raw : [];
    const text = msg.text.trim().toLowerCase();
    for (const bonus of bonuses) {
      if (!bonus || typeof bonus.trigger !== "string" || bonus.trigger.trim() === "") continue;
      const pts = Number(bonus.points);
      if (!Number.isFinite(pts) || pts === 0) continue;

      const trigger = bonus.trigger.toLowerCase();
      if (text !== trigger && !text.startsWith(trigger + " ")) continue;

      const key = `${msg.authorChannelId}|${trigger}`;
      if (bonus.oncePerStream && this.bonusUsed.has(key)) continue;

      points = this.viewers.addPoints(res.id, pts, "bonus", now);
      if (bonus.oncePerStream) this.bonusUsed.add(key);
      changed = true;
    }

    if (!changed) return null;
    return { authorChannelId: msg.authorChannelId, name: msg.name, points };
  }
}
