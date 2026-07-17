// Template tampilan alert. Row DB dipetakan ke tipe AlertTemplate (shared).
import type { DatabaseSync } from "node:sqlite";
import type { AlertTemplate } from "../../../../shared/types.ts";

interface TemplateRow {
  id: number;
  name: string;
  command: string;
  cost: number;
  image_path: string | null;
  gif_path: string | null;
  sound_path: string | null;
  duration_ms: number;
  animation: string;
  position: string;
  text_color: string;
  bg_color: string;
  tts_enabled: number;
  youtube_id: string | null;
  youtube_start: number | null;
  created_at: number;
}

function toTemplate(row: TemplateRow): AlertTemplate {
  return {
    id: row.id,
    name: row.name,
    command: row.command ?? "",
    cost: row.cost ?? 0,
    imageUrl: row.image_path ? `/uploads/${row.image_path}` : undefined,
    gifUrl: row.gif_path ? `/uploads/${row.gif_path}` : undefined,
    soundUrl: row.sound_path ? `/uploads/${row.sound_path}` : undefined,
    durationMs: row.duration_ms,
    animation: row.animation as AlertTemplate["animation"],
    position: row.position as AlertTemplate["position"],
    textColor: row.text_color,
    bgColor: row.bg_color,
    ttsEnabled: row.tts_enabled === 1,
    youtubeId: row.youtube_id ?? undefined,
    youtubeStart: row.youtube_start ?? 0,
  };
}

export interface TemplateInput {
  name: string;
  command: string;
  cost: number;
  durationMs: number;
  animation: string;
  position: string;
  textColor: string;
  bgColor: string;
  ttsEnabled: boolean;
  imagePath?: string | null;
  gifPath?: string | null;
  soundPath?: string | null;
  youtubeId?: string | null;
  youtubeStart?: number;
}

export class TemplatesRepo {
  constructor(private readonly db: DatabaseSync) {}

  create(t: TemplateInput): number {
    const info = this.db
      .prepare(
        `INSERT INTO alert_templates
          (name, command, cost, image_path, gif_path, sound_path, duration_ms, animation, position, text_color, bg_color, tts_enabled, youtube_id, youtube_start, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        t.name,
        t.command,
        t.cost,
        t.imagePath ?? null,
        t.gifPath ?? null,
        t.soundPath ?? null,
        t.durationMs,
        t.animation,
        t.position,
        t.textColor,
        t.bgColor,
        t.ttsEnabled ? 1 : 0,
        t.youtubeId ?? null,
        t.youtubeStart ?? 0,
        Date.now(),
      );
    return Number(info.lastInsertRowid);
  }

  update(id: number, t: TemplateInput): boolean {
    const info = this.db
      .prepare(
        `UPDATE alert_templates
            SET name = ?, command = ?, cost = ?, image_path = ?, gif_path = ?, sound_path = ?, duration_ms = ?, animation = ?,
                position = ?, text_color = ?, bg_color = ?, tts_enabled = ?, youtube_id = ?, youtube_start = ?
          WHERE id = ?`,
      )
      .run(
        t.name,
        t.command,
        t.cost,
        t.imagePath ?? null,
        t.gifPath ?? null,
        t.soundPath ?? null,
        t.durationMs,
        t.animation,
        t.position,
        t.textColor,
        t.bgColor,
        t.ttsEnabled ? 1 : 0,
        t.youtubeId ?? null,
        t.youtubeStart ?? 0,
        id,
      );
    return info.changes > 0;
  }

  remove(id: number): boolean {
    const info = this.db.prepare("DELETE FROM alert_templates WHERE id = ?").run(id);
    return info.changes > 0;
  }

  deleteAll(): void {
    this.db.exec("DELETE FROM alert_templates");
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS n FROM alert_templates")
      .get() as { n: number };
    return row.n;
  }

  getById(id: number): AlertTemplate | undefined {
    const row = this.db
      .prepare("SELECT * FROM alert_templates WHERE id = ?")
      .get(id) as TemplateRow | undefined;
    return row ? toTemplate(row) : undefined;
  }

  /** Template default (dari settings id, fallback ke template pertama yang ada). */
  getDefault(preferredId: number): AlertTemplate {
    return (
      this.getById(preferredId) ??
      (() => {
        const row = this.db
          .prepare("SELECT * FROM alert_templates ORDER BY id ASC LIMIT 1")
          .get() as TemplateRow | undefined;
        if (!row) throw new Error("tidak ada template alert sama sekali");
        return toTemplate(row);
      })()
    );
  }

  list(): AlertTemplate[] {
    const rows = this.db
      .prepare("SELECT * FROM alert_templates ORDER BY id ASC")
      .all() as unknown as TemplateRow[];
    return rows.map(toTemplate);
  }
}
