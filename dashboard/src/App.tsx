import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, MonitorStatus, ServerEvent } from "@shared/types";
import { api, getToken, setUnauthHandler, type LeaderboardEntry } from "./api";
import { useWs } from "./useWs";
import { useLang, registerDict } from "./i18n";
import { Login } from "./Login";
import { Button } from "./components/ui";

registerDict({
  "📡 Monitor": "📡 Monitor",
  "🏆 Leaderboard": "🏆 Leaderboard",
  "🎁 Reward": "🎁 Reward",
  "🎡 Giveaway & Kuis": "🎡 Giveaway & Quiz",
  "🔊 Soundboard": "🔊 Soundboard",
  "⚙️ Aturan": "⚙️ Settings",
  "🎨 Alert": "🎨 Alert",
  "📺 Overlay": "📺 Overlay",
  "📊 Statistik": "📊 Stats",
  "📜 Riwayat": "📜 History",
  "❓ Bantuan": "❓ Help",
  TERSAMBUNG: "CONNECTED",
  TERPUTUS: "DISCONNECTED",
  "🔓 Logout": "🔓 Logout",
  "Memuat…": "Loading…",
});
import { MonitorTab } from "./tabs/MonitorTab";
import { LeaderboardTab } from "./tabs/LeaderboardTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { TemplatesTab } from "./tabs/TemplatesTab";
import { OverlayTab } from "./tabs/OverlayTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { HelpTab } from "./tabs/HelpTab";
import { RewardTab } from "./tabs/RewardTab";
import { GiveawayTab } from "./tabs/GiveawayTab";
import { SoundboardTab } from "./tabs/SoundboardTab";
import { StatsTab } from "./tabs/StatsTab";

type TabKey =
  | "monitor"
  | "leaderboard"
  | "reward"
  | "giveaway"
  | "soundboard"
  | "settings"
  | "templates"
  | "overlay"
  | "stats"
  | "history"
  | "help";

const TABS: { key: TabKey; label: string }[] = [
  { key: "monitor", label: "📡 Monitor" },
  { key: "leaderboard", label: "🏆 Leaderboard" },
  { key: "reward", label: "🎁 Reward" },
  { key: "giveaway", label: "🎡 Giveaway & Kuis" },
  { key: "soundboard", label: "🔊 Soundboard" },
  { key: "settings", label: "⚙️ Aturan" },
  { key: "templates", label: "🎨 Alert" },
  { key: "overlay", label: "📺 Overlay" },
  { key: "stats", label: "📊 Statistik" },
  { key: "history", label: "📜 Riwayat" },
  { key: "help", label: "❓ Bantuan" },
];

const VALID: TabKey[] = [
  "monitor",
  "leaderboard",
  "reward",
  "giveaway",
  "soundboard",
  "settings",
  "templates",
  "overlay",
  "stats",
  "history",
  "help",
];
function initialTab(): TabKey {
  const h = location.hash.replace("#", "") as TabKey;
  return VALID.includes(h) ? h : "monitor";
}

export function App() {
  const { t, lang, setLang } = useLang();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTabState] = useState<TabKey>(initialTab);
  const setTab = (t: TabKey) => {
    setTabState(t);
    location.hash = t;
  };
  const [status, setStatus] = useState<MonitorStatus>({ monitoring: false, messageCount: 0 });
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  const onEvent = useCallback((e: ServerEvent) => {
    if (e.type === "status") setStatus(e.data);
    else if (e.type === "reset") setBoard([]);
    else if (e.type === "chat") setChat((prev) => [...prev, e.data].slice(-120));
    else if (e.type === "points") {
      setBoard((prev) => {
        const next = [...prev];
        const i = next.findIndex((v) => v.authorChannelId === e.data.authorChannelId);
        if (i >= 0) next[i] = { ...next[i], points: e.data.points, name: e.data.name };
        else
          next.push({
            rank: 0,
            authorChannelId: e.data.authorChannelId,
            name: e.data.name,
            points: e.data.points,
            totalEarned: e.data.points,
          });
        next.sort((a, b) => b.points - a.points);
        return next.slice(0, 50).map((v, idx) => ({ ...v, rank: idx + 1 }));
      });
    }
  }, []);

  const connected = useWs(onEvent);

  const refreshBoard = useCallback(async () => {
    try {
      const r = await api.leaderboard(50);
      setBoard(r.entries);
    } catch {
      /* ignore */
    }
  }, []);

  // Cek sesi saat mount.
  useEffect(() => {
    setUnauthHandler(() => setAuthed(false));
    if (!getToken()) {
      setAuthed(false);
      return;
    }
    api
      .check()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  // Muat data awal setelah terautentikasi.
  useEffect(() => {
    if (authed !== true) return;
    api.status().then(setStatus).catch(() => {});
    refreshBoard();
  }, [authed, refreshBoard]);

  async function logout() {
    await api.logout();
    setAuthed(false);
  }

  if (authed === null) {
    return <div className="min-h-screen grid place-items-center font-black uppercase">{t("Memuat…")}</div>;
  }
  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <header className="neo-lg bg-white p-4 mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-black uppercase px-3 py-1"
            style={{ background: "var(--pink)", border: "3px solid #000", boxShadow: "4px 4px 0 #000" }}
          >
            Streaming Assistant
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: connected ? "var(--green)" : "var(--red)", border: "2px solid #000" }}
            />
            {connected ? t("TERSAMBUNG") : t("TERPUTUS")}
          </span>
          <div className="flex" style={{ border: "2px solid #000" }}>
            {(["id", "en"] as const).map((l) => (
              <button
                key={l}
                className="px-2 py-1 text-xs font-black uppercase"
                style={{
                  background: lang === l ? "var(--yellow)" : "#fff",
                  borderLeft: l === "en" ? "2px solid #000" : undefined,
                }}
                onClick={() => setLang(l)}
              >
                {l === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
              </button>
            ))}
          </div>
          <Button color="white" className="!px-3 !py-1 text-xs" onClick={logout}>
            {t("🔓 Logout")}
          </Button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={`neo-tab ${tab === tb.key ? "active" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {t(tb.label)}
          </button>
        ))}
      </nav>

      {tab === "monitor" && (
        <MonitorTab status={status} chat={chat} onStatus={setStatus} />
      )}
      {tab === "leaderboard" && (
        <LeaderboardTab board={board} status={status} onRefresh={refreshBoard} onBoard={setBoard} />
      )}
      {tab === "reward" && <RewardTab />}
      {tab === "giveaway" && <GiveawayTab />}
      {tab === "soundboard" && <SoundboardTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "overlay" && <OverlayTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "help" && <HelpTab />}
    </div>
  );
}
