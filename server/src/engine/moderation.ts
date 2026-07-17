// Moderasi teks alert: batas panjang + filter kata kasar.

export interface ModerationConfig {
  maxLen: number;
  badWords: string[];
}

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "toolong" | "badword" };

export function moderate(text: string, cfg: ModerationConfig): ModerationResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty" };
  if (trimmed.length > cfg.maxLen) return { ok: false, reason: "toolong" };

  const lower = trimmed.toLowerCase();
  for (const word of cfg.badWords) {
    const w = word.trim().toLowerCase();
    if (w.length > 0 && lower.includes(w)) return { ok: false, reason: "badword" };
  }
  return { ok: true };
}
