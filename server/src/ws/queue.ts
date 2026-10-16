// Antrian alert: tampilkan 1-per-1 di overlay, tunggu ack sebelum lanjut.
// Alert menunggu sampai ada overlay yang terhubung, dan tahan restart
// (dipulihkan dari redemptions berstatus 'pending').
import type { AlertPayload, ServerEvent } from "../../../shared/types.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";

/** Waktu ekstra setelah durasi template sebelum menyerah menunggu ack. */
const ACK_GRACE_MS = 2500;

export class AlertQueue {
  private queue: AlertPayload[] = [];
  private active: AlertPayload | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private hooks: { onStart?: () => void; onEnd?: () => void } = {};

  constructor(
    private readonly broadcastOverlay: (event: ServerEvent) => void,
    private readonly hasOverlay: () => boolean,
    private readonly redemptions: RedemptionsRepo,
  ) {}

  /** Pasang hook saat alert mulai tampil / selesai (mis. ganti scene OBS). */
  setHooks(hooks: { onStart?: () => void; onEnd?: () => void }): void {
    this.hooks = hooks;
  }

  enqueue(alert: AlertPayload): void {
    this.queue.push(alert);
    this.dispatchNext();
  }

  /** Dipanggil saat overlay konek/ready — mulai jalankan antrian yang tertahan. */
  kick(): void {
    // Kirim ulang yang sedang aktif ke overlay yang baru konek (mis. reconnect).
    if (this.active) {
      this.broadcastOverlay({ type: "alert", data: this.active });
      return;
    }
    this.dispatchNext();
  }

  /** Overlay memberi tahu alert sudah selesai ditampilkan. */
  ack(id: number): void {
    if (this.active && this.active.id === id) this.finishActive();
  }

  /** Sembunyikan alert yang sedang tampil sekarang (tombol Skip/Hide). */
  skipActive(): boolean {
    if (!this.active) return false;
    this.broadcastOverlay({ type: "skip" });
    this.finishActive("skipped");
    return true;
  }

  /** Kosongkan antrian yang belum tampil. Baris DB ikut ditandai 'skipped',
   *  kalau tidak alert yang dibuang akan muncul lagi saat server restart. */
  clearPending(): void {
    const dropped = this.queue.splice(0);
    const now = Date.now();
    for (const alert of dropped) this.redemptions.markSkipped(alert.id, now);
  }

  private finishActive(status: "shown" | "skipped" = "shown"): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.active) {
      const now = Date.now();
      if (status === "skipped") this.redemptions.markSkipped(this.active.id, now);
      else this.redemptions.markShown(this.active.id, now);
      this.hooks.onEnd?.();
    }
    this.active = null;
    this.dispatchNext();
  }

  private dispatchNext(): void {
    if (this.active) return;
    if (!this.hasOverlay()) return; // tahan sampai overlay siap
    const next = this.queue.shift();
    if (!next) return;

    this.active = next;
    this.broadcastOverlay({ type: "alert", data: next });
    this.hooks.onStart?.();
    this.timer = setTimeout(
      () => this.finishActive(),
      next.template.durationMs + ACK_GRACE_MS,
    );
  }

  size(): number {
    return this.queue.length + (this.active ? 1 : 0);
  }
}
