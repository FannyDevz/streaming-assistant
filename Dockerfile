# Streaming Assistant — image produksi satu-port (server + dashboard + overlay).
# Butuh Node 25+ karena memakai `node:sqlite` bawaan (bukan better-sqlite3).

# --- Tahap 1: build dashboard (React/Vite) jadi file statis ---
FROM node:25-slim AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY shared/ /app/shared/
COPY dashboard/ ./
RUN npm run build

# --- Tahap 2: runtime server (Fastify, dijalankan via tsx) ---
FROM node:25-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4300 \
    DB_PATH=/data/data.sqlite \
    UPLOAD_DIR=/data/uploads
WORKDIR /app/server

# Dependensi server (termasuk tsx & pino-pretty yang dipakai saat runtime).
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Kode + aset yang disajikan.
COPY server/ ./
COPY shared/ /app/shared/
COPY overlay/ /app/overlay/
COPY public/ /app/public/
COPY --from=dashboard-build /app/dashboard/dist /app/dashboard/dist

EXPOSE 4300
# Data (SQLite + upload) di /data — mount volume agar tahan restart.
CMD ["npm", "start"]
