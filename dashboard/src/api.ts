// Wrapper fetch tipis untuk backend Fastify (di-proxy oleh Vite saat dev).
import type { MonitorStatus, AlertTemplate } from "@shared/types";

export interface LeaderboardEntry {
  rank: number;
  authorChannelId: string;
  name: string;
  points: number;
  totalEarned: number;
}

export interface TemplateBody {
  name: string;
  command: string;
  cost: number;
  durationMs: number;
  animation: "slide" | "pop" | "fade";
  position: "top" | "center" | "bottom";
  textColor: string;
  bgColor: string;
  ttsEnabled: boolean;
  imagePath?: string | null;
  gifPath?: string | null;
  soundPath?: string | null;
  youtubeUrl?: string | null;
  youtubeStart?: number;
}

// ---- Token sesi ----
let token = localStorage.getItem("sa_token") ?? "";
let onUnauth: () => void = () => {};

export function setToken(t: string): void {
  token = t;
  if (t) localStorage.setItem("sa_token", t);
  else localStorage.removeItem("sa_token");
}
export function getToken(): string {
  return token;
}
export function setUnauthHandler(fn: () => void): void {
  onUnauth = fn;
}
function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...opts,
  });
  if (res.status === 401) {
    setToken("");
    onUnauth();
    throw new Error("sesi berakhir, silakan login lagi");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: async (password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "login gagal");
    }
    const body = (await res.json()) as { token: string };
    setToken(body.token);
  },
  check: () => req<{ ok: boolean }>("/api/auth/check"),
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    } catch {
      /* ignore */
    }
    setToken("");
  },

  status: () => req<MonitorStatus>("/api/monitor/status"),
  startMonitor: (url: string) =>
    req<MonitorStatus>("/api/monitor/start", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  stopMonitor: () => req<MonitorStatus>("/api/monitor/stop", { method: "POST" }),

  leaderboard: (limit = 30) =>
    req<{ host: string | null; total: number; entries: LeaderboardEntry[] }>(
      `/api/leaderboard?limit=${limit}`,
    ),
  adjust: (id: number, delta: number, reason = "admin") =>
    req<{ id: number; points: number }>(`/api/viewers/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ delta, reason }),
    }),
  adjustByAuthor: (authorChannelId: string, delta: number, reason = "admin") =>
    req<{ id: number; points: number }>("/api/viewers/adjust", {
      method: "POST",
      body: JSON.stringify({ authorChannelId, delta, reason }),
    }),

  resetLeaderboard: () =>
    req<{ ok: boolean; deleted: number }>("/api/viewers/reset", { method: "POST" }),

  getSettings: () => req<Record<string, unknown>>("/api/settings"),
  putSettings: (obj: Record<string, unknown>) =>
    req<Record<string, unknown>>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(obj),
    }),

  templates: () => req<{ entries: AlertTemplate[] }>("/api/templates"),
  createTemplate: (body: TemplateBody) =>
    req<AlertTemplate>("/api/templates", { method: "POST", body: JSON.stringify(body) }),
  updateTemplate: (id: number, body: TemplateBody) =>
    req<AlertTemplate>(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTemplate: (id: number) =>
    req<{ ok: boolean }>(`/api/templates/${id}`, { method: "DELETE" }),
  uploadFile: async (file: File, kind: "image" | "sound") => {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    const res = await fetch("/api/templates/upload", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (res.status === 401) {
      setToken("");
      onUnauth();
      throw new Error("sesi berakhir, silakan login lagi");
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const b = await res.json();
        if (b?.error) msg = b.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json() as Promise<{ filename: string; url: string; kind: string }>;
  },
  testAlert: (payload: { name: string; message: string; templateId?: number }) =>
    req<{ ok: boolean; id: number; queued: number }>("/api/alerts/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  redemptions: (limit = 30) =>
    req<{ entries: Array<Record<string, unknown>> }>(`/api/redemptions?limit=${limit}`),
  replayAlert: (id: number) =>
    req<{ ok: boolean; queued: number }>(`/api/redemptions/${id}/replay`, { method: "POST" }),
  skipAlert: () => req<{ ok: boolean; skipped: boolean }>("/api/alerts/skip", { method: "POST" }),
  exportHistory: () => req<Record<string, unknown>>("/api/redemptions/export"),
  importHistory: (body: unknown) =>
    req<{ ok: boolean; imported: number }>("/api/redemptions/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  clearHistory: () => req<{ ok: boolean; cleared: number }>("/api/redemptions", { method: "DELETE" }),

  exportConfig: () => req<Record<string, unknown>>("/api/config/export"),
  importConfig: (body: unknown) =>
    req<{ ok: boolean; importedTemplates: number; importedRewards: number }>("/api/config/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ---- Reward store ----
  rewards: () => req<{ entries: Reward[] }>("/api/rewards"),
  createReward: (b: RewardBody) => req<Reward>("/api/rewards", { method: "POST", body: JSON.stringify(b) }),
  updateReward: (id: number, b: RewardBody) =>
    req<Reward>(`/api/rewards/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteReward: (id: number) => req<{ ok: boolean }>(`/api/rewards/${id}`, { method: "DELETE" }),
  rewardClaims: (status?: string) =>
    req<{ entries: Array<Record<string, unknown>> }>(
      `/api/rewards/claims?limit=100${status ? `&status=${status}` : ""}`,
    ),
  claimDone: (id: number) =>
    req<{ ok: boolean }>(`/api/rewards/claims/${id}/done`, { method: "POST" }),
  claimCancel: (id: number) =>
    req<{ ok: boolean; refunded: number }>(`/api/rewards/claims/${id}/cancel`, { method: "POST" }),
  addManualClaim: (b: { rewardName: string; name: string; message: string }) =>
    req<{ ok: boolean; id: number }>("/api/rewards/claims", { method: "POST", body: JSON.stringify(b) }),
  removeClaim: (id: number) =>
    req<{ ok: boolean }>(`/api/rewards/claims/${id}`, { method: "DELETE" }),

  // ---- Giveaway ----
  giveaway: () =>
    req<GiveawayStatus & { entrants: string[] }>("/api/giveaway"),
  giveawayStart: (keyword: string, reward: string) =>
    req<GiveawayStatus>("/api/giveaway/start", {
      method: "POST",
      body: JSON.stringify({ keyword, reward }),
    }),
  giveawayDraw: () =>
    req<{ ok: boolean; winner: string; reward: string; count: number }>("/api/giveaway/draw", { method: "POST" }),
  giveawayStop: () => req<GiveawayStatus>("/api/giveaway/stop", { method: "POST" }),
  giveawayWinners: () =>
    req<{ entries: Array<{ id: number; name: string; reward: string; created_at: number }> }>(
      "/api/giveaway/winners",
    ),
  removeWinner: (id: number) =>
    req<{ ok: boolean }>(`/api/giveaway/winners/${id}`, { method: "DELETE" }),

  // ---- Trivia (kuis) ----
  trivia: () => req<TriviaStatus>("/api/trivia"),
  triviaStart: (question: string, answer: string, reward: number) =>
    req<TriviaStatus>("/api/trivia/start", {
      method: "POST",
      body: JSON.stringify({ question, answer, reward }),
    }),
  triviaStop: () => req<TriviaStatus>("/api/trivia/stop", { method: "POST" }),

  // ---- Soundboard ----
  sounds: () =>
    req<{ entries: Array<{ id: number; name: string; url: string; imageUrl: string | null }> }>(
      "/api/sounds",
    ),
  createSound: (name: string, path: string, imagePath?: string | null) =>
    req<{ ok: boolean; id: number }>("/api/sounds", {
      method: "POST",
      body: JSON.stringify({ name, path, imagePath: imagePath ?? null }),
    }),
  deleteSound: (id: number) => req<{ ok: boolean }>(`/api/sounds/${id}`, { method: "DELETE" }),
  playSound: (id: number) =>
    req<{ ok: boolean; overlays: number }>(`/api/sounds/${id}/play`, { method: "POST" }),
  stopSounds: () =>
    req<{ ok: boolean; overlays: number }>("/api/sounds/stop", { method: "POST" }),

  // ---- Statistik sesi ----
  statsCurrent: () => req<{ session: SessionSummary | null }>("/api/stats/current"),
  statsSessions: (limit = 20) =>
    req<{ entries: SessionSummary[] }>(`/api/stats/sessions?limit=${limit}`),

  // ---- Profil penonton ----
  viewerProfile: (by: { channelId?: string; name?: string }) => {
    const qs = by.channelId
      ? `channelId=${encodeURIComponent(by.channelId)}`
      : `name=${encodeURIComponent(by.name ?? "")}`;
    return req<ViewerProfile>(`/api/viewers/profile?${qs}`);
  },

  // ---- Discord ----
  discordTest: () => req<{ ok: boolean }>("/api/discord/test", { method: "POST" }),

  // ---- OBS WebSocket ----
  obsStatus: () => req<ObsStatus>("/api/obs/status"),
  obsConnect: (body?: { url?: string; password?: string; enabled?: boolean }) =>
    req<ObsStatus>("/api/obs/connect", { method: "POST", body: JSON.stringify(body ?? {}) }),
  obsDisconnect: () => req<ObsStatus>("/api/obs/disconnect", { method: "POST" }),
};

export interface SessionSummary {
  id: number;
  title: string;
  videoId: string | null;
  startedAt: number;
  endedAt: number | null;
  live: boolean;
  durationMs: number;
  chats: number;
  alerts: number;
  rewards: number;
  pointsAwarded: number;
  pointsSpent: number;
  newViewers: number;
  topSpenders: { name: string; spent: number }[];
}

export interface ViewerProfile {
  channelId: string;
  name: string;
  points: number;
  totalEarned: number;
  level: { name: string; color: string } | null;
  rank: number;
  totalViewers: number;
  firstSeen: number;
  lastSeen: number;
  lastAlertAt: number | null;
  alertsTotal: number;
  recentAlerts: Array<{ id: number; message: string; cost: number; status: string; created_at: number }>;
  ledger: Array<{ delta: number; reason: string; created_at: number }>;
}

export interface ObsStatus {
  enabled: boolean;
  connected: boolean;
  error: string | null;
  currentScene: string | null;
  scenes: string[];
}

export interface TriviaStatus {
  active: boolean;
  question: string;
  reward: number;
  answered: number;
  winner: { authorChannelId: string; name: string; answer: string } | null;
}

export interface GiveawayStatus {
  active: boolean;
  keyword: string;
  reward: string;
  count: number;
}

export interface Reward {
  id: number;
  name: string;
  command: string;
  cost: number;
  prompt: string;
  enabled: boolean;
  alert: boolean;
}
export type RewardBody = Omit<Reward, "id">;
