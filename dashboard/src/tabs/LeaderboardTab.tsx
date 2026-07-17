import { useEffect, useState } from "react";
import type { MonitorStatus } from "@shared/types";
import { api, type LeaderboardEntry } from "../api";
import { levelFor, type Level } from "../levels";
import { Button, Card, TextInput } from "../components/ui";
import { ProfileModal } from "../components/ProfileModal";
import { useLang, registerDict } from "../i18n";

registerDict({
  "Leaderboard Point": "Points Leaderboard",
  "🔍 cari nama…": "🔍 search name…",
  "✅ Direset ({n} penonton dihapus)": "✅ Reset ({n} viewers removed)",
  "gagal reset": "reset failed",
  "↻ Refresh": "↻ Refresh",
  "🗑 Reset Point": "🗑 Reset Points",
  "Yakin hapus semua?": "Delete everything?",
  "Ya, reset": "Yes, reset",
  Batal: "Cancel",
  "Belum ada point. Jalankan monitor pada live yang aktif.":
    "No points yet. Run the monitor on an active live stream.",
  'Tidak ada nama yang cocok "{q}".': 'No name matches "{q}".',
  Nama: "Name",
  Point: "Points",
  Atur: "Adjust",
  "Lihat profil": "View profile",
});

export function LeaderboardTab({
  board,
  status,
  onRefresh,
  onBoard,
}: {
  board: LeaderboardEntry[];
  status: MonitorStatus;
  onRefresh: () => void;
  onBoard: (b: LeaderboardEntry[]) => void;
}) {
  const { t } = useLang();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  useEffect(() => {
    api.getSettings().then((s) => setLevels((s["levels"] as Level[]) ?? [])).catch(() => {});
  }, []);
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState(false);
  const shown = q
    ? board.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()))
    : board;
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  async function doReset() {
    setResetting(true);
    setResetMsg(null);
    try {
      const r = await api.resetLeaderboard();
      onBoard([]);
      setResetMsg(t("✅ Direset ({n} penonton dihapus)", { n: r.deleted }));
    } catch (e) {
      setResetMsg("❌ " + (e instanceof Error ? e.message : t("gagal reset")));
      onRefresh();
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  }

  // Adjust butuh viewer id; leaderboard tak memuatnya, jadi kita cari lewat backend
  // sederhana: adjust pakai endpoint /api/viewers/:id — tapi kita hanya punya
  // authorChannelId. Untuk MVP, adjust via nama tidak tersedia; tampilkan tombol
  // yang memanggil refresh setelah perubahan poin lewat WS.
  async function quickAdjust(entry: LeaderboardEntry, delta: number) {
    // Tidak ada id di leaderboard; lakukan optimistik lalu refresh dari server.
    setBusyId(entry.authorChannelId);
    try {
      onBoard(
        board
          .map((v) =>
            v.authorChannelId === entry.authorChannelId ? { ...v, points: v.points + delta } : v,
          )
          .sort((a, b) => b.points - a.points)
          .map((v, i) => ({ ...v, rank: i + 1 })),
      );
      await api.adjustByAuthor(entry.authorChannelId, delta);
    } catch {
      onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
    {profileId && <ProfileModal channelId={profileId} onClose={() => setProfileId(null)} />}
    <Card title={`${t("Leaderboard Point")} ${status.title ? "— " + status.title : ""}`} accent="var(--yellow)">
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70 whitespace-nowrap">{shown.length}/{board.length}</span>
          <TextInput
            placeholder={t("🔍 cari nama…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="!py-1 text-sm"
            style={{ maxWidth: 160 }}
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {resetMsg && (
            <span
              className="neo px-2 py-1 text-xs font-bold"
              style={{ background: resetMsg.startsWith("✅") ? "var(--green)" : "var(--red)", color: resetMsg.startsWith("✅") ? "#000" : "#fff" }}
            >
              {resetMsg}
            </span>
          )}
          <Button color="white" onClick={onRefresh}>
            {t("↻ Refresh")}
          </Button>
          {!confirming ? (
            <Button color="red" onClick={() => { setResetMsg(null); setConfirming(true); }}>
              {t("🗑 Reset Point")}
            </Button>
          ) : (
            <span className="flex gap-2 items-center">
              <span className="text-xs font-bold">{t("Yakin hapus semua?")}</span>
              <Button color="red" onClick={doReset} disabled={resetting}>
                {resetting ? "…" : t("Ya, reset")}
              </Button>
              <Button color="white" onClick={() => setConfirming(false)} disabled={resetting}>
                {t("Batal")}
              </Button>
            </span>
          )}
        </div>
      </div>

      {board.length === 0 ? (
        <p className="opacity-60 text-sm">{t("Belum ada point. Jalankan monitor pada live yang aktif.")}</p>
      ) : shown.length === 0 ? (
        <p className="opacity-60 text-sm">{t('Tidak ada nama yang cocok "{q}".', { q })}</p>
      ) : (
        <div className="flex flex-col">
          <div className="grid grid-cols-[48px_1fr_100px_150px] gap-2 px-2 py-1 font-black uppercase text-xs">
            <span>#</span>
            <span>{t("Nama")}</span>
            <span className="text-right">{t("Point")}</span>
            <span className="text-right">{t("Atur")}</span>
          </div>
          {shown.map((v) => (
            <div
              key={v.authorChannelId}
              className="neo-row grid grid-cols-[48px_1fr_100px_150px] gap-2 items-center px-2 py-1 border-b border-black/20"
            >
              <span className="font-black">{v.rank}</span>
              <span className="truncate font-bold flex items-center gap-1">
                {(() => {
                  const lv = levelFor(v.points, levels);
                  return lv ? (
                    <span
                      className="text-[10px] font-black px-1 shrink-0"
                      style={{ background: lv.color, border: "2px solid #000" }}
                    >
                      {lv.name}
                    </span>
                  ) : null;
                })()}
                <button
                  className="truncate text-left hover:underline"
                  title={t("Lihat profil")}
                  onClick={() => setProfileId(v.authorChannelId)}
                >
                  {v.name}
                </button>
              </span>
              <span className="text-right font-black">{v.points} 🪙</span>
              <span className="flex gap-1 justify-end">
                <Button color="white" className="!px-2 !py-1 text-xs" disabled={busyId === v.authorChannelId} onClick={() => quickAdjust(v, -10)}>
                  −10
                </Button>
                <Button color="green" className="!px-2 !py-1 text-xs" disabled={busyId === v.authorChannelId} onClick={() => quickAdjust(v, 10)}>
                  +10
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
    </>
  );
}
