// Konfigurasi dari environment (dengan default aman untuk dev).
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "..");

function envStr(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.length > 0 ? v : fallback;
}

export const config = {
  port: Number(envStr("PORT", "4300")),
  host: envStr("HOST", "0.0.0.0"),
  dbPath: resolve(serverRoot, envStr("DB_PATH", "./data.sqlite")),
  uploadDir: resolve(serverRoot, envStr("UPLOAD_DIR", "./uploads")),
  overlayDir: resolve(serverRoot, "../overlay"),
  publicDir: resolve(serverRoot, "../public"),
  dashboardDir: resolve(serverRoot, "../dashboard/dist"),
  adminPassword: envStr("ADMIN_PASSWORD", "admin"),
  get usingDefaultPassword(): boolean {
    return !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length === 0;
  },
};
