import { useCallback, useEffect, useState } from "react";
import { api, type SessionSummary } from "../api";
import { Button, Card, Tag } from "../components/ui";
import { useLang, registerDict } from "../i18n";

registerDict({
  "📊 Sesi Sekarang {live}": "📊 Current Session {live}",
  "📊 Sesi Sekarang": "📊 Current Session",
  "🔴 LIVE": "🔴 LIVE",
  "Belum ada sesi. Mulai pemantauan di tab": "No session yet. Start monitoring in the",
  "📡 Monitor": "📡 Monitor",
  "untuk merekam statistik.": "tab to record statistics.",
  "Tanpa judul": "Untitled",
  "Mulai {time}": "Started {time}",
  "· Durasi {dur}": "· Duration {dur}",
  Chat: "Chat",
  Alert: "Alert",
  Reward: "Reward",
  "Penonton baru": "New viewers",
  "Point dibagi": "Points awarded",
  "Point dipakai": "Points spent",
  "🔥 Top Spender": "🔥 Top Spender",
  "📚 Riwayat Sesi ({n})": "📚 Session History ({n})",
  "Belum ada sesi selesai.": "No completed sessions yet.",
  Mulai: "Start",
  Judul: "Title",
  Durasi: "Duration",
  Dibagi: "Awarded",
  Dipakai: "Spent",
});

const fmtDur = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m ${s % 60}d`;
};
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="neo p-3" style={{ background: accent }}>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="text-xs font-bold uppercase mt-1 opacity-80">{label}</div>
    </div>
  );
}

export function StatsTab() {
  const { t } = useLang();
  const [current, setCurrent] = useState<SessionSummary | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.statsCurrent(), api.statsSessions(20)]);
      setCurrent(c.session);
      setSessions(s.entries);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const past = sessions.filter((s) => !s.live);

  return (
    <div className="grid gap-5 items-start">
      {/* SESI SEKARANG */}
      <Card
        title={
          current
            ? t("📊 Sesi Sekarang {live}", { live: current.live ? t("🔴 LIVE") : "" })
            : t("📊 Sesi Sekarang")
        }
        accent="var(--green)"
      >
        {!current ? (
          <p className="opacity-60 text-sm">
            {t("Belum ada sesi. Mulai pemantauan di tab")} <b>{t("📡 Monitor")}</b>{" "}
            {t("untuk merekam statistik.")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-3 text-sm">
              <Tag>{current.title || t("Tanpa judul")}</Tag>
              <span className="opacity-70">{t("Mulai {time}", { time: fmtTime(current.startedAt) })}</span>
              <span className="opacity-70">{t("· Durasi {dur}", { dur: fmtDur(current.durationMs) })}</span>
              <Button color="white" className="!px-2 !py-1 text-xs" onClick={load}>
                ↻
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label={t("Chat")} value={current.chats} accent="var(--cyan)" />
              <Stat label={t("Alert")} value={current.alerts} accent="var(--pink)" />
              <Stat label={t("Reward")} value={current.rewards} accent="var(--yellow)" />
              <Stat label={t("Penonton baru")} value={current.newViewers} accent="#c4f0c5" />
              <Stat label={t("Point dibagi")} value={current.pointsAwarded} accent="var(--yellow)" />
              <Stat label={t("Point dipakai")} value={current.pointsSpent} accent="var(--pink)" />
            </div>
            {current.topSpenders.length > 0 && (
              <div className="mt-4">
                <div className="font-extrabold uppercase text-sm mb-2">{t("🔥 Top Spender")}</div>
                <div className="flex flex-col gap-1">
                  {current.topSpenders.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-black w-5">{i + 1}.</span>
                      <span className="font-bold flex-1 truncate">{t.name}</span>
                      <span className="font-black">{t.spent} 🪙</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* RIWAYAT SESI */}
      <Card title={t("📚 Riwayat Sesi ({n})", { n: past.length })} accent="var(--cyan)">
        {past.length === 0 ? (
          <p className="opacity-60 text-sm">{t("Belum ada sesi selesai.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr className="uppercase text-xs" style={{ borderBottom: "3px solid #000" }}>
                  <th className="text-left p-2">{t("Mulai")}</th>
                  <th className="text-left p-2">{t("Judul")}</th>
                  <th className="text-right p-2">{t("Durasi")}</th>
                  <th className="text-right p-2">{t("Chat")}</th>
                  <th className="text-right p-2">{t("Alert")}</th>
                  <th className="text-right p-2">{t("Reward")}</th>
                  <th className="text-right p-2">{t("Dibagi")}</th>
                  <th className="text-right p-2">{t("Dipakai")}</th>
                </tr>
              </thead>
              <tbody>
                {past.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(0,0,0,.15)" }}>
                    <td className="p-2 whitespace-nowrap opacity-70">{fmtTime(s.startedAt)}</td>
                    <td className="p-2" style={{ maxWidth: 200 }}>
                      <div className="truncate">{s.title || "—"}</div>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">{fmtDur(s.durationMs)}</td>
                    <td className="p-2 text-right">{s.chats}</td>
                    <td className="p-2 text-right">{s.alerts}</td>
                    <td className="p-2 text-right">{s.rewards}</td>
                    <td className="p-2 text-right font-bold">{s.pointsAwarded}</td>
                    <td className="p-2 text-right font-bold">{s.pointsSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
