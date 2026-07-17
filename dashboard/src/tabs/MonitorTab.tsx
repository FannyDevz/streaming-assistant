import { useEffect, useRef, useState } from "react";
import type { ChatMessage, MonitorStatus } from "@shared/types";
import { api } from "../api";
import { Button, Card, Tag, TextInput } from "../components/ui";
import { AlertControl } from "../components/AlertControl";
import { RequestQueue } from "../components/RequestQueue";
import { useLang, registerDict } from "../i18n";

registerDict({
  gagal: "failed",
  "gagal menghentikan": "failed to stop",
  "Kontrol Live": "Live Control",
  "URL / ID video live YouTube…": "YouTube live video URL / ID…",
  "▶ Mulai": "▶ Start",
  "■ Stop": "■ Stop",
  "● LIVE": "● LIVE",
  MATI: "OFF",
  "belum ada stream": "no stream yet",
  "Video ID": "Video ID",
  "Pesan diproses": "Messages processed",
  "💡 URL & pratinjau overlay OBS ada di tab": "💡 OBS overlay URL & preview are in the tab",
  "📺 Overlay": "📺 Overlay",
  "Live Chat ({count})": "Live Chat ({count})",
  "🔍 cari nama / pesan…": "🔍 search name / message…",
  "Belum ada chat. Mulai monitor dulu.": "No chat yet. Start monitoring first.",
  'Tidak ada chat yang cocok "{q}".': 'No chat matches "{q}".',
  MEMBER: "MEMBER",
});

export function MonitorTab({
  status,
  chat,
  onStatus,
}: {
  status: MonitorStatus;
  chat: ChatMessage[];
  onStatus: (s: MonitorStatus) => void;
}) {
  const { t } = useLang();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatQ, setChatQ] = useState("");
  const shownChat = chatQ
    ? chat.filter(
        (m) =>
          m.name.toLowerCase().includes(chatQ.toLowerCase()) ||
          m.text.toLowerCase().includes(chatQ.toLowerCase()),
      )
    : chat;

  // Auto-scroll ke chat terbaru, kecuali user sedang scroll ke atas baca history.
  const chatRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  function onChatScroll() {
    const el = chatRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }
  useEffect(() => {
    const el = chatRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [chat]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      onStatus(await api.startMonitor(url.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("gagal"));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      onStatus(await api.stopMonitor());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("gagal menghentikan"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
    <div className="grid md:grid-cols-2 gap-5 items-start">
      <div className="flex flex-col gap-5">
      <Card title={t("Kontrol Live")} accent="var(--cyan)">
        <div className="flex flex-col gap-3">
          <TextInput
            placeholder={t("URL / ID video live YouTube…")}
            value={url}
            disabled={status.monitoring}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !status.monitoring && url && start()}
          />
          <div className="flex gap-2">
            <Button color="green" onClick={start} disabled={busy || status.monitoring || !url}>
              {t("▶ Mulai")}
            </Button>
            <Button color="red" onClick={stop} disabled={busy || !status.monitoring}>
              {t("■ Stop")}
            </Button>
          </div>
          {error && (
            <div className="neo p-2 text-sm font-bold" style={{ background: "var(--red)", color: "#fff" }}>
              {error}
            </div>
          )}
        </div>

        {/* Status terintegrasi */}
        <div className="mt-4 pt-4" style={{ borderTop: "3px solid #000" }}>
          <div className="flex items-center gap-2 mb-2">
            <Tag style={{ background: status.monitoring ? "var(--green)" : "var(--red)", color: "#000" }}>
              {status.monitoring ? t("● LIVE") : t("MATI")}
            </Tag>
            <span className="font-bold text-sm truncate">{status.title ?? t("belum ada stream")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="opacity-60 text-xs uppercase font-bold">{t("Video ID")}</div>
              <b>{status.videoId ?? "—"}</b>
            </div>
            <div>
              <div className="opacity-60 text-xs uppercase font-bold">{t("Pesan diproses")}</div>
              <b>{status.messageCount}</b>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs opacity-60">
          {t("💡 URL & pratinjau overlay OBS ada di tab")} <b>{t("📺 Overlay")}</b>.
        </p>
      </Card>

      <AlertControl />
      </div>

      <Card title={t("Live Chat ({count})", { count: chatQ ? `${shownChat.length}/${chat.length}` : chat.length })} accent="var(--yellow)">
        <div className="mb-2">
          <TextInput
            placeholder={t("🔍 cari nama / pesan…")}
            value={chatQ}
            onChange={(e) => setChatQ(e.target.value)}
            className="!py-1 text-sm"
          />
        </div>
        <div
          ref={chatRef}
          onScroll={onChatScroll}
          className="flex flex-col gap-1 min-h-[280px] max-h-[70vh] overflow-y-auto pr-1"
        >
          {chat.length === 0 ? (
            <p className="opacity-60 text-sm">{t("Belum ada chat. Mulai monitor dulu.")}</p>
          ) : shownChat.length === 0 ? (
            <p className="opacity-60 text-sm">{t('Tidak ada chat yang cocok "{q}".', { q: chatQ })}</p>
          ) : null}
          {shownChat.map((m, i) => (
            <div key={i} className="text-sm leading-snug">
              <b style={{ color: m.isOwner ? "var(--pink)" : m.isModerator ? "#2563eb" : "#000" }}>
                {m.name}
              </b>
              {m.isMember && <span className="neo-tag ml-1" style={{ fontSize: 9 }}>{t("MEMBER")}</span>}
              <span className="opacity-40"> : </span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>

    <RequestQueue />
    </div>
  );
}
