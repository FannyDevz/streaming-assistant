import { useEffect, useState } from "react";
import { api, type ViewerProfile } from "../api";
import { useLang, registerDict } from "../i18n";
import { Button, Tag } from "./ui";

registerDict({
  "Memuat…": "Loading…",
  "Memuat profil…": "Loading profile…",
  "gagal memuat": "failed to load",
  "Rank #{rank} / {total}": "Rank #{rank} / {total}",
  "Point sekarang": "Current points",
  "Total earned": "Total earned",
  "Total alert": "Total alerts",
  "Sejak {d}": "Since {d}",
  "Terakhir {d}": "Last {d}",
  "🔔 Alert terakhir": "🔔 Recent alerts",
  "📒 Mutasi point": "📒 Points history",
  "Tutup": "Close",
  "💬 komentar": "💬 comment",
  "🔔 alert": "🔔 alert",
  "💎 superchat": "💎 superchat",
  "🌟 member": "🌟 member",
  "✏️ atur manual": "✏️ manual adjust",
});

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const REASON: Record<string, string> = {
  comment: "💬 komentar",
  alert: "🔔 alert",
  superchat: "💎 superchat",
  member: "🌟 member",
  adjust: "✏️ atur manual",
};

export function ProfileModal({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const { t } = useLang();
  const [p, setP] = useState<ViewerProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .viewerProfile({ channelId })
      .then(setP)
      .catch((e) => setErr(e instanceof Error ? e.message : t("gagal memuat")));
  }, [channelId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={onClose}
    >
      <div
        className="neo w-full max-w-lg mt-10"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3" style={{ borderBottom: "3px solid #000", background: "var(--yellow)" }}>
          <span className="font-black text-lg truncate">👤 {p?.name ?? t("Memuat…")}</span>
          <button className="font-black text-xl px-2 leading-none" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-4">
          {err ? (
            <p className="text-sm" style={{ color: "var(--red)" }}>❌ {err}</p>
          ) : !p ? (
            <p className="opacity-60 text-sm">{t("Memuat profil…")}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {p.level && (
                  <span className="text-xs font-black px-2 py-1" style={{ background: p.level.color, border: "2px solid #000" }}>
                    {p.level.name}
                  </span>
                )}
                <Tag>{t("Rank #{rank} / {total}", { rank: p.rank, total: p.totalViewers })}</Tag>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="neo p-2" style={{ background: "var(--cyan)" }}>
                  <div className="text-xl font-black">{p.points} 🪙</div>
                  <div className="text-xs font-bold uppercase opacity-80">{t("Point sekarang")}</div>
                </div>
                <div className="neo p-2" style={{ background: "var(--pink)" }}>
                  <div className="text-xl font-black">{p.totalEarned}</div>
                  <div className="text-xs font-bold uppercase opacity-80">{t("Total earned")}</div>
                </div>
                <div className="neo p-2" style={{ background: "var(--yellow)" }}>
                  <div className="text-xl font-black">{p.alertsTotal}</div>
                  <div className="text-xs font-bold uppercase opacity-80">{t("Total alert")}</div>
                </div>
                <div className="neo p-2" style={{ background: "#eee" }}>
                  <div className="text-xs font-bold">{t("Sejak {d}", { d: fmtDate(p.firstSeen) })}</div>
                  <div className="text-xs opacity-70">{t("Terakhir {d}", { d: fmtTime(p.lastSeen) })}</div>
                </div>
              </div>

              {p.recentAlerts.length > 0 && (
                <div className="mb-3">
                  <div className="font-extrabold uppercase text-xs mb-1">{t("🔔 Alert terakhir")}</div>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {p.recentAlerts.map((a) => (
                      <div key={a.id} className="text-sm flex items-center gap-2" style={{ borderBottom: "1px solid rgba(0,0,0,.12)" }}>
                        <span className="opacity-60 text-xs whitespace-nowrap">{fmtTime(a.created_at)}</span>
                        <span className="truncate flex-1">{a.message}</span>
                        <span className="font-bold whitespace-nowrap">{a.cost} 🪙</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.ledger.length > 0 && (
                <div>
                  <div className="font-extrabold uppercase text-xs mb-1">{t("📒 Mutasi point")}</div>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {p.ledger.map((l, i) => (
                      <div key={i} className="text-sm flex items-center gap-2">
                        <span className="opacity-60 text-xs whitespace-nowrap">{fmtTime(l.created_at)}</span>
                        <span className="flex-1 truncate opacity-80">{t(REASON[l.reason] ?? l.reason)}</span>
                        <span className="font-black whitespace-nowrap" style={{ color: l.delta >= 0 ? "#16a34a" : "#dc2626" }}>
                          {l.delta >= 0 ? "+" : ""}{l.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3" style={{ borderTop: "3px solid #000" }}>
          <Button color="white" onClick={onClose}>{t("Tutup")}</Button>
        </div>
      </div>
    </div>
  );
}
