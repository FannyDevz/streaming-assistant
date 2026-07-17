import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { useLang, registerDict } from "../i18n";
import { Button, Card, Field, TextInput } from "../components/ui";

registerDict({
  // LABELS values
  "Point per komentar": "Points per comment",
  "Cooldown earn (detik)": "Earn cooldown (seconds)",
  "Kata command alert": "Alert command word",
  "Biaya !alert (point)": "!alert cost (points)",
  "Cooldown !alert (detik)": "!alert cooldown (seconds)",
  "Maks karakter pesan alert": "Max alert message characters",
  "ID template default": "Default template ID",
  "Command cek point (buat di Nightbot)": "Points check command (create in Nightbot)",
  "Command cek rank (buat di Nightbot)": "Rank check command (create in Nightbot)",
  "Balasan point — {name} {points}": "Points reply — {name} {points}",
  "Balasan rank — {name} {rank} {total} {points}": "Rank reply — {name} {rank} {total} {points}",
  "Balasan tidak ditemukan — {name}": "Not found reply — {name}",
  "Taruhan minimal": "Minimum bet",
  "Taruhan maksimal": "Maximum bet",
  "Peluang menang coinflip (0–1)": "Coinflip win chance (0–1)",
  "Peluang menang gamble (0–1)": "Gamble win chance (0–1)",
  "Kelipatan hadiah gamble": "Gamble payout multiplier",
  "Command coinflip (buat di Nightbot)": "Coinflip command (create in Nightbot)",
  "Command gamble (buat di Nightbot)": "Gamble command (create in Nightbot)",
  "Balasan menang — {name} {game} {delta} {points}": "Win reply — {name} {game} {delta} {points}",
  "Balasan kalah — {name} {game} {bet} {points}": "Lose reply — {name} {game} {bet} {points}",
  "Pesan alert SuperChat — {name} {amount} {message}": "SuperChat alert message — {name} {amount} {message}",
  "Bonus point SuperChat": "SuperChat bonus points",
  "Pesan alert member baru — {name}": "New member alert message — {name}",
  "Bonus point member baru": "New member bonus points",
  "URL Webhook Discord": "Discord Webhook URL",
  "Nama pengirim (bot)": "Sender name (bot)",
  "Alamat OBS WebSocket": "OBS WebSocket address",
  "Password OBS WebSocket": "OBS WebSocket password",
  // Card titles
  "🪙 Point": "🪙 Points",
  "🔔 Alert": "🔔 Alert",
  "🤖 Nightbot": "🤖 Nightbot",
  "💎 SuperChat & Member": "💎 SuperChat & Member",
  "🎲 Mini-Game": "🎲 Mini-Game",
  "🏅 Level / Badge": "🏅 Level / Badge",
  "🔔 Discord Webhook": "🔔 Discord Webhook",
  "🎬 OBS WebSocket": "🎬 OBS WebSocket",
  "💾 Backup Config": "💾 Backup Config",
  "Aturan": "Settings",
  "Memuat…": "Loading…",
  // Field labels
  "Penyimpanan point": "Points storage",
  "Bonus command (JSON)": "Bonus command (JSON)",
  "Kata kasar (pisah koma)": "Bad words (comma separated)",
  "Scene saat alert (ganti sementara)": "Scene during alert (temporary switch)",
  // Nightbot card hint
  "Balasan chat lewat Nightbot": "Chat replies via Nightbot",
  "Placeholder:": "Placeholders:",
  // Alert card hint
  "biaya point": "point cost",
  "diatur per-template di tab": "are set per-template in the",
  "(jadi alert video bisa beda harga). Di sini aturan yang berlaku umum:": "tab (so each video alert can have a different price). General rules apply here:",
  // Options
  "Selamanya (akumulasi antar stream)": "Forever (accumulate across streams)",
  "Per streaming (reset tiap stream baru)": "Per stream (reset each new stream)",
  "— jangan ganti scene —": "— don't switch scene —",
  // Checkbox / section labels
  "Alert otomatis saat SuperChat": "Auto alert on SuperChat",
  "Alert otomatis saat member baru": "Auto alert on new member",
  "Aktifkan mini-game (coinflip & gamble)": "Enable mini-game (coinflip & gamble)",
  "Aktifkan notifikasi Discord": "Enable Discord notifications",
  "Kirim notif saat:": "Send notification when:",
  "🔴 Live dimulai": "🔴 Stream started",
  "💎 SuperChat masuk": "💎 SuperChat received",
  "🎡 Pemenang giveaway": "🎡 Giveaway winner",
  "Aktifkan kontrol OBS": "Enable OBS control",
  // Hints
  "Dipicu lewat Nightbot — cara pasang di tab Bantuan.": "Triggered via Nightbot — setup in the Help tab.",
  "Tier badge dari total point. Tiap item:": "Badge tiers from total points. Each item:",
  "Buat webhook di Discord:": "Create a webhook in Discord:",
  ", salin URL-nya. Klik Simpan Aturan untuk menyimpan permanen.": ", copy its URL. Click Save Settings to store permanently.",
  "Di OBS:": "In OBS:",
  ", samakan port & password. Saat alert tampil, scene berganti otomatis lalu kembali.": ", match the port & password. When an alert shows, the scene switches automatically then returns.",
  // Backup card hint
  "Menyimpan semua": "Saves all",
  "aturan": "rules",
  "(termasuk overlay, alert, Discord/OBS) +": "(including overlay, alert, Discord/OBS) +",
  "template alert": "alert templates",
  "reward": "rewards",
  ". Import": ". Import",
  "mengganti": "replaces",
  "template & reward yang ada.": "existing templates & rewards.",
  // Buttons
  "📨 Kirim Test": "📨 Send Test",
  "🔌 Sambungkan & Ambil Scene": "🔌 Connect & Fetch Scenes",
  "💾 Simpan Aturan": "💾 Save Settings",
  "⬇️ Export (unduh .json)": "⬇️ Export (download .json)",
  "⬆️ Import (.json)": "⬆️ Import (.json)",
  // Status
  "● Tersambung": "● Connected",
  "○ Belum tersambung": "○ Not connected",
  "(tersimpan)": "(saved)",
  // Toasts
  "Config diekspor 💾": "Config exported 💾",
  "gagal export": "export failed",
  "Config diimpor ✅ ({templates} template, {rewards} reward)": "Config imported ✅ ({templates} templates, {rewards} rewards)",
  "file tidak valid": "invalid file",
  "Pesan test terkirim ke Discord ✅": "Test message sent to Discord ✅",
  "gagal — cek URL webhook": "failed — check webhook URL",
  "gagal konek OBS": "OBS connection failed",
  "OBS tersambung ✅": "OBS connected ✅",
  "Gagal: {error}": "Failed: {error}",
  // Save messages
  "Bonus command bukan JSON valid.": "Bonus command is not valid JSON.",
  "Level bukan JSON valid.": "Levels are not valid JSON.",
  "Tersimpan ✅": "Saved ✅",
  "gagal simpan": "save failed",
  "Simpan berlaku untuk semua kartu di bawah.": "Save applies to all cards below.",
});

type Vals = Record<string, unknown>;

const LABELS: Record<string, string> = {
  "earn.amount": "Point per komentar",
  "earn.cooldownSec": "Cooldown earn (detik)",
  "alert.command": "Kata command alert",
  "alert.cost": "Biaya !alert (point)",
  "alert.cooldownSec": "Cooldown !alert (detik)",
  "alert.maxLen": "Maks karakter pesan alert",
  "alert.defaultTemplateId": "ID template default",
  "nightbot.pointsCommand": "Command cek point (buat di Nightbot)",
  "nightbot.rankCommand": "Command cek rank (buat di Nightbot)",
  "nightbot.pointsReply": "Balasan point — {name} {points}",
  "nightbot.rankReply": "Balasan rank — {name} {rank} {total} {points}",
  "nightbot.notFoundReply": "Balasan tidak ditemukan — {name}",
  "game.minBet": "Taruhan minimal",
  "game.maxBet": "Taruhan maksimal",
  "game.coinflip.winChance": "Peluang menang coinflip (0–1)",
  "game.gamble.winChance": "Peluang menang gamble (0–1)",
  "game.gamble.payout": "Kelipatan hadiah gamble",
  "game.coinflip.command": "Command coinflip (buat di Nightbot)",
  "game.gamble.command": "Command gamble (buat di Nightbot)",
  "game.winReply": "Balasan menang — {name} {game} {delta} {points}",
  "game.loseReply": "Balasan kalah — {name} {game} {bet} {points}",
  "superchat.message": "Pesan alert SuperChat — {name} {amount} {message}",
  "superchat.points": "Bonus point SuperChat",
  "member.message": "Pesan alert member baru — {name}",
  "member.points": "Bonus point member baru",
  "discord.webhookUrl": "URL Webhook Discord",
  "discord.username": "Nama pengirim (bot)",
  "obs.url": "Alamat OBS WebSocket",
  "obs.password": "Password OBS WebSocket",
};

// Kunci per tipe (dipakai untuk simpan).
const NUM_KEYS = [
  "earn.amount",
  "earn.cooldownSec",
  "alert.cooldownSec",
  "alert.maxLen",
  "alert.defaultTemplateId",
  "game.minBet",
  "game.maxBet",
  "game.coinflip.winChance",
  "game.gamble.winChance",
  "game.gamble.payout",
  "superchat.points",
  "member.points",
];
const TEXT_KEYS = [
  "nightbot.pointsCommand",
  "nightbot.rankCommand",
  "nightbot.pointsReply",
  "nightbot.rankReply",
  "nightbot.notFoundReply",
  "game.coinflip.command",
  "game.gamble.command",
  "game.winReply",
  "game.loseReply",
  "superchat.message",
  "member.message",
  "discord.webhookUrl",
  "discord.username",
  "obs.url",
  "obs.password",
  "obs.alertScene",
];

export function SettingsTab() {
  const { t } = useLang();
  const [vals, setVals] = useState<Vals>({});
  const [persistence, setPersistence] = useState("forever");
  const [badWords, setBadWords] = useState("");
  const [bonusJson, setBonusJson] = useState("");
  const [gameEnabled, setGameEnabled] = useState(true);
  const [levelsJson, setLevelsJson] = useState("[]");
  const [scEnabled, setScEnabled] = useState(true);
  const [memberEnabled, setMemberEnabled] = useState(true);
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [dcStart, setDcStart] = useState(true);
  const [dcSuper, setDcSuper] = useState(true);
  const [dcGiveaway, setDcGiveaway] = useState(true);
  const [obsEnabled, setObsEnabled] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setVals(s);
        setPersistence(String(s["points.persistence"] ?? "forever"));
        setBadWords((Array.isArray(s["alert.badWords"]) ? (s["alert.badWords"] as string[]) : []).join(", "));
        setBonusJson(JSON.stringify(s["earn.bonusCommands"] ?? [], null, 2));
        setGameEnabled(s["game.enabled"] !== false);
        setLevelsJson(JSON.stringify(s["levels"] ?? [], null, 2));
        setScEnabled(s["superchat.enabled"] !== false);
        setMemberEnabled(s["member.enabled"] !== false);
        setDiscordEnabled(s["discord.enabled"] === true);
        setDcStart(s["discord.onStreamStart"] !== false);
        setDcSuper(s["discord.onSuperchat"] !== false);
        setDcGiveaway(s["discord.onGiveaway"] !== false);
        setObsEnabled(s["obs.enabled"] === true);
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, v: unknown) {
    setVals((prev) => ({ ...prev, [key]: v }));
  }

  // Helper render field bertipe.
  const numField = (key: string) => (
    <Field key={key} label={t(LABELS[key])}>
      <TextInput type="number" value={String(vals[key] ?? "")} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );
  const textField = (key: string) => (
    <Field key={key} label={t(LABELS[key])}>
      <TextInput value={String(vals[key] ?? "")} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );

  async function save() {
    setMsg(null);
    const payload: Vals = {};
    for (const k of NUM_KEYS) payload[k] = Number(vals[k] ?? 0);
    for (const k of TEXT_KEYS) payload[k] = String(vals[k] ?? "");
    payload["points.persistence"] = persistence;
    payload["alert.badWords"] = badWords
      .split(/[,\n]/)
      .map((w) => w.trim())
      .filter(Boolean);
    payload["game.enabled"] = gameEnabled;
    payload["superchat.enabled"] = scEnabled;
    payload["member.enabled"] = memberEnabled;
    payload["discord.enabled"] = discordEnabled;
    payload["discord.onStreamStart"] = dcStart;
    payload["discord.onSuperchat"] = dcSuper;
    payload["discord.onGiveaway"] = dcGiveaway;
    payload["obs.enabled"] = obsEnabled;
    try {
      payload["earn.bonusCommands"] = JSON.parse(bonusJson || "[]");
    } catch {
      setMsg({ ok: false, text: t("Bonus command bukan JSON valid.") });
      return;
    }
    try {
      payload["levels"] = JSON.parse(levelsJson || "[]");
    } catch {
      setMsg({ ok: false, text: t("Level bukan JSON valid.") });
      return;
    }
    try {
      await api.putSettings(payload);
      setMsg({ ok: true, text: t("Tersimpan ✅") });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("gagal simpan") });
    }
  }

  // Backup / restore config
  const fileRef = useRef<HTMLInputElement>(null);
  async function exportConfig() {
    try {
      const data = await api.exportConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "streaming-assistant-config.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t("Config diekspor 💾"), true);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal export"), false);
    }
  }
  async function importConfig(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const r = await api.importConfig(parsed);
      toast(t("Config diimpor ✅ ({templates} template, {rewards} reward)", { templates: r.importedTemplates, rewards: r.importedRewards }), true);
      // muat ulang tampilan settings
      const s = await api.getSettings();
      setVals(s);
      setPersistence(String(s["points.persistence"] ?? "forever"));
      setBadWords((Array.isArray(s["alert.badWords"]) ? (s["alert.badWords"] as string[]) : []).join(", "));
      setBonusJson(JSON.stringify(s["earn.bonusCommands"] ?? [], null, 2));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("file tidak valid"), false);
    }
  }

  // Discord test — simpan dulu agar webhook terbaru dipakai server.
  async function testDiscord() {
    try {
      await api.putSettings({
        "discord.enabled": discordEnabled,
        "discord.webhookUrl": String(vals["discord.webhookUrl"] ?? ""),
        "discord.username": String(vals["discord.username"] ?? "Streaming Assistant"),
      });
      await api.discordTest();
      toast(t("Pesan test terkirim ke Discord ✅"), true);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal — cek URL webhook"), false);
    }
  }

  // OBS — simpan setting lalu sambungkan & ambil daftar scene.
  const [obsStat, setObsStat] = useState<Awaited<ReturnType<typeof api.obsStatus>> | null>(null);
  useEffect(() => {
    api.obsStatus().then(setObsStat).catch(() => {});
  }, []);
  async function connectObs() {
    try {
      const st = await api.obsConnect({
        url: String(vals["obs.url"] ?? ""),
        password: String(vals["obs.password"] ?? ""),
        enabled: obsEnabled,
      });
      setObsStat(st);
      toast(st.connected ? t("OBS tersambung ✅") : t("Gagal: {error}", { error: st.error ?? "?" }), st.connected);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal konek OBS"), false);
    }
  }

  if (loading) return <Card title={t("Aturan")}>{t("Memuat…")}</Card>;

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      {/* BAR SIMPAN (sticky) — selalu terjangkau tanpa scroll ke bawah */}
      <div
        className="md:col-span-2 sticky top-0 z-20 flex items-center gap-3 flex-wrap p-3"
        style={{ background: "#fff", border: "3px solid #000", boxShadow: "4px 4px 0 #000" }}
      >
        <Button color="green" onClick={save}>
          {t("💾 Simpan Aturan")}
        </Button>
        {msg && (
          <span
            className="neo px-3 py-1 font-bold text-sm"
            style={{ background: msg.ok ? "var(--green)" : "var(--red)", color: msg.ok ? "#000" : "#fff" }}
          >
            {msg.text}
          </span>
        )}
        <span className="text-xs opacity-60 ml-auto">{t("Simpan berlaku untuk semua kartu di bawah.")}</span>
      </div>

      {/* ── ATURAN INTI ── */}
      {/* GRUP POINT */}
      <Card title={t("🪙 Point")} accent="var(--cyan)">
        {numField("earn.amount")}
        {numField("earn.cooldownSec")}
        <Field label={t("Penyimpanan point")}>
          <select className="neo-input" value={persistence} onChange={(e) => setPersistence(e.target.value)}>
            <option value="forever">{t("Selamanya (akumulasi antar stream)")}</option>
            <option value="perStream">{t("Per streaming (reset tiap stream baru)")}</option>
          </select>
        </Field>
        <Field label={t("Bonus command (JSON)")}>
          <textarea
            className="neo-input font-mono text-xs"
            rows={5}
            value={bonusJson}
            onChange={(e) => setBonusJson(e.target.value)}
          />
        </Field>
      </Card>

      {/* GRUP ALERT */}
      <Card title={t("🔔 Alert")} accent="var(--pink)">
        <p className="text-sm opacity-70 mb-3">
          <b>Command</b> & <b>{t("biaya point")}</b> {t("diatur per-template di tab")} <b>Alert</b>{" "}
          {t("(jadi alert video bisa beda harga). Di sini aturan yang berlaku umum:")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {numField("alert.cooldownSec")}
          {numField("alert.maxLen")}
          {numField("alert.defaultTemplateId")}
        </div>
        <Field label={t("Kata kasar (pisah koma)")}>
          <textarea className="neo-input" rows={2} value={badWords} onChange={(e) => setBadWords(e.target.value)} />
        </Field>
      </Card>

      {/* ── ENGAGEMENT ── */}
      {/* SUPERCHAT & MEMBER */}
      <Card title={t("💎 SuperChat & Member")} accent="var(--pink)">
        <label className="flex items-center gap-2 font-bold text-sm mb-2">
          <input type="checkbox" checked={scEnabled} onChange={(e) => setScEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          {t("Alert otomatis saat SuperChat")}
        </label>
        {textField("superchat.message")}
        {numField("superchat.points")}
        <div className="my-2" style={{ borderTop: "3px solid #000" }} />
        <label className="flex items-center gap-2 font-bold text-sm mb-2">
          <input type="checkbox" checked={memberEnabled} onChange={(e) => setMemberEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          {t("Alert otomatis saat member baru")}
        </label>
        {textField("member.message")}
        {numField("member.points")}
      </Card>

      {/* MINI-GAME */}
      <Card title={t("🎲 Mini-Game")} accent="var(--cyan)">
        <label className="flex items-center gap-2 font-bold text-sm mb-3">
          <input type="checkbox" checked={gameEnabled} onChange={(e) => setGameEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          {t("Aktifkan mini-game (coinflip & gamble)")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {textField("game.coinflip.command")}
          {textField("game.gamble.command")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numField("game.minBet")}
          {numField("game.maxBet")}
          {numField("game.coinflip.winChance")}
          {numField("game.gamble.winChance")}
          {numField("game.gamble.payout")}
        </div>
        {textField("game.winReply")}
        {textField("game.loseReply")}
        <p className="text-xs opacity-60">{t("Dipicu lewat Nightbot — cara pasang di tab Bantuan.")}</p>
      </Card>

      {/* LEVEL */}
      <Card title={t("🏅 Level / Badge")} accent="var(--pink)">
        <p className="text-sm opacity-70 mb-2">
          {t("Tier badge dari total point. Tiap item:")} <code>{"{ name, min, color }"}</code>.
        </p>
        <textarea
          className="neo-input font-mono text-xs"
          rows={10}
          value={levelsJson}
          onChange={(e) => setLevelsJson(e.target.value)}
        />
      </Card>

      {/* ── INTEGRASI ── */}
      {/* NIGHTBOT */}
      <Card title={t("🤖 Nightbot")} accent="var(--yellow)" className="md:col-span-2">
        <p className="text-sm opacity-70 mb-3">
          {t("Balasan chat lewat Nightbot")} <code>$(urlfetch)</code>. {t("Placeholder:")}{" "}
          <code>{"{name} {points} {rank} {total}"}</code>.
        </p>
        <div className="grid md:grid-cols-2 gap-x-5">
          {textField("nightbot.pointsCommand")}
          {textField("nightbot.rankCommand")}
          {textField("nightbot.pointsReply")}
          {textField("nightbot.rankReply")}
          {textField("nightbot.notFoundReply")}
        </div>
      </Card>

      {/* DISCORD */}
      <Card title={t("🔔 Discord Webhook")} accent="var(--yellow)">
        <label className="flex items-center gap-2 font-bold text-sm mb-2">
          <input type="checkbox" checked={discordEnabled} onChange={(e) => setDiscordEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          {t("Aktifkan notifikasi Discord")}
        </label>
        {textField("discord.webhookUrl")}
        {textField("discord.username")}
        <div className="mt-2 mb-1 font-bold text-sm">{t("Kirim notif saat:")}</div>
        <label className="flex items-center gap-2 text-sm mb-1">
          <input type="checkbox" checked={dcStart} onChange={(e) => setDcStart(e.target.checked)} /> {t("🔴 Live dimulai")}
        </label>
        <label className="flex items-center gap-2 text-sm mb-1">
          <input type="checkbox" checked={dcSuper} onChange={(e) => setDcSuper(e.target.checked)} /> {t("💎 SuperChat masuk")}
        </label>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={dcGiveaway} onChange={(e) => setDcGiveaway(e.target.checked)} /> {t("🎡 Pemenang giveaway")}
        </label>
        <Button color="cyan" onClick={testDiscord}>{t("📨 Kirim Test")}</Button>
        <p className="text-xs opacity-60 mt-2">
          {t("Buat webhook di Discord:")} <b>Server Settings → Integrations → Webhooks → New Webhook</b>{t(", salin URL-nya. Klik Simpan Aturan untuk menyimpan permanen.")}
        </p>
      </Card>

      {/* OBS WEBSOCKET */}
      <Card title={t("🎬 OBS WebSocket")} accent="var(--cyan)">
        <label className="flex items-center gap-2 font-bold text-sm mb-2">
          <input type="checkbox" checked={obsEnabled} onChange={(e) => setObsEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          {t("Aktifkan kontrol OBS")}
        </label>
        {textField("obs.url")}
        {textField("obs.password")}
        <Field label={t("Scene saat alert (ganti sementara)")}>
          <select className="neo-input" value={String(vals["obs.alertScene"] ?? "")} onChange={(e) => set("obs.alertScene", e.target.value)}>
            <option value="">{t("— jangan ganti scene —")}</option>
            {(obsStat?.scenes ?? []).map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
            {/* tampilkan nilai tersimpan walau OBS belum konek */}
            {Boolean(vals["obs.alertScene"]) && !(obsStat?.scenes ?? []).includes(String(vals["obs.alertScene"])) && (
              <option value={String(vals["obs.alertScene"])}>{String(vals["obs.alertScene"])} {t("(tersimpan)")}</option>
            )}
          </select>
        </Field>
        <div className="flex items-center gap-2 flex-wrap">
          <Button color="cyan" onClick={connectObs}>{t("🔌 Sambungkan & Ambil Scene")}</Button>
          <span
            className="neo px-2 py-1 text-xs font-bold"
            style={{ background: obsStat?.connected ? "var(--green)" : "#eee" }}
          >
            {obsStat?.connected ? `${t("● Tersambung")}${obsStat.currentScene ? ` (${obsStat.currentScene})` : ""}` : obsStat?.error ? `○ ${obsStat.error}` : t("○ Belum tersambung")}
          </span>
        </div>
        <p className="text-xs opacity-60 mt-2">
          {t("Di OBS:")} <b>Tools → WebSocket Server Settings → Enable</b>{t(", samakan port & password. Saat alert tampil, scene berganti otomatis lalu kembali.")}
        </p>
      </Card>

      {/* BACKUP / RESTORE */}
      <Card title={t("💾 Backup Config")} accent="var(--cyan)" className="md:col-span-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Button color="white" onClick={exportConfig}>
            {t("⬇️ Export (unduh .json)")}
          </Button>
          <Button color="pink" onClick={() => fileRef.current?.click()}>
            {t("⬆️ Import (.json)")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => importConfig(e.target.files?.[0])}
          />
          <span className="text-xs opacity-60">
            {t("Menyimpan semua")} <b>{t("aturan")}</b> {t("(termasuk overlay, alert, Discord/OBS) +")} <b>{t("template alert")}</b> +{" "}
            <b>{t("reward")}</b>{t(". Import")} <b>{t("mengganti")}</b> {t("template & reward yang ada.")}
          </span>
        </div>
      </Card>
    </div>
  );
}
