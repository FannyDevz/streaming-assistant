// Penyusun profil penonton (point, level, peringkat, riwayat). Dipakai oleh
// route admin (routes/profile.ts).
import type { ViewersRepo, ViewerRow } from "../db/repo/viewers.ts";
import type { RedemptionsRepo } from "../db/repo/redemptions.ts";
import type { SettingsRepo } from "../db/repo/settings.ts";
import { levelFor, type Level } from "./levels.ts";

export interface ProfileDeps {
  viewers: ViewersRepo;
  redemptions: RedemptionsRepo;
  settings: SettingsRepo;
}

export function buildProfile(deps: ProfileDeps, host: string, viewer: ViewerRow) {
  const lv = levelFor(viewer.total_earned, deps.settings.get<Level[]>("levels", []));
  return {
    channelId: viewer.author_channel_id,
    name: viewer.display_name,
    points: viewer.points,
    totalEarned: viewer.total_earned,
    level: lv ? { name: lv.name, color: lv.color } : null,
    rank: deps.viewers.rankOf(host, viewer.points),
    totalViewers: deps.viewers.countForHost(host),
    firstSeen: viewer.created_at,
    lastSeen: viewer.updated_at,
    lastAlertAt: viewer.last_alert_at,
    alertsTotal: deps.redemptions.countByAuthor(host, viewer.author_channel_id),
    recentAlerts: deps.redemptions.listByAuthor(host, viewer.author_channel_id, 10),
    ledger: deps.viewers.ledgerFor(viewer.id, 15),
  };
}
