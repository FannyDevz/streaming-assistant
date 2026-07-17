import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Backend Fastify berjalan di :4300. Proxy API + WS ke sana saat dev.
const BACKEND = "http://localhost:4300";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  server: {
    port: 4301,
    fs: { allow: [".", "../shared"] },
    proxy: {
      "/api": BACKEND,
      "/nb": BACKEND,
      "/uploads": BACKEND,
      "/ws": { target: BACKEND, ws: true },
    },
  },
});
