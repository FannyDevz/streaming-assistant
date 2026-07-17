import { useEffect, useMemo, useState } from "react";
import type { AlertTemplate } from "@shared/types";
import { api, type TemplateBody } from "../api";
import { Button, Card, Field, Tag, TextInput } from "../components/ui";
import { useLang, registerDict } from "../i18n";

registerDict({
  "upload gagal": "upload failed",
  'Command "{cmd}" sudah dipakai template "{name}".': 'Command "{cmd}" is already used by template "{name}".',
  "Tersimpan ✅": "Saved ✅",
  "gagal simpan": "save failed",
  "Hapus template ini?": "Delete this template?",
  "Yakin hapus?": "Delete for sure?",
  "Ya, hapus": "Yes, delete",
  Batal: "Cancel",
  "Template dihapus 🗑": "Template deleted 🗑",
  "gagal hapus": "delete failed",
  "Terkirim ke overlay (antrian {n}) ✅": "Sent to overlay (queue {n}) ✅",
  "gagal": "failed",
  "Pesan alert muncul di sini": "Alert message appears here",
  "🎬 Video YouTube diputar": "🎬 YouTube video playing",
  "Template": "Template",
  "no cmd": "no cmd",
  "+ Template Baru": "+ New Template",
  "Test Alert": "Test Alert",
  "Nama": "Name",
  "Pesan": "Message",
  "🔔 Kirim Test": "🔔 Send Test",
  "Overlay": "Overlay",
  "Riwayat alert & tombol tampilkan-ulang ada di tab": "Alert history & replay button are in the tab",
  "📜 Riwayat": "📜 History",
  "Editor — Template Baru": "Editor — New Template",
  "Editor — #{id}": "Editor — #{id}",
  "Preview": "Preview",
  "Nama template": "Template name",
  "Command chat": "Chat command",
  "mis. !alert / !clip (kosong = tak bisa dipicu)": "e.g. !alert / !clip (empty = cannot be triggered)",
  "Biaya (point)": "Cost (points)",
  "Animasi": "Animation",
  "Posisi": "Position",
  "Durasi (ms)": "Duration (ms)",
  "TTS (baca pesan)": "TTS (read message)",
  "Aktif": "On",
  "Mati": "Off",
  "Warna teks": "Text color",
  "Warna background": "Background color",
  "Gambar / GIF": "Image / GIF",
  "GIF tampil besar (seperti video).": "GIF shows large (like a video).",
  "Gambar": "Image",
  "Ikon kecil di samping teks.": "Small icon beside the text.",
  "GIF": "GIF",
  "Tampil besar seperti video.": "Shows large like a video.",
  "Hapus GIF": "Remove GIF",
  "Suara": "Sound",
  "🎬 Video YouTube (opsional)": "🎬 YouTube Video (optional)",
  "URL / ID video": "Video URL / ID",
  "https://youtu.be/… atau ID": "https://youtu.be/… or ID",
  "Mulai detik ke-": "Start at second",
  "Kalau diisi, video diputar saat alert muncul.": "If filled, the video plays when the alert appears.",
  "Durasi": "Duration",
  "di atas jadi batas berapa lama video diputar (maks 120 dtk); alert menutup saat video selesai atau durasi tercapai.":
    "above sets how long the video plays (max 120 sec); the alert closes when the video ends or the duration is reached.",
  "💾 Simpan": "💾 Save",
  "🗑 Hapus": "🗑 Delete",
  "Bersihkan media": "Clear media",
});

interface Form extends TemplateBody {
  imageUrl?: string;
  gifUrl?: string;
  soundUrl?: string;
}

const EMPTY: Form = {
  name: "Alert Baru",
  command: "!alert",
  cost: 50,
  durationMs: 6000,
  animation: "slide",
  position: "top",
  textColor: "#000000",
  bgColor: "#ffde00",
  ttsEnabled: true,
  imagePath: null,
  gifPath: null,
  soundPath: null,
  youtubeUrl: "",
  youtubeStart: 0,
};

const stripPrefix = (url?: string) => (url ? url.replace("/uploads/", "") : null);

export function TemplatesTab() {
  const { t } = useLang();
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [form, setForm] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false); // konfirmasi hapus INLINE (confirm() browser bisa ke-suppress)

  // Test alert
  const [testName, setTestName] = useState("@donatur");
  const [testMsg, setTestMsg] = useState("Semangat streaming-nya! 🔥");

  async function reload(selectAfter?: number) {
    const r = await api.templates();
    setTemplates(r.entries);
    if (selectAfter != null) {
      const t = r.entries.find((x) => x.id === selectAfter);
      if (t) selectTemplate(t);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function selectTemplate(t: AlertTemplate) {
    setSelectedId(t.id);
    setForm({
      name: t.name,
      command: t.command ?? "",
      cost: t.cost ?? 0,
      durationMs: t.durationMs,
      animation: t.animation,
      position: t.position,
      textColor: t.textColor,
      bgColor: t.bgColor,
      ttsEnabled: t.ttsEnabled,
      imagePath: stripPrefix(t.imageUrl),
      gifPath: stripPrefix(t.gifUrl),
      soundPath: stripPrefix(t.soundUrl),
      imageUrl: t.imageUrl,
      gifUrl: t.gifUrl,
      soundUrl: t.soundUrl,
      youtubeUrl: t.youtubeId ? `https://youtu.be/${t.youtubeId}` : "",
      youtubeStart: t.youtubeStart ?? 0,
    });
    setMsg(null);
    setConfirmDel(false);
  }

  function newTemplate() {
    setSelectedId("new");
    setForm(EMPTY);
    setMsg(null);
    setConfirmDel(false);
  }

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function onUpload(file: File | undefined, target: "image" | "gif" | "sound") {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      // GIF di-upload sebagai file gambar juga, hanya disimpan di field terpisah.
      const r = await api.uploadFile(file, target === "sound" ? "sound" : "image");
      if (target === "image") patch({ imagePath: r.filename, imageUrl: r.url });
      else if (target === "gif") patch({ gifPath: r.filename, gifUrl: r.url });
      else patch({ soundPath: r.filename, soundUrl: r.url });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("upload gagal") });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    // Validasi: command chat tidak boleh sama dengan template lain.
    const cmd = (form.command ?? "").trim().toLowerCase();
    if (cmd) {
      const clash = templates.find(
        (t) => (t.command ?? "").trim().toLowerCase() === cmd && t.id !== selectedId,
      );
      if (clash) {
        setMsg({
          ok: false,
          text: t('Command "{cmd}" sudah dipakai template "{name}".', { cmd: form.command ?? "", name: clash.name }),
        });
        return;
      }
    }

    setBusy(true);
    setMsg(null);
    const body: TemplateBody = {
      name: form.name,
      command: (form.command ?? "").trim(),
      cost: Number(form.cost) || 0,
      durationMs: Number(form.durationMs),
      animation: form.animation,
      position: form.position,
      textColor: form.textColor,
      bgColor: form.bgColor,
      ttsEnabled: form.ttsEnabled,
      imagePath: form.imagePath ?? null,
      gifPath: form.gifPath ?? null,
      soundPath: form.soundPath ?? null,
      youtubeUrl: form.youtubeUrl ?? "",
      youtubeStart: Number(form.youtubeStart) || 0,
    };
    try {
      const saved =
        selectedId === "new"
          ? await api.createTemplate(body)
          : await api.updateTemplate(selectedId, body);
      // reload dulu (memilih ulang template → sempat setMsg(null)), baru tampilkan sukses.
      await reload(saved.id);
      setMsg({ ok: true, text: t("Tersimpan ✅") });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("gagal simpan") });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (selectedId === "new") return;
    setBusy(true);
    setConfirmDel(false);
    try {
      await api.deleteTemplate(selectedId);
      newTemplate();
      await reload();
      setMsg({ ok: true, text: t("Template dihapus 🗑") });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("gagal hapus") });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setMsg(null);
    try {
      const templateId = selectedId === "new" ? undefined : selectedId;
      const r = await api.testAlert({ name: testName, message: testMsg, templateId });
      setMsg({ ok: true, text: t("Terkirim ke overlay (antrian {n}) ✅", { n: r.queued }) });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("gagal") });
    }
  }

  const preview = useMemo(
    () => (
      <div
        style={{
          background: form.bgColor,
          color: form.textColor,
          border: "4px solid #000",
          boxShadow: "8px 8px 0 #000",
          padding: "16px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        {form.imageUrl && (
          <img
            src={form.imageUrl}
            alt=""
            style={{
              width: 64,
              height: 64,
              objectFit: "cover",
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              background: "#fff",
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-block",
              background: "#000",
              color: form.bgColor,
              fontWeight: 900,
              textTransform: "uppercase",
              padding: "3px 10px",
              border: "2px solid #000",
              transform: "rotate(-1.5deg)",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            {testName}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, wordBreak: "break-word" }}>
            {testMsg || t("Pesan alert muncul di sini")}
          </div>
          {form.youtubeUrl && (
            <div
              style={{
                marginTop: 8,
                display: "inline-block",
                background: "#ff0000",
                color: "#fff",
                fontWeight: 900,
                fontSize: 12,
                padding: "3px 8px",
                border: "2px solid #000",
              }}
            >
              {t("🎬 Video YouTube diputar")}
            </div>
          )}
        </div>
      </div>
    ),
    [form, testName, testMsg, t],
  );

  const noCmdLabel = t("no cmd");

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      {/* Kiri: daftar + test */}
      <div className="flex flex-col gap-5">
        <Card title={t("Template")} accent="var(--cyan)">
          <div className="flex flex-col gap-2 mb-3">
            {templates.map((t) => (
              <button
                key={t.id}
                className="neo p-2 text-left flex items-center gap-2"
                style={{ background: selectedId === t.id ? t.bgColor : "#fff" }}
                onClick={() => selectTemplate(t)}
              >
                <span
                  className="w-7 h-7 grid place-items-center font-black text-xs"
                  style={{ border: "2px solid #000", background: t.bgColor, color: t.textColor }}
                >
                  {t.id}
                </span>
                <span className="font-extrabold">{t.name}</span>
                <span className="ml-auto text-xs font-bold text-right">
                  {t.command ? <code>{t.command}</code> : <span className="opacity-50">{noCmdLabel}</span>}
                  <br />
                  <span className="opacity-70">{t.cost} 🪙</span>
                  {t.youtubeId && <span> · 🎬</span>}
                </span>
              </button>
            ))}
          </div>
          <Button color="pink" onClick={newTemplate}>
            {t("+ Template Baru")}
          </Button>
        </Card>

        <Card title={t("Test Alert")} accent="var(--yellow)">
          <Field label={t("Nama")}>
            <TextInput value={testName} onChange={(e) => setTestName(e.target.value)} />
          </Field>
          <Field label={t("Pesan")}>
            <TextInput value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
          </Field>
          <Button color="green" onClick={test}>
            {t("🔔 Kirim Test")} {selectedId !== "new" ? `(template #${selectedId})` : ""}
          </Button>
          <div className="mt-3 text-sm">
            <Tag>{t("Overlay")}</Tag>
            <code className="ml-2 select-all">http://localhost:4300/overlay/</code>
          </div>
          <p className="mt-2 text-xs opacity-60">{t("Riwayat alert & tombol tampilkan-ulang ada di tab")} <b>{t("📜 Riwayat")}</b>.</p>
        </Card>
      </div>

      {/* Kanan: editor + preview */}
      <Card title={selectedId === "new" ? t("Editor — Template Baru") : t("Editor — #{id}", { id: selectedId })} accent="var(--pink)">
        <div className="mb-4">
          <span className="block mb-1 font-extrabold text-sm uppercase">{t("Preview")}</span>
          {preview}
        </div>

        <Field label={t("Nama template")}>
          <TextInput value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Command chat")}>
            <TextInput
              placeholder={t("mis. !alert / !clip (kosong = tak bisa dipicu)")}
              value={form.command ?? ""}
              onChange={(e) => patch({ command: e.target.value })}
            />
          </Field>
          <Field label={t("Biaya (point)")}>
            <TextInput
              type="number"
              value={String(form.cost ?? 0)}
              onChange={(e) => patch({ cost: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Animasi")}>
            <select
              className="neo-input"
              value={form.animation}
              onChange={(e) => patch({ animation: e.target.value as Form["animation"] })}
            >
              <option value="slide">slide</option>
              <option value="pop">pop</option>
              <option value="fade">fade</option>
            </select>
          </Field>
          <Field label={t("Posisi")}>
            <select
              className="neo-input"
              value={form.position}
              onChange={(e) => patch({ position: e.target.value as Form["position"] })}
            >
              <option value="top">top</option>
              <option value="center">center</option>
              <option value="bottom">bottom</option>
            </select>
          </Field>
          <Field label={t("Durasi (ms)")}>
            <TextInput
              type="number"
              value={String(form.durationMs)}
              onChange={(e) => patch({ durationMs: Number(e.target.value) })}
            />
          </Field>
          <Field label={t("TTS (baca pesan)")}>
            <label className="flex items-center gap-2 font-bold mt-2">
              <input
                type="checkbox"
                checked={form.ttsEnabled}
                onChange={(e) => patch({ ttsEnabled: e.target.checked })}
                style={{ width: 20, height: 20 }}
              />
              {form.ttsEnabled ? t("Aktif") : t("Mati")}
            </label>
          </Field>
          <Field label={t("Warna teks")}>
            <input
              type="color"
              className="neo-input"
              style={{ height: 42, padding: 2 }}
              value={form.textColor}
              onChange={(e) => patch({ textColor: e.target.value })}
            />
          </Field>
          <Field label={t("Warna background")}>
            <input
              type="color"
              className="neo-input"
              style={{ height: 42, padding: 2 }}
              value={form.bgColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label={`${t("Gambar")} ${form.imagePath ? "✓" : ""}`}>
            <input
              type="file"
              accept="image/*"
              className="neo-input text-xs"
              onChange={(e) => onUpload(e.target.files?.[0], "image")}
            />
            <p className="text-[11px] opacity-60 mt-1">{t("Ikon kecil di samping teks.")}</p>
          </Field>
          <Field label={`${t("GIF")} ${form.gifPath ? "✓" : ""}`}>
            <input
              type="file"
              accept="image/gif,image/*"
              className="neo-input text-xs"
              onChange={(e) => onUpload(e.target.files?.[0], "gif")}
            />
            <p className="text-[11px] opacity-60 mt-1">{t("Tampil besar seperti video.")}</p>
          </Field>
          <Field label={`${t("Suara")} ${form.soundPath ? "✓" : ""}`}>
            <input
              type="file"
              accept="audio/*"
              className="neo-input text-xs"
              onChange={(e) => onUpload(e.target.files?.[0], "sound")}
            />
          </Field>
        </div>
        {form.gifPath && (
          <div className="mt-1 flex items-center gap-2">
            <img src={form.gifUrl} alt="" style={{ maxHeight: 60, border: "2px solid #000" }} />
            <button
              className="text-xs font-bold underline"
              onClick={() => patch({ gifPath: null, gifUrl: undefined })}
            >
              {t("Hapus GIF")}
            </button>
          </div>
        )}

        {/* Video YouTube */}
        <div className="mt-1 mb-1 p-3" style={{ border: "2px dashed #000", background: "#fafaf5" }}>
          <div className="font-extrabold text-sm uppercase mb-2">{t("🎬 Video YouTube (opsional)")}</div>
          <Field label={t("URL / ID video")}>
            <TextInput
              placeholder={t("https://youtu.be/… atau ID")}
              value={form.youtubeUrl ?? ""}
              onChange={(e) => patch({ youtubeUrl: e.target.value })}
            />
          </Field>
          <Field label={t("Mulai detik ke-")}>
            <TextInput
              type="number"
              value={String(form.youtubeStart ?? 0)}
              onChange={(e) => patch({ youtubeStart: Number(e.target.value) || 0 })}
            />
          </Field>
          <p className="text-xs opacity-60">
            {t("Kalau diisi, video diputar saat alert muncul.")} <b>{t("Durasi")}</b>{" "}
            {t(
              "di atas jadi batas berapa lama video diputar (maks 120 dtk); alert menutup saat video selesai atau durasi tercapai.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Button color="green" onClick={save} disabled={busy}>
            {t("💾 Simpan")}
          </Button>
          {selectedId !== "new" &&
            (!confirmDel ? (
              <Button color="red" onClick={() => { setMsg(null); setConfirmDel(true); }} disabled={busy}>
                {t("🗑 Hapus")}
              </Button>
            ) : (
              <span className="flex gap-2 items-center">
                <span className="text-xs font-bold">{t("Yakin hapus?")}</span>
                <Button color="red" onClick={remove} disabled={busy}>
                  {t("Ya, hapus")}
                </Button>
                <Button color="white" onClick={() => setConfirmDel(false)} disabled={busy}>
                  {t("Batal")}
                </Button>
              </span>
            ))}
          {(form.imagePath || form.gifPath || form.soundPath || form.youtubeUrl) && (
            <Button
              color="white"
              onClick={() =>
                patch({
                  imagePath: null,
                  imageUrl: undefined,
                  gifPath: null,
                  gifUrl: undefined,
                  soundPath: null,
                  soundUrl: undefined,
                  youtubeUrl: "",
                })
              }
            >
              {t("Bersihkan media")}
            </Button>
          )}
          {msg && (
            <span
              className="neo px-3 py-1 font-bold text-sm"
              style={{ background: msg.ok ? "var(--green)" : "var(--red)", color: msg.ok ? "#000" : "#fff" }}
            >
              {msg.text}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
