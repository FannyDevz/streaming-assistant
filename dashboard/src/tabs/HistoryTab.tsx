import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { Button, Card, Tag, TextInput } from "../components/ui";
import { useLang, registerDict } from "../i18n";

registerDict({
  "Alert #{id} ditampilkan ulang ke overlay ✅": "Alert #{id} replayed to overlay ✅",
  "gagal replay": "replay failed",
  "Riwayat diekspor ✅": "History exported ✅",
  "gagal ekspor": "export failed",
  "{n} riwayat diimpor ✅": "{n} history entries imported ✅",
  "file tidak valid": "invalid file",
  "Hapus SEMUA riwayat alert? Tindakan ini tidak bisa dibatalkan.":
    "Delete ALL alert history? This action cannot be undone.",
  "{n} riwayat dihapus 🗑": "{n} history entries deleted 🗑",
  "gagal hapus": "delete failed",
  "📜 Riwayat Alert ({n})": "📜 Alert History ({n})",
  "↻ Refresh": "↻ Refresh",
  "🔍 cari nama / pesan…": "🔍 search name / message…",
  "⬇ Export": "⬇ Export",
  "⬆ Import": "⬆ Import",
  "🗑 Kosongkan": "🗑 Clear",
  "Hapus semua riwayat?": "Clear all history?",
  "Ya, hapus": "Yes, delete",
  Batal: "Cancel",
  "Auto-refresh 8 dtk": "Auto-refresh 8s",
  "Belum ada alert. Alert dari !command atau Test akan muncul di sini.":
    "No alerts yet. Alerts from !command or Test will appear here.",
  'Tidak ada yang cocok "{q}".': 'Nothing matches "{q}".',
  Waktu: "Time",
  Penonton: "Viewer",
  Pesan: "Message",
  Biaya: "Cost",
  Template: "Template",
  Status: "Status",
  Aksi: "Action",
  "▶ Tampilkan lagi": "▶ Replay",
});

interface Redemption {
  id: number;
  display_name: string;
  message: string;
  cost: number;
  template_id: number | null;
  status: string;
  created_at: number;
}

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function HistoryTab() {
  const { t } = useLang();
  const [items, setItems] = useState<Redemption[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [confirmClear, setConfirmClear] = useState(false); // konfirmasi inline (confirm() browser bisa ke-suppress)
  const importRef = useRef<HTMLInputElement>(null);
  const shown = q
    ? items.filter(
        (h) =>
          h.display_name.toLowerCase().includes(q.toLowerCase()) ||
          h.message.toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([api.redemptions(100), api.templates()]);
      setItems(r.entries as unknown as Redemption[]);
      const map: Record<number, string> = {};
      for (const tt of t.entries) map[tt.id] = tt.name;
      setNames(map);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000); // auto-refresh
    return () => clearInterval(iv);
  }, [load]);

  async function replay(id: number) {
    setMsg(null);
    try {
      await api.replayAlert(id);
      setMsg(t("Alert #{id} ditampilkan ulang ke overlay ✅", { id }));
    } catch (e) {
      setMsg("❌ " + (e instanceof Error ? e.message : t("gagal replay")));
    }
  }

  async function exportHistory() {
    try {
      const data = await api.exportHistory();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `riwayat-alert-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(t("Riwayat diekspor ✅"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal ekspor"), false);
    }
  }

  async function importHistory(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const r = await api.importHistory(parsed);
      toast(t("{n} riwayat diimpor ✅", { n: r.imported }));
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("file tidak valid"), false);
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function clearHistory() {
    setConfirmClear(false);
    try {
      const r = await api.clearHistory();
      toast(t("{n} riwayat dihapus 🗑", { n: r.cleared }));
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal hapus"), false);
    }
  }

  return (
    <Card title={t("📜 Riwayat Alert ({n})", { n: items.length })} accent="var(--green)">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button color="white" onClick={load}>
          {t("↻ Refresh")}
        </Button>
        <TextInput
          placeholder={t("🔍 cari nama / pesan…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="!py-1 text-sm"
          style={{ maxWidth: 220 }}
        />
        <Button color="cyan" onClick={exportHistory}>
          {t("⬇ Export")}
        </Button>
        <Button color="yellow" onClick={() => importRef.current?.click()}>
          {t("⬆ Import")}
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importHistory(f);
          }}
        />
        {!confirmClear ? (
          <Button color="red" onClick={() => setConfirmClear(true)}>
            {t("🗑 Kosongkan")}
          </Button>
        ) : (
          <span className="flex gap-2 items-center">
            <span className="text-xs font-bold">{t("Hapus semua riwayat?")}</span>
            <Button color="red" onClick={clearHistory}>
              {t("Ya, hapus")}
            </Button>
            <Button color="white" onClick={() => setConfirmClear(false)}>
              {t("Batal")}
            </Button>
          </span>
        )}
        <span className="text-xs opacity-60">{t("Auto-refresh 8 dtk")}</span>
        {msg && (
          <span
            className="neo px-2 py-1 text-xs font-bold"
            style={{ background: msg.startsWith("❌") ? "var(--red)" : "var(--green)", color: msg.startsWith("❌") ? "#fff" : "#000" }}
          >
            {msg}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="opacity-60 text-sm">{t("Belum ada alert. Alert dari !command atau Test akan muncul di sini.")}</p>
      ) : shown.length === 0 ? (
        <p className="opacity-60 text-sm">{t('Tidak ada yang cocok "{q}".', { q })}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr className="uppercase text-xs" style={{ borderBottom: "3px solid #000" }}>
                <th className="text-left p-2">{t("Waktu")}</th>
                <th className="text-left p-2">{t("Penonton")}</th>
                <th className="text-left p-2">{t("Pesan")}</th>
                <th className="text-right p-2">{t("Biaya")}</th>
                <th className="text-left p-2">{t("Template")}</th>
                <th className="text-left p-2">{t("Status")}</th>
                <th className="text-right p-2">{t("Aksi")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h) => (
                <tr key={h.id} className="neo-row" style={{ borderBottom: "1px solid rgba(0,0,0,.15)" }}>
                  <td className="p-2 whitespace-nowrap opacity-70">{fmtTime(h.created_at)}</td>
                  <td className="p-2 font-bold whitespace-nowrap">{h.display_name}</td>
                  <td className="p-2" style={{ maxWidth: 280 }}>
                    <div className="truncate">{h.message}</div>
                  </td>
                  <td className="p-2 text-right font-black whitespace-nowrap">{h.cost} 🪙</td>
                  <td className="p-2 whitespace-nowrap">{h.template_id != null ? names[h.template_id] ?? `#${h.template_id}` : "—"}</td>
                  <td className="p-2">
                    <Tag style={{ background: h.status === "shown" ? "var(--cyan)" : "var(--yellow)" }}>{h.status}</Tag>
                  </td>
                  <td className="p-2 text-right">
                    <Button color="pink" className="!px-2 !py-1 text-xs whitespace-nowrap" onClick={() => replay(h.id)}>
                      {t("▶ Tampilkan lagi")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
