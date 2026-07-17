// Koneksi SQLite tunggal (pakai modul bawaan Node `node:sqlite`).
// Disembunyikan di balik modul ini supaya implementasi bisa diganti nanti.
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.ts";
import { runMigrations } from "./migrate.ts";

export type DB = DatabaseSync;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(config.dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    runMigrations(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
