// Deteksi command reward store (Req Lagu, Hero, dll) → potong point, masuk antrian.
import type { ChatMessage } from "../../../shared/types.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { RewardsRepo, Reward } from "../db/repo/rewards.ts";

/** Hasil klaim reward, lepas dari asalnya (chat atau web). */
export type ClaimResult =
  | { status: "toolong" | "insufficient" | "disabled"; name: string }
  | { status: "ok"; name: string; points: number; reward: Reward; claimId: number; message: string };

export type RewardResult = { status: "notcommand" } | ClaimResult;

export class RewardsEngine {
  constructor(
    private readonly viewers: ViewersRepo,
    private readonly settings: SettingsRepo,
    private readonly rewards: RewardsRepo,
  ) {}

  handle(host: string, msg: ChatMessage): RewardResult {
    const raw = msg.text.trim();
    const lower = raw.toLowerCase();

    const reward = this.rewards.list().find((r) => {
      const cmd = (r.command ?? "").trim().toLowerCase();
      return r.enabled && cmd.length > 0 && (lower === cmd || lower.startsWith(cmd + " "));
    });
    if (!reward) return { status: "notcommand" };

    const message = raw.slice(reward.command.length).trim();
    return this.claimReward(host, msg.authorChannelId, msg.name, reward, message);
  }

  /**
   * Validasi + potong point + catat klaim untuk satu reward.
   *
   * Seperti CommandsEngine.redeemTemplate: tidak tahu-menahu soal chat, supaya
   * aturan biaya/cooldown cuma hidup di satu tempat.
   */
  claimReward(
    host: string,
    authorChannelId: string,
    name: string,
    reward: Reward,
    message: string,
  ): ClaimResult {
    if (!reward.enabled) return { status: "disabled", name };

    const maxLen = this.settings.get<number>("alert.maxLen", 100);
    if (message.length > maxLen) return { status: "toolong", name };

    const viewer = this.viewers.getByAuthor(host, authorChannelId);
    if (!viewer || viewer.points < reward.cost) return { status: "insufficient", name };

    const now = Date.now();
    const points = this.viewers.addPoints(viewer.id, -reward.cost, "reward", now);
    const claimId = this.rewards.createClaim({
      rewardId: reward.id,
      rewardName: reward.name,
      host,
      author: authorChannelId,
      name,
      message,
      cost: reward.cost,
      now,
    });

    return { status: "ok", name, points, reward, claimId, message };
  }
}
