import { useCallback, useEffect, useState } from "react";
import { api, type Reward, type RewardBody } from "../api";
import { toast } from "../toast";
import { Button, Card, Field, TextInput } from "../components/ui";
import { RequestQueue } from "../components/RequestQueue";
import { useLang, registerDict } from "../i18n";

registerDict({
  "🎁 Reward": "🎁 Reward",
  "Belum ada reward.": "No rewards yet.",
  "+ Reward Baru": "+ New Reward",
  "Reward Baru": "New Reward",
  "Edit #{n}": "Edit #{n}",
  Nama: "Name",
  "Command chat": "Chat command",
  "Biaya (point)": "Cost (points)",
  "Petunjuk (mis. 'judul lagu')": "Hint (e.g. 'song title')",
  Aktif: "Active",
  "🔔 Tampilkan alert saat ditukar": "🔔 Show alert when redeemed",
  "💾 Simpan": "💾 Save",
  "🗑 Hapus": "🗑 Delete",
  "Reward tersimpan ✅": "Reward saved ✅",
  "gagal simpan": "failed to save",
  "Reward dihapus": "Reward deleted",
  gagal: "failed",
});

const EMPTY: RewardBody = { name: "Reward Baru", command: "!reward", cost: 100, prompt: "", enabled: true, alert: true };

export function RewardTab() {
  const { t } = useLang();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [sel, setSel] = useState<number | "new">("new");
  const [form, setForm] = useState<RewardBody>(EMPTY);

  const loadRewards = useCallback(async () => {
    try {
      setRewards((await api.rewards()).entries);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  function patch(p: Partial<RewardBody>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function selectReward(r: Reward) {
    setSel(r.id);
    setForm({ name: r.name, command: r.command, cost: r.cost, prompt: r.prompt, enabled: r.enabled, alert: r.alert });
  }
  async function save() {
    try {
      const r = sel === "new" ? await api.createReward(form) : await api.updateReward(sel, form);
      toast(t("Reward tersimpan ✅"));
      await loadRewards();
      selectReward(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal simpan"), false);
    }
  }
  async function remove() {
    if (sel === "new") return;
    try {
      await api.deleteReward(sel);
      toast(t("Reward dihapus"));
      setSel("new");
      setForm(EMPTY);
      await loadRewards();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      <Card title={t("🎁 Reward")} accent="var(--pink)">
        <div className="flex flex-col gap-2 mb-3">
          {rewards.map((r) => (
            <button
              key={r.id}
              className="neo p-2 text-left flex items-center gap-2"
              style={{ background: sel === r.id ? "var(--yellow)" : "#fff", opacity: r.enabled ? 1 : 0.5 }}
              onClick={() => selectReward(r)}
            >
              <span className="font-extrabold">{r.name}</span>
              <span className="ml-auto text-xs font-bold">
                <code>{r.command}</code> · {r.cost} 🪙{r.alert ? " · 🔔" : ""}
                {r.enabled ? "" : " · off"}
              </span>
            </button>
          ))}
          {rewards.length === 0 && <p className="opacity-60 text-sm">{t("Belum ada reward.")}</p>}
        </div>
        <Button color="cyan" onClick={() => { setSel("new"); setForm(EMPTY); }}>
          {t("+ Reward Baru")}
        </Button>

        <div className="mt-4 pt-4" style={{ borderTop: "3px solid #000" }}>
          <div className="font-extrabold uppercase text-sm mb-2">
            {sel === "new" ? t("Reward Baru") : t("Edit #{n}", { n: sel })}
          </div>
          <Field label={t("Nama")}>
            <TextInput value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Command chat")}>
              <TextInput value={form.command} onChange={(e) => patch({ command: e.target.value })} />
            </Field>
            <Field label={t("Biaya (point)")}>
              <TextInput
                type="number"
                value={String(form.cost)}
                onChange={(e) => patch({ cost: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <Field label={t("Petunjuk (mis. 'judul lagu')")}>
            <TextInput value={form.prompt} onChange={(e) => patch({ prompt: e.target.value })} />
          </Field>
          <div className="flex gap-4 flex-wrap mb-3">
            <label className="flex items-center gap-2 font-bold text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => patch({ enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              {t("Aktif")}
            </label>
            <label className="flex items-center gap-2 font-bold text-sm">
              <input type="checkbox" checked={form.alert} onChange={(e) => patch({ alert: e.target.checked })} style={{ width: 18, height: 18 }} />
              {t("🔔 Tampilkan alert saat ditukar")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button color="green" onClick={save}>{t("💾 Simpan")}</Button>
            {sel !== "new" && <Button color="red" onClick={remove}>{t("🗑 Hapus")}</Button>}
          </div>
        </div>
      </Card>

      <RequestQueue />
    </div>
  );
}
