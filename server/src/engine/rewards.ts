// Deteksi command reward store (Req Lagu, Hero, dll) → potong point, masuk antrian.
import type { ChatMessage } from "../../../shared/types.ts";
import type { ViewersRepo } from "../db/repo/viewers.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import type { RewardsRepo, Reward } from "../db/repo/rewards.ts";

export type RewardResult =
  | { status: "notcommand" }
  | { status: "toolong" | "insufficient"; name: string }
  | { status: "ok"; name: string; points: number; reward: Reward; claimId: number; message: string };

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
    const maxLen = this.settings.get<number>("alert.maxLen", 100);
    if (message.length > maxLen) return { status: "toolong", name: msg.name };

    const viewer = this.viewers.getByAuthor(host, msg.authorChannelId);
    if (!viewer || viewer.points < reward.cost) return { status: "insufficient", name: msg.name };

    const now = Date.now();
    const points = this.viewers.addPoints(viewer.id, -reward.cost, "reward", now);
    const claimId = this.rewards.createClaim({
      rewardId: reward.id,
      rewardName: reward.name,
      host,
      author: msg.authorChannelId,
      name: msg.name,
      message,
      cost: reward.cost,
      now,
    });

    return { status: "ok", name: msg.name, points, reward, claimId, message };
  }
}
