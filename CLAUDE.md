# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`streaming-assistant` — a self-hosted bot for **YouTube Live** (UI is in Bahasa Indonesia; dashboard also supports English). It reads any channel's live chat, awards points to commenting viewers, and turns points into Saweria-style alerts shown in OBS. Full technical plan lives in `docs/TECHNICAL-PLAN.md`.

## Monorepo layout

- `server/` — Fastify backend (port **4300**). The single source of truth; serves API, WebSocket, overlays, uploads, and (in production) the built dashboard.
- `overlay/` — static OBS Browser Source pages (vanilla JS/HTML/CSS). Served at `/overlay/`. No build step.
- `dashboard/` — React + Vite + Tailwind v4 admin UI, neobrutalism style (port **4301** in dev).
- `public/` — static public viewer leaderboard page, served at `/leaderboard/`.
- `shared/types.ts` — types shared by server + dashboard (imported as `@shared/types` in the dashboard, relative path in the server). **`ServerEvent`** (the WS event union) and **`AlertTemplate`** live here.

## Commands (run server commands from `server/`, dashboard from `dashboard/`)

```bash
# Dev — two terminals
cd server && npm install && npm run dev        # tsx watch, http://localhost:4300
cd dashboard && npm install && npm run dev      # Vite, http://localhost:4301 (proxies /api /nb /uploads /ws → 4300)

# Type-check (no emit)
cd server && npm run typecheck                  # tsc --noEmit
cd dashboard && npm run build                    # tsc -b && vite build (also the way to type-check the UI)

# Production (single port 4300; server serves dashboard/dist at /)
docker compose up -d --build                     # or: pm2 start ecosystem.config.cjs (after building dashboard)
```

There is **no test framework**. Verify changes by (a) `npm run build` / `typecheck`, (b) hitting the API with `curl`/small Node scripts, and (c) CDP headless-Chrome checks for overlay/dashboard rendering. To run a TS module directly for a unit-style check, use `npx tsx <file>` — plain `node` cannot run the repo's TS (parameter properties, `.ts` imports).

## Runtime requirements (non-negotiable)

- **Node 25+.** The DB uses the built-in **`node:sqlite`** (`DatabaseSync`), NOT `better-sqlite3` — no native build required. Do not introduce `better-sqlite3`.
- The server runs **via `tsx` (never compiled)**. Therefore `tsx` and `pino-pretty` are **runtime `dependencies`** in `server/package.json`, not devDependencies — if `NODE_ENV=production`, `npm ci` would otherwise drop them and the server won't start.
- Config from env (`server/src/config.ts`): `PORT`, `HOST`, `ADMIN_PASSWORD`, `DB_PATH`, `UPLOAD_DIR`.

## Architecture (the big picture)

**Data flow:** `masterchat` reads the live chat with no auth/API key and **never posts to chat**. `ChatReader` (`server/src/chat/reader.ts`) fires `onMessage` for each chat line; `server/src/index.ts` wires the whole pipeline.

**`onMessage` pipeline order matters** (in `index.ts`): (1) award points via `PointsEngine`, (2) compute level badge + **broadcast the chat message**, (3) reward store, (4) `!alert` command, (5) giveaway feed, (6) trivia feed. Steps that touch settings/points are wrapped in `try/catch` **specifically so a bad config (e.g. malformed bonus command) can't stop the chat broadcast**. Keep the chat broadcast unblockable when editing this function.

**WebSocket hub** (`server/src/ws/hub.ts`) tracks clients by role: `overlay | dashboard | chat`. `broadcast(event, role?)` sends the `ServerEvent` union. **`AlertQueue`** (`server/src/ws/queue.ts`) dispatches alerts one-at-a-time to the `overlay` role, waits for an `alert:shown` ack, holds pending alerts until an overlay connects, and persists via the `redemptions` table so the queue survives restarts. It exposes `setHooks({onStart,onEnd})` — used to drive OBS scene switching during an alert.

**Command replies use Nightbot, not this bot.** Anything that needs a chat reply (`!point`, `!rank`, `!coinflip`, `!gamble`) is a Nightbot custom command that `$(urlfetch)`s our `/nb/*` endpoints (`server/src/routes/nightbot.ts`, `games.ts`). These are public (Nightbot can't log in).

**Overlays** are static pages served by `@fastify/static`. They either poll public endpoints (`/public/leaderboard`, `/public/goal`, `/public/runtext`, `/public/requests`, `/public/recent`) or open a WS as role `overlay`/`chat`. The alert overlay (`overlay/index.html` + `overlay.js`) drives the alert card, plays sound then TTS, and uses the YouTube IFrame API for video alerts with an adaptive muted-autoplay fallback for OBS.

**Database** (`server/src/db/`): `migrate.ts` holds the `SCHEMA` string, an `ensureColumn(db, table, col, ddl)` helper, and `DEFAULT_SETTINGS`. Repos in `server/src/db/repo/*` wrap tables (`viewers`, `point_ledger`, `redemptions`, `alert_templates`, `settings`, `rewards`, `reward_claims`, `giveaway_winners`, `sounds`, `stream_sessions`, `sessions`). Points are scoped per `(host_channel_id × author_channel_id)`.

**Auth** (`server/src/auth.ts`, `routes/auth.ts`): password login (`ADMIN_PASSWORD`, default `admin`), tokens persisted in the `sessions` table. An `onRequest` hook guards every `/api/*` except `/api/auth/login`; `/overlay`, `/uploads`, `/ws`, `/nb`, `/public`, `/leaderboard`, `/health`, and `/` (dashboard) are public.

**Dashboard i18n** (`dashboard/src/i18n.tsx`): lightweight "Indonesian string is the key" system. `LangProvider` (in `main.tsx`) holds `lang` (`id`/`en`, persisted to `localStorage` `sa_lang`); components call `const { t } = useLang()` and wrap visible strings with `t("...")`. Each file registers its own English map at module top via `registerDict({...})` (co-located — no central dictionary). `t(key, params?)` does `{name}`-style substitution. The header has an ID/EN toggle that re-renders live.

## Repo-specific gotchas (these have bitten before)

- **New DB columns must be added in two places**: the `SCHEMA` string (for fresh DBs) **and** an `ensureColumn(...)` call (for existing DBs). Follow the `gif_path` / `image_path` pattern.
- **Never use browser `confirm()` / `alert()`** in the dashboard — they get suppressed in some environments and silently no-op (destructive buttons "do nothing"). Use an inline confirm state instead (see the `confirmDel`/`confirmClear` pattern in `TemplatesTab`/`HistoryTab`, and reset in Leaderboard).
- **Don't shadow the i18n `t`** with `array.map((t) => ...)` — precompute labels before the map, or rename the loop var (see `TemplatesTab`).
- **`registerDict({...})` object literals cannot have duplicate keys** — TypeScript errors with TS1117 and the build fails.
- Alert template `textColor`/`bgColor` must be full `#RRGGBB` (server Zod `HEX` regex rejects `#000`).
- Empty-body POSTs (e.g. `/stop`) rely on a custom `application/json` content-type parser in `index.ts` that treats `""` as `{}`; without it Fastify returns 400.
- **GIF vs image are separate fields**: `gif_path` (large, video-style overlay position) is distinct from `image_path` (small thumbnail). Don't auto-detect GIFs by extension.
- Config export/import (`routes/config.ts`) is **version 2** and round-trips `settings` + `templates` + `rewards`; import **replaces** templates & rewards.
- On macOS, the repo lives under `~/Documents`, which macOS TCC can block from terminal/tools ("Operation not permitted"). If file reads/writes fail wholesale, it's a Full Disk Access issue, not the code.
