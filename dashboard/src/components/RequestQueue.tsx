import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { useLang, registerDict } from "../i18n";
import { Button, Card, Tag, TextInput } from "./ui";

registerDict({
  "📋 Antrian Request ({count})": "📋 Request Queue ({count})",
  "➕ Tambah Manual": "➕ Add Manual",
  "(tanpa alert)": "(no alert)",
  "Reward (mis. Req Lagu)": "Reward (e.g. Song Req)",
  Nama: "Name",
  "Pesan (opsional)": "Message (optional)",
  Tambah: "Add",
  "↻ Refresh": "↻ Refresh",
  "Belum ada request pending.": "No pending requests yet.",
  "✅ Selesai": "✅ Done",
  "↩️ Batal + refund": "↩️ Cancel + refund",
  "🗑 Hapus": "🗑 Remove",
  "Isi reward & nama dulu": "Fill in reward & name first",
  "Request ditambahkan ✅": "Request added ✅",
  gagal: "failed",
  "Ditandai selesai ✅": "Marked as done ✅",
  "Dibatalkan, refund {refunded} 🪙": "Cancelled, refunded {refunded} 🪙",
  "Request dihapus": "Request removed",
});

interface Claim {
  id: number;
  reward_name: string;
  display_name: string;
  message: string;
  cost: number;
  status: string;
  created_at: number;
}

/** Antrian request reward + tambah manual. Dipakai di tab Reward & Monitor. */
export function RequestQueue() {
  const { t } = useLang();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [mReward, setMReward] = useState("");
  const [mName, setMName] = useState("");
  const [mMsg, setMMsg] = useState("");

  const loadClaims = useCallback(async () => {
    try {
      setClaims((await api.rewardClaims("pending")).entries as unknown as Claim[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadClaims();
    const iv = setInterval(loadClaims, 6000);
    return () => clearInterval(iv);
  }, [loadClaims]);

  async function addManual() {
    if (!mReward.trim() || !mName.trim()) {
      toast(t("Isi reward & nama dulu"), false);
      return;
    }
    try {
      // Manual → TIDAK memicu alert overlay (hanya masuk antrian).
      await api.addManualClaim({ rewardName: mReward, name: mName, message: mMsg });
      toast(t("Request ditambahkan ✅"));
      setMName("");
      setMMsg("");
      loadClaims();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }
  async function done(id: number) {
    await api.claimDone(id).catch(() => {});
    toast(t("Ditandai selesai ✅"));
    loadClaims();
  }
  async function cancel(id: number) {
    const r = await api.claimCancel(id).catch(() => null);
    toast(r ? t("Dibatalkan, refund {refunded} 🪙", { refunded: r.refunded }) : t("gagal"), !!r);
    loadClaims();
  }
  async function removeClaim(id: number) {
    await api.removeClaim(id).catch(() => {});
    toast(t("Request dihapus"));
    loadClaims();
  }

  return (
    <Card title={t("📋 Antrian Request ({count})", { count: claims.length })} accent="var(--yellow)">
      {/* Tambah request manual (tanpa alert) */}
      <div className="neo p-3 mb-3" style={{ background: "#fafaf5" }}>
        <div className="font-extrabold uppercase text-xs mb-2">{t("➕ Tambah Manual")} <span className="opacity-60 normal-case">{t("(tanpa alert)")}</span></div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <TextInput placeholder={t("Reward (mis. Req Lagu)")} value={mReward} onChange={(e) => setMReward(e.target.value)} />
          <TextInput placeholder={t("Nama")} value={mName} onChange={(e) => setMName(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <TextInput placeholder={t("Pesan (opsional)")} value={mMsg} onChange={(e) => setMMsg(e.target.value)} />
          <Button color="green" className="shrink-0" onClick={addManual}>{t("Tambah")}</Button>
        </div>
      </div>

      <div className="flex justify-end mb-2">
        <Button color="white" className="!px-2 !py-1 text-xs" onClick={loadClaims}>{t("↻ Refresh")}</Button>
      </div>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {claims.length === 0 && <p className="opacity-60 text-sm">{t("Belum ada request pending.")}</p>}
        {claims.map((c) => (
          <div key={c.id} className="neo p-2" style={{ background: "#fff" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag style={{ background: "var(--cyan)" }}>{c.reward_name}</Tag>
              <span className="font-bold text-sm">{c.display_name}</span>
              <span className="ml-auto text-xs opacity-60">{c.cost} 🪙</span>
            </div>
            {c.message && <div className="text-sm mt-1 font-semibold">"{c.message}"</div>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button color="green" className="!px-2 !py-1 text-xs" onClick={() => done(c.id)}>{t("✅ Selesai")}</Button>
              <Button color="red" className="!px-2 !py-1 text-xs" onClick={() => cancel(c.id)}>{t("↩️ Batal + refund")}</Button>
              <Button color="white" className="!px-2 !py-1 text-xs" onClick={() => removeClaim(c.id)}>{t("🗑 Hapus")}</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
