import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { Button, Card, Field, TextInput } from "../components/ui";
import { useLang, registerDict } from "../i18n";

registerDict({
  "Isi nama & pilih file audio": "Enter a name & pick an audio file",
  "Sound ditambahkan ✅": "Sound added ✅",
  gagal: "failed",
  "▶️ diputar": "▶️ playing",
  "Sound dihapus": "Sound deleted",
  "⏹ Suara dihentikan": "⏹ Sounds stopped",
  "🔊 Soundboard": "🔊 Soundboard",
  "Tekan tombol → sound diputar di": "Press a button → sound plays on the",
  "overlay Alert": "Alert overlay",
  "(OBS). Pastikan overlay": "(OBS). Make sure the",
  "terpasang di OBS.": "overlay is installed in OBS.",
  "⏹ Stop & Sembunyikan": "⏹ Stop & Hide",
  "🔊 Dengar di sini": "🔊 Listen here",
  "Tombol Stop menghentikan semua suara + tutup GIF di overlay. Centang":
    "The Stop button halts all sounds + hides the GIF in the overlay. Check",
  '"Dengar di sini"': '"Listen here"',
  "untuk memutar juga di dashboard (berguna kalau overlay belum dibuka di OBS).":
    "to also play in the dashboard (useful if the overlay isn't open in OBS yet).",
  "Belum ada sound. Tambah di kanan.": "No sounds yet. Add one on the right.",
  "GIF tampil di overlay": "GIF shows in the overlay",
  "➕ Tambah Sound": "➕ Add Sound",
  "Nama tombol": "Button name",
  "mis. Tepuk Tangan 👏": "e.g. Applause 👏",
  "File audio (mp3/wav/ogg)": "Audio file (mp3/wav/ogg)",
  "GIF/gambar (opsional)": "GIF/image (optional)",
  "Kalau diisi, GIF/gambar akan muncul di overlay Alert selama suara diputar.":
    "If set, the GIF/image will appear in the Alert overlay while the sound plays.",
  "💾 Simpan Sound": "💾 Save Sound",
});

interface Sound {
  id: number;
  name: string;
  url: string;
  imageUrl: string | null;
}

// URL server (audio disajikan dari :4300, dashboard bisa di :4301).
const SERVER_BASE =
  location.port === "4301" ? `${location.protocol}//${location.hostname}:4300` : location.origin;

export function SoundboardTab() {
  const { t } = useLang();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    try {
      setSounds((await api.sounds()).entries);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    const file = fileRef.current?.files?.[0];
    if (!name.trim() || !file) {
      toast(t("Isi nama & pilih file audio"), false);
      return;
    }
    setBusy(true);
    try {
      const up = await api.uploadFile(file, "sound");
      const imgFile = imgRef.current?.files?.[0];
      let imagePath: string | null = null;
      if (imgFile) {
        imagePath = (await api.uploadFile(imgFile, "image")).filename;
      }
      await api.createSound(name.trim(), up.filename, imagePath);
      toast(t("Sound ditambahkan ✅"));
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      if (imgRef.current) imgRef.current.value = "";
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    } finally {
      setBusy(false);
    }
  }
  async function play(id: number) {
    const s = sounds.find((x) => x.id === id);
    // Preview lokal: klik tombol = user-gesture, jadi suara pasti bunyi di sini.
    if (preview && s) {
      try {
        if (previewAudio.current) {
          previewAudio.current.pause();
        }
        const a = new Audio(SERVER_BASE + s.url);
        previewAudio.current = a;
        a.play().catch(() => {});
      } catch {
        /* abaikan */
      }
    }
    await api.playSound(id).catch(() => {});
    toast(t("▶️ diputar"));
  }
  async function remove(id: number) {
    await api.deleteSound(id).catch(() => {});
    toast(t("Sound dihapus"));
    load();
  }
  async function stopAll() {
    if (previewAudio.current) {
      try {
        previewAudio.current.pause();
        previewAudio.current.currentTime = 0;
      } catch {
        /* abaikan */
      }
    }
    await api.stopSounds().catch(() => {});
    toast(t("⏹ Suara dihentikan"));
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      <Card title={t("🔊 Soundboard")} accent="var(--pink)">
        <p className="text-sm opacity-70 mb-3">
          {t("Tekan tombol → sound diputar di")} <b>{t("overlay Alert")}</b> {t("(OBS). Pastikan overlay")}{" "}
          <code>/overlay/</code> {t("terpasang di OBS.")}
        </p>
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <Button color="red" onClick={stopAll}>
            {t("⏹ Stop & Sembunyikan")}
          </Button>
          <label className="flex items-center gap-1 text-sm font-bold cursor-pointer select-none">
            <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
            {t("🔊 Dengar di sini")}
          </label>
        </div>
        <p className="text-xs opacity-60 -mt-2 mb-3">
          {t("Tombol Stop menghentikan semua suara + tutup GIF di overlay. Centang")}{" "}
          <b>{t('"Dengar di sini"')}</b>{" "}
          {t("untuk memutar juga di dashboard (berguna kalau overlay belum dibuka di OBS).")}
        </p>
        {sounds.length === 0 ? (
          <p className="opacity-60 text-sm">{t("Belum ada sound. Tambah di kanan.")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sounds.map((s) => (
              <div key={s.id} className="neo p-2 flex items-center gap-2" style={{ background: "#fff" }}>
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt=""
                    title={t("GIF tampil di overlay")}
                    className="w-8 h-8 shrink-0 object-cover"
                    style={{ border: "2px solid #000" }}
                  />
                ) : null}
                <Button color="green" className="flex-1 truncate" onClick={() => play(s.id)}>
                  ▶️ {s.name}
                </Button>
                <button className="text-xs opacity-50 hover:opacity-100 shrink-0" onClick={() => remove(s.id)}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={t("➕ Tambah Sound")} accent="var(--cyan)">
        <Field label={t("Nama tombol")}>
          <TextInput placeholder={t("mis. Tepuk Tangan 👏")} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("File audio (mp3/wav/ogg)")}>
          <input ref={fileRef} type="file" accept="audio/*" className="neo-input text-xs" />
        </Field>
        <Field label={t("GIF/gambar (opsional)")}>
          <input ref={imgRef} type="file" accept="image/*,image/gif" className="neo-input text-xs" />
        </Field>
        <p className="text-xs opacity-60 mb-2">
          {t("Kalau diisi, GIF/gambar akan muncul di overlay Alert selama suara diputar.")}
        </p>
        <Button color="green" onClick={add} disabled={busy}>
          {t("💾 Simpan Sound")}
        </Button>
      </Card>
    </div>
  );
}
