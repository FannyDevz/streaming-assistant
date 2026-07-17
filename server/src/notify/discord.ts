// Notifikasi ke Discord lewat webhook. Tak pernah melempar error (best-effort).
import type { SettingsRepo } from "../db/repo/settings.ts";

interface Embed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export class DiscordNotifier {
  constructor(private readonly settings: SettingsRepo) {}

  private url(): string {
    return String(this.settings.get<string>("discord.webhookUrl", "") || "").trim();
  }

  enabled(): boolean {
    return this.settings.get<boolean>("discord.enabled", false) && this.url().length > 0;
  }

  /** Kirim satu embed. Kembalikan true bila terkirim. */
  async send(embed: Embed): Promise<{ ok: boolean; error?: string }> {
    const url = this.url();
    if (!url) return { ok: false, error: "URL webhook kosong" };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.settings.get<string>("discord.username", "Streaming Assistant"),
          embeds: [{ timestamp: new Date().toISOString(), ...embed }],
        }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "gagal kirim" };
    }
  }

  // ---- Event siap pakai (dipanggil dari index.ts) ----
  streamStart(title: string, videoId: string | null): void {
    if (!this.enabled() || !this.settings.get<boolean>("discord.onStreamStart", true)) return;
    const link = videoId ? `\nhttps://youtu.be/${videoId}` : "";
    void this.send({
      title: "🔴 Live dimulai!",
      description: (title || "Streaming sedang berlangsung") + link,
      color: 0xff3b30,
    });
  }

  superchat(name: string, amount: string, message: string): void {
    if (!this.enabled() || !this.settings.get<boolean>("discord.onSuperchat", true)) return;
    void this.send({
      title: "💎 SuperChat!",
      description: `**${name}** — ${amount}` + (message ? `\n> ${message}` : ""),
      color: 0x00c2ff,
    });
  }

  giveaway(winner: string, reward: string): void {
    if (!this.enabled() || !this.settings.get<boolean>("discord.onGiveaway", true)) return;
    void this.send({
      title: "🎡 Pemenang Giveaway!",
      description: `Selamat **${winner}**` + (reward ? ` 🎁 ${reward}` : ""),
      color: 0xffcc00,
    });
  }
}
