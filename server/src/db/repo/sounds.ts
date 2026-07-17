// Soundboard: daftar sound + file-nya (dengan GIF/gambar opsional).
import type { DatabaseSync } from "node:sqlite";

export interface Sound {
  id: number;
  name: string;
  url: string;
  imageUrl: string | null;
}

interface SoundRow {
  id: number;
  name: string;
  path: string;
  image_path: string | null;
  created_at: number;
}

export class SoundsRepo {
  constructor(private readonly db: DatabaseSync) {}

  list(): Sound[] {
    const rows = this.db
      .prepare("SELECT * FROM sounds ORDER BY id ASC")
      .all() as unknown as SoundRow[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      url: `/uploads/${r.path}`,
      imageUrl: r.image_path ? `/uploads/${r.image_path}` : null,
    }));
  }

  getForPlay(id: number): { url: string; imageUrl: string | null } | null {
    const r = this.db
      .prepare("SELECT path, image_path FROM sounds WHERE id = ?")
      .get(id) as { path: string; image_path: string | null } | undefined;
    if (!r) return null;
    return {
      url: `/uploads/${r.path}`,
      imageUrl: r.image_path ? `/uploads/${r.image_path}` : null,
    };
  }

  create(name: string, path: string, imagePath?: string | null): number {
    const info = this.db
      .prepare(
        "INSERT INTO sounds(name, path, image_path, created_at) VALUES(?, ?, ?, ?)",
      )
      .run(name, path, imagePath ?? null, Date.now());
    return Number(info.lastInsertRowid);
  }

  remove(id: number): boolean {
    return this.db.prepare("DELETE FROM sounds WHERE id = ?").run(id).changes > 0;
  }
}
