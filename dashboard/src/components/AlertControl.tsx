import { useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { useLang, registerDict } from "../i18n";
import { Button, Card, Tag } from "./ui";

registerDict({
  "🎛️ Kontrol Alert": "🎛️ Alert Control",
  "Alert dijeda ⏸️": "Alert paused ⏸️",
  "Alert aktif ▶️": "Alert active ▶️",
  gagal: "failed",
  "Alert disembunyikan 🙈": "Alert hidden 🙈",
  "▶️ Aktifkan": "▶️ Resume",
  "⏸️ Jeda Alert": "⏸️ Pause Alert",
  "🙈 Sembunyikan": "🙈 Hide",
  DIJEDA: "PAUSED",
  AKTIF: "ACTIVE",
  Jeda: "Pause",
  "diabaikan (point tak terpotong).": "ignored (points not deducted).",
  Sembunyikan: "Hide",
  "tutup alert yang lagi tampil + kosongkan antrian.":
    "close the currently showing alert + clear the queue.",
});

/** Kartu kontrol alert (Jeda / Sembunyikan) — dipakai di tab Monitor & Overlay. */
export function AlertControl() {
  const { t } = useLang();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setPaused(Boolean(s["alert.paused"]))).catch(() => {});
  }, []);

  async function togglePause() {
    const next = !paused;
    try {
      await api.putSettings({ "alert.paused": next });
      setPaused(next);
      toast(next ? t("Alert dijeda ⏸️") : t("Alert aktif ▶️"), true);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }

  async function skip() {
    try {
      await api.skipAlert();
      toast(t("Alert disembunyikan 🙈"), true);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }

  return (
    <Card title={t("🎛️ Kontrol Alert")} accent="var(--green)">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Button color={paused ? "green" : "red"} onClick={togglePause}>
          {paused ? t("▶️ Aktifkan") : t("⏸️ Jeda Alert")}
        </Button>
        <Button color="white" onClick={skip}>
          {t("🙈 Sembunyikan")}
        </Button>
        <Tag style={{ background: paused ? "var(--red)" : "var(--green)", color: paused ? "#fff" : "#000" }}>
          {paused ? t("DIJEDA") : t("AKTIF")}
        </Tag>
      </div>
      <p className="text-xs opacity-60">
        <b>{t("Jeda")}</b> = <code>!alert</code> {t("diabaikan (point tak terpotong).")}{" "}
        <b>{t("Sembunyikan")}</b> = {t("tutup alert yang lagi tampil + kosongkan antrian.")}
      </p>
    </Card>
  );
}
