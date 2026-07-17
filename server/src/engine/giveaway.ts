// Giveaway/undian: kumpulkan penonton yang mengetik kata syarat, lalu tarik pemenang.
import type { ChatMessage } from "../../../shared/types.ts";

export interface GiveawayStatus {
  active: boolean;
  keyword: string;
  reward: string;
  count: number;
}

export class GiveawayEngine {
  private active = false;
  private keyword = "";
  private reward = "";
  private entrants = new Map<string, string>(); // authorChannelId -> name

  start(keyword: string, reward = ""): void {
    this.active = true;
    this.keyword = keyword.trim().toLowerCase();
    this.reward = reward.trim();
    this.entrants.clear();
  }

  stop(): void {
    this.active = false;
  }

  /** Dipanggil untuk tiap pesan chat saat monitor jalan. */
  feed(msg: ChatMessage): void {
    if (!this.active || !this.keyword) return;
    if (msg.text.toLowerCase().includes(this.keyword)) {
      this.entrants.set(msg.authorChannelId, msg.name);
    }
  }

  /** Tarik pemenang acak & keluarkan dari peserta (biar tarik lagi = orang beda). */
  draw(rng: () => number): { authorChannelId: string; name: string } | null {
    const list = [...this.entrants.entries()];
    if (list.length === 0) return null;
    const [authorChannelId, name] = list[Math.floor(rng() * list.length)];
    this.entrants.delete(authorChannelId);
    return { authorChannelId, name };
  }

  /** Daftar peserta (nama). */
  list(): string[] {
    return [...this.entrants.values()];
  }

  getReward(): string {
    return this.reward;
  }

  status(): GiveawayStatus {
    return { active: this.active, keyword: this.keyword, reward: this.reward, count: this.entrants.size };
  }
}
