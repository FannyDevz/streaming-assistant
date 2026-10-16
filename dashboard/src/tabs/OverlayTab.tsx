import { useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { Button, Card, Field, Tag, TextInput } from "../components/ui";
import { AlertControl } from "../components/AlertControl";
import { useLang, registerDict } from "../i18n";

registerDict({
  "✓ tersalin": "✓ copied",
  "📋 salin": "📋 copy",
  "📺 Pasang tiap URL di bawah sebagai": "📺 Add each URL below as a",
  "Browser Source": "Browser Source",
  "di OBS (ukuran 1920×1080, latar transparan). Pratinjau di kanan menunjukkan tampilan aslinya.":
    "in OBS (size 1920×1080, transparent background). The preview on the right shows the actual look.",
  "🔔 Overlay Alert": "🔔 Alert Overlay",
  "Notif ala Saweria tiap": "Saweria-style notif on every",
  ". Pasang sebagai Browser Source di OBS.": ". Add as a Browser Source in OBS.",
  "URL OBS": "OBS URL",
  "Nama (test)": "Name (test)",
  "Pesan (test)": "Message (test)",
  "🔔 Kirim Test": "🔔 Send Test",
  Pratinjau: "Preview",
  "💬 Overlay Live Chat": "💬 Live Chat Overlay",
  "Kotak chat di layar. Muncul otomatis saat monitor aktif.":
    "On-screen chat box. Appears automatically when the monitor is active.",
  "📰 Ticker Event Terbaru": "📰 Latest Event Ticker",
  "Bar berjalan berisi alert terbaru (cocok di bawah layar).":
    "Scrolling bar with the latest alerts (fits at the bottom of the screen).",
  "📋 Overlay Antrian Request": "📋 Request Queue Overlay",
  "Daftar request reward (Req Lagu, Hero, dll) yang belum dikerjakan, tampil di layar. Atur jumlah & posisi:":
    "List of pending reward requests (Song Req, Hero, etc.) shown on screen. Set count & position:",
  "Jumlah request": "Request count",
  Posisi: "Position",
  "kanan atas": "top right",
  "kiri atas": "top left",
  "kanan bawah": "bottom right",
  "kiri bawah": "bottom left",
  "Panel pakai posisi sudut di atas. Ticker cuma": "Panel uses the corner position above. Ticker only",
  "atas/bawah": "top/bottom",
  "(dari pilihan posisi:": "(from position choice:",
  atas: "top",
  bawah: "bottom",
  "Panel (URL OBS)": "Panel (OBS URL)",
  "Ticker berjalan (URL OBS)": "Scrolling ticker (OBS URL)",
  Panel: "Panel",
  Ticker: "Ticker",
  "🏆 Overlay Leaderboard": "🏆 Leaderboard Overlay",
  "Papan point kompak, update live. Atur jumlah & posisi:":
    "Compact points board, live updates. Set count & position:",
  "Jumlah baris": "Row count",
  "Halaman penonton": "Viewer page",
  "📊 Goal Bar": "📊 Goal Bar",
  "Tampilkan goal bar": "Show goal bar",
  Judul: "Title",
  Target: "Target",
  Sumber: "Source",
  "Total point (otomatis)": "Total points (auto)",
  Manual: "Manual",
  "Progress sekarang": "Current progress",
  "📢 Running Text": "📢 Running Text",
  "Teks bebas berjalan (pengumuman, jadwal, dll). Pisah beberapa pesan dengan":
    "Free scrolling text (announcements, schedules, etc.). Separate multiple messages with",
  Label: "Label",
  "Teks (pisah dengan |)": "Text (separate with |)",
  "💾 Simpan Teks": "💾 Save Text",
  "Opsional:": "Optional:",
  "Terkirim — lihat pratinjau Alert ⤵": "Sent — see Alert preview ⤵",
  "Running text disimpan ✅": "Running text saved ✅",
  "Goal disimpan ✅": "Goal saved ✅",
  gagal: "failed",
  "🎬 Scene Layar Penuh": "🎬 Full-screen Scenes",
  "Layar penuh 1920×1080 untuk transisi stream — gaya neobrutalism × anime. Pasang tiap scene sebagai Browser Source terpisah di OBS.":
    "Full-screen 1920×1080 stream transitions — neobrutalism × anime style. Add each scene as a separate Browser Source in OBS.",
  "⏰ Segera Dimulai": "⏰ Starting Soon",
  "💬 Ngobrol Dulu": "💬 Chatting / BRB",
  "👋 Stream Selesai": "👋 Stream Ended",
  "Hitung mundur (opsional):": "Countdown (optional):",
  "atau": "or",
  "Ganti handle:": "Change handle:",
  'Untuk "Ngobrol Dulu", taruh sumber kamera di OBS tepat di atas kotak KAMERA.':
    'For "Chatting", place your camera source in OBS right on top of the CAMERA box.',
});

// Overlay disajikan oleh backend (:4300). Saat dev dashboard di :4301,
// arahkan ke :4300; saat prod (satu origin) pakai origin sekarang.
const OVERLAY_BASE =
  location.port === "4301"
    ? `${location.protocol}//${location.hostname}:4300`
    : location.origin;

function CopyUrl({ url }: { url: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-center gap-2 justify-between p-2"
      style={{ border: "2px solid #000", background: "#f5f5f0" }}
    >
      <code className="text-xs select-all break-all">{url}</code>
      <Button
        color={copied ? "green" : "white"}
        className="!px-2 !py-1 text-xs shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? t("✓ tersalin") : t("📋 salin")}
      </Button>
    </div>
  );
}

/** Pratinjau overlay: iframe 1280×720 diperkecil, latar kotak-kotak (ala transparan OBS).
    `w` = lebar target pratinjau (default 520); skala & tinggi 16:9 dihitung dari situ. */
function Preview({ src, w = 520 }: { src: string; w?: number }) {
  const scale = w / 1280;
  const h = Math.round((w * 9) / 16);
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        maxWidth: w,
        height: h,
        border: "3px solid #000",
        boxShadow: "5px 5px 0 #000",
        position: "relative",
        backgroundColor: "#2b2b3a",
        backgroundImage:
          "repeating-conic-gradient(#3a3a4c 0% 25%, #2b2b3a 0% 50%)",
        backgroundSize: "26px 26px",
      }}
    >
      <iframe
        title="preview"
        src={src}
        style={{
          width: 1280,
          height: 720,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}

export function OverlayTab() {
  const { t } = useLang();
  // Alert test
  const [name, setName] = useState("@donatur");
  const [message, setMessage] = useState("Semangat streaming-nya! 🔥");
  const [testMsg, setTestMsg] = useState<string | null>(null);

  // Param leaderboard overlay
  const [limit, setLimit] = useState(5);
  const [pos, setPos] = useState("top-right");
  const lbQuery = `?limit=${limit}&pos=${pos}`;

  // Param antrian request overlay
  const [reqLimit, setReqLimit] = useState(10);
  const [reqPos, setReqPos] = useState("top-right");
  const reqQuery = `?limit=${reqLimit}&pos=${reqPos}`;
  const reqTickerQuery = `?limit=${reqLimit}&pos=${reqPos.includes("top") ? "top" : "bottom"}`;

  // Goal bar + running text
  const [goal, setGoal] = useState({ enabled: false, label: "Target Point", target: 1000, source: "points", current: 0 });
  const [runLabel, setRunLabel] = useState("📢 INFO");
  const [runText, setRunText] = useState("");
  useEffect(() => {
    api.getSettings().then((s) => {
      setGoal({
        enabled: Boolean(s["goal.enabled"]),
        label: String(s["goal.label"] ?? "Target Point"),
        target: Number(s["goal.target"] ?? 1000),
        source: String(s["goal.source"] ?? "points"),
        current: Number(s["goal.current"] ?? 0),
      });
      setRunLabel(String(s["runtext.label"] ?? "📢 INFO"));
      setRunText(String(s["runtext.text"] ?? ""));
    }).catch(() => {});
  }, []);
  async function saveRunText() {
    try {
      await api.putSettings({ "runtext.label": runLabel, "runtext.text": runText });
      toast(t("Running text disimpan ✅"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }
  async function saveGoal(next: typeof goal) {
    setGoal(next);
    try {
      await api.putSettings({
        "goal.enabled": next.enabled,
        "goal.label": next.label,
        "goal.target": Number(next.target) || 0,
        "goal.source": next.source,
        "goal.current": Number(next.current) || 0,
      });
      toast(t("Goal disimpan ✅"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }

  async function test() {
    setTestMsg(null);
    try {
      await api.testAlert({ name, message });
      setTestMsg(t("Terkirim — lihat pratinjau Alert ⤵"));
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : t("gagal"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="neo-lg bg-white p-3 text-sm font-bold">
        {t("📺 Pasang tiap URL di bawah sebagai")} <b>{t("Browser Source")}</b>{" "}
        {t(
          "di OBS (ukuran 1920×1080, latar transparan). Pratinjau di kanan menunjukkan tampilan aslinya.",
        )}
      </div>

      <AlertControl />

      {/* SCENE LAYAR PENUH (Segera Dimulai / Ngobrol Dulu / Stream Selesai) */}
      <Card title={t("🎬 Scene Layar Penuh")} accent="var(--cyan)">
        <p className="text-sm opacity-70 mb-3">
          {t(
            "Layar penuh 1920×1080 untuk transisi stream — gaya neobrutalism × anime. Pasang tiap scene sebagai Browser Source terpisah di OBS.",
          )}
        </p>
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {[
            { key: "start", label: "⏰ Segera Dimulai", file: "scene-start.html" },
            { key: "brb", label: "💬 Ngobrol Dulu", file: "scene-brb.html" },
            { key: "end", label: "👋 Stream Selesai", file: "scene-end.html" },
          ].map((sc) => (
            <div key={sc.key} className="flex flex-col gap-1">
              <span className="font-extrabold text-sm uppercase">{t(sc.label)}</span>
              <Preview src={`${OVERLAY_BASE}/overlay/${sc.file}`} w={340} />
              <CopyUrl url={`${OVERLAY_BASE}/overlay/${sc.file}`} />
            </div>
          ))}
        </div>
        <p className="text-xs opacity-60 mt-3">
          {t("Hitung mundur (opsional):")} <code>?mins=10</code> {t("atau")} <code>?until=19:30</code>.{" "}
          {t("Ganti handle:")} <code>?handle=@kamu</code>.{" "}
          {t('Untuk "Ngobrol Dulu", taruh sumber kamera di OBS tepat di atas kotak KAMERA.')}
        </p>
      </Card>

      {/* ALERT */}
      <Card title={t("🔔 Overlay Alert")} accent="var(--pink)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">
              {t("Notif ala Saweria tiap")} <b>!alert</b>
              {t(". Pasang sebagai Browser Source di OBS.")}
            </p>
            <div className="mb-3">
              <Tag>{t("URL OBS")}</Tag>
              <div className="mt-1">
                <CopyUrl url={`${OVERLAY_BASE}/overlay/`} />
              </div>
            </div>
            <Field label={t("Nama (test)")}>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("Pesan (test)")}>
              <TextInput value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <div className="flex items-center gap-2 flex-wrap">
              <Button color="green" onClick={test}>
                {t("🔔 Kirim Test")}
              </Button>
              {testMsg && (
                <span className="neo px-2 py-1 text-xs font-bold" style={{ background: "var(--yellow)" }}>
                  {testMsg}
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/`} />
          </div>
        </div>
      </Card>

      {/* LIVE CHAT */}
      <Card title={t("💬 Overlay Live Chat")} accent="var(--cyan)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">
              {t("Kotak chat di layar. Muncul otomatis saat monitor aktif.")}
            </p>
            <Tag>{t("URL OBS")}</Tag>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/chat.html`} />
            </div>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/chat.html`} />
          </div>
        </div>
      </Card>

      {/* TICKER */}
      <Card title={t("📰 Ticker Event Terbaru")} accent="var(--green)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">{t("Bar berjalan berisi alert terbaru (cocok di bawah layar).")}</p>
            <Tag>{t("URL OBS")}</Tag>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/ticker.html`} />
            </div>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/ticker.html`} />
          </div>
        </div>
      </Card>

      {/* ANTRIAN REQUEST */}
      <Card title={t("📋 Overlay Antrian Request")} accent="var(--pink)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">
              {t("Daftar request reward (Req Lagu, Hero, dll) yang belum dikerjakan, tampil di layar. Atur jumlah & posisi:")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Jumlah request")}>
                <TextInput
                  type="number"
                  value={String(reqLimit)}
                  min={1}
                  max={40}
                  onChange={(e) =>
                    setReqLimit(Math.min(40, Math.max(1, Number(e.target.value) || 10)))
                  }
                />
              </Field>
              <Field label={t("Posisi")}>
                <select
                  className="neo-input"
                  value={reqPos}
                  onChange={(e) => setReqPos(e.target.value)}
                >
                  <option value="top-right">{t("kanan atas")}</option>
                  <option value="top-left">{t("kiri atas")}</option>
                  <option value="bottom-right">{t("kanan bawah")}</option>
                  <option value="bottom-left">{t("kiri bawah")}</option>
                </select>
              </Field>
            </div>
            <p className="text-xs opacity-60 mt-1 mb-3">
              {t("Panel pakai posisi sudut di atas. Ticker cuma")} <b>{t("atas/bawah")}</b>{" "}
              {t("(dari pilihan posisi:")}{" "}
              {reqPos.includes("top") ? t("atas") : t("bawah")}).
            </p>
            <Tag>{t("Panel (URL OBS)")}</Tag>
            <div className="mt-1 mb-2">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/requests.html${reqQuery}`} />
            </div>
            <Tag style={{ background: "var(--cyan)" }}>{t("Ticker berjalan (URL OBS)")}</Tag>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/requests-ticker.html${reqTickerQuery}`} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <span className="block mb-1 font-extrabold text-sm uppercase">{t("Panel")}</span>
              <Preview src={`${OVERLAY_BASE}/overlay/requests.html${reqQuery}`} />
            </div>
            <div>
              <span className="block mb-1 font-extrabold text-sm uppercase">{t("Ticker")}</span>
              <Preview src={`${OVERLAY_BASE}/overlay/requests-ticker.html${reqTickerQuery}`} />
            </div>
          </div>
        </div>
      </Card>

      {/* LEADERBOARD */}
      <Card title={t("🏆 Overlay Leaderboard")} accent="var(--yellow)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">
              {t("Papan point kompak, update live. Atur jumlah & posisi:")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Jumlah baris")}>
                <TextInput
                  type="number"
                  value={String(limit)}
                  min={1}
                  max={20}
                  onChange={(e) => setLimit(Math.min(20, Math.max(1, Number(e.target.value) || 5)))}
                />
              </Field>
              <Field label={t("Posisi")}>
                <select className="neo-input" value={pos} onChange={(e) => setPos(e.target.value)}>
                  <option value="top-right">{t("kanan atas")}</option>
                  <option value="top-left">{t("kiri atas")}</option>
                  <option value="bottom-right">{t("kanan bawah")}</option>
                  <option value="bottom-left">{t("kiri bawah")}</option>
                </select>
              </Field>
            </div>
            <Tag>{t("URL OBS")}</Tag>
            <div className="mt-1 mb-3">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/leaderboard.html${lbQuery}`} />
            </div>
            <Tag style={{ background: "var(--pink)" }}>{t("Halaman penonton")}</Tag>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/leaderboard/`} />
            </div>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/leaderboard.html${lbQuery}`} />
          </div>
        </div>
      </Card>

      {/* GOAL BAR */}
      <Card title={t("📊 Goal Bar")} accent="var(--green)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="flex items-center gap-2 font-bold text-sm mb-2">
              <input type="checkbox" checked={goal.enabled} onChange={(e) => saveGoal({ ...goal, enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              {t("Tampilkan goal bar")}
            </label>
            <Field label={t("Judul")}>
              <TextInput value={goal.label} onChange={(e) => setGoal({ ...goal, label: e.target.value })} onBlur={() => saveGoal(goal)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Target")}>
                <TextInput type="number" value={String(goal.target)} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) || 0 })} onBlur={() => saveGoal(goal)} />
              </Field>
              <Field label={t("Sumber")}>
                <select className="neo-input" value={goal.source} onChange={(e) => saveGoal({ ...goal, source: e.target.value })}>
                  <option value="points">{t("Total point (otomatis)")}</option>
                  <option value="manual">{t("Manual")}</option>
                </select>
              </Field>
            </div>
            {goal.source === "manual" && (
              <Field label={t("Progress sekarang")}>
                <div className="flex items-center gap-2">
                  <Button color="white" className="!px-3" onClick={() => saveGoal({ ...goal, current: Math.max(0, goal.current - 10) })}>−10</Button>
                  <TextInput type="number" value={String(goal.current)} onChange={(e) => setGoal({ ...goal, current: Number(e.target.value) || 0 })} onBlur={() => saveGoal(goal)} />
                  <Button color="green" className="!px-3" onClick={() => saveGoal({ ...goal, current: goal.current + 10 })}>+10</Button>
                </div>
              </Field>
            )}
            <div className="mt-2"><Tag>{t("URL OBS")}</Tag></div>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/goal.html`} />
            </div>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/goal.html`} />
          </div>
        </div>
      </Card>

      {/* RUNNING TEXT */}
      <Card title={t("📢 Running Text")} accent="var(--pink)">
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <p className="text-sm opacity-70 mb-2">
              {t("Teks bebas berjalan (pengumuman, jadwal, dll). Pisah beberapa pesan dengan")} <code>|</code>.
            </p>
            <Field label={t("Label")}>
              <TextInput value={runLabel} onChange={(e) => setRunLabel(e.target.value)} />
            </Field>
            <Field label={t("Teks (pisah dengan |)")}>
              <textarea className="neo-input" rows={3} value={runText} onChange={(e) => setRunText(e.target.value)} />
            </Field>
            <Button color="green" onClick={saveRunText}>{t("💾 Simpan Teks")}</Button>
            <div className="mt-3"><Tag>{t("URL OBS")}</Tag></div>
            <div className="mt-1">
              <CopyUrl url={`${OVERLAY_BASE}/overlay/runtext.html`} />
            </div>
            <p className="text-xs opacity-60 mt-1">{t("Opsional:")} <code>?pos=top</code></p>
          </div>
          <div>
            <span className="block mb-1 font-extrabold text-sm uppercase">{t("Pratinjau")}</span>
            <Preview src={`${OVERLAY_BASE}/overlay/runtext.html`} />
          </div>
        </div>
      </Card>
    </div>
  );
}
