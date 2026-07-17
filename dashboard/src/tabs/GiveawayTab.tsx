import { useCallback, useEffect, useState } from "react";
import { api, type TriviaStatus } from "../api";
import { toast } from "../toast";
import { useLang, registerDict } from "../i18n";
import { Button, Card, Field, Tag, TextInput } from "../components/ui";

registerDict({
  "🎡 Giveaway": "🎡 Giveaway",
  "🏆 Pemenang ({n})": "🏆 Winners ({n})",
  "🎯 Kuis (Trivia)": "🎯 Quiz (Trivia)",
  "Kata syarat": "Keyword",
  "Hadiah (opsional)": "Reward (optional)",
  "mis. Diamond 💎": "e.g. Diamond 💎",
  Soal: "Question",
  "Jawaban (pisah | atau ,)": "Answers (separate with | or ,)",
  "mis. Ibukota Indonesia?": "e.g. Capital of Indonesia?",
  "Hadiah point": "Point reward",
  "▶️ Mulai": "▶️ Start",
  "■ Stop": "■ Stop",
  "▶️ Mulai Kuis": "▶️ Start Quiz",
  "■ Stop / Reveal": "■ Stop / Reveal",
  "🎲 Tarik Pemenang": "🎲 Draw Winner",
  BERJALAN: "RUNNING",
  MATI: "OFF",
  SELESAI: "DONE",
  "Belum ada pemenang.": "No winners yet.",
  "Peserta ikut ({n})": "Entrants joined ({n})",
  "Peserta: ": "Entrants: ",
  ' · kata "': ' · keyword "',
  " · hadiah ": " · reward ",
  " jawaban masuk": " answers in",
  "Soal: ": "Question: ",
  "🎉 Pemenang: ": "🎉 Winner: ",
  "Isi soal & jawaban": "Fill in question & answer",
  "Kuis dimulai 🎯": "Quiz started 🎯",
  gagal: "failed",
  "Kuis dihentikan": "Quiz stopped",
  "Giveaway dimulai 🎡": "Giveaway started 🎡",
  "Giveaway dihentikan": "Giveaway stopped",
  "Pemenang: {w}": "Winner: {w}",
  "Penonton yang mengetik ": "Viewers who type ",
  "kata syarat": "keyword",
  " di chat otomatis jadi peserta. Tiap tarik pemenang, yang menang dikeluarkan dari peserta — jadi bisa tarik ":
    " in chat automatically become entrants. Each draw removes the winner from the pool — so you can draw ",
  "berkali-kali": "multiple times",
  " untuk banyak pemenang.": " for multiple winners.",
  "Mulai soal → penonton menjawab di chat. Yang menjawab ":
    "Start a question → viewers answer in chat. Whoever answers ",
  "benar pertama": "correctly first",
  " otomatis dapat point + alert muncul di overlay. Jawaban boleh beberapa (pisah dengan ":
    " automatically gets points + an alert shows on the overlay. Multiple answers allowed (separate with ",
  " atau koma).": " or commas).",
});

export function GiveawayTab() {
  const { t } = useLang();
  const [gv, setGv] = useState<{ active: boolean; keyword: string; reward: string; count: number; entrants: string[] }>({
    active: false,
    keyword: "",
    reward: "",
    count: 0,
    entrants: [],
  });
  const [keyword, setKeyword] = useState("!ikut");
  const [gvReward, setGvReward] = useState("");
  const [winners, setWinners] = useState<Array<{ id: number; name: string; reward: string }>>([]);

  // Trivia
  const [tv, setTv] = useState<TriviaStatus>({ active: false, question: "", reward: 0, answered: 0, winner: null });
  const [tvQ, setTvQ] = useState("");
  const [tvA, setTvA] = useState("");
  const [tvReward, setTvReward] = useState(20);
  const loadTv = useCallback(async () => {
    try {
      setTv(await api.trivia());
    } catch {
      /* ignore */
    }
  }, []);
  async function tvStart() {
    if (!tvQ.trim() || !tvA.trim()) {
      toast(t("Isi soal & jawaban"), false);
      return;
    }
    try {
      setTv(await api.triviaStart(tvQ.trim(), tvA.trim(), Number(tvReward) || 0));
      toast(t("Kuis dimulai 🎯"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }
  async function tvStop() {
    try {
      setTv(await api.triviaStop());
      toast(t("Kuis dihentikan"));
    } catch {
      /* ignore */
    }
  }

  const loadGv = useCallback(async () => {
    try {
      setGv(await api.giveaway());
    } catch {
      /* ignore */
    }
  }, []);
  const loadWinners = useCallback(async () => {
    try {
      setWinners((await api.giveawayWinners()).entries);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadGv();
    loadWinners();
    loadTv();
    const iv = setInterval(() => {
      loadGv();
      loadTv();
    }, 4000);
    return () => clearInterval(iv);
  }, [loadGv, loadWinners, loadTv]);

  async function gvStart() {
    try {
      const s = await api.giveawayStart(keyword, gvReward);
      setGv({ ...s, entrants: [] });
      toast(t("Giveaway dimulai 🎡"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }
  async function gvDraw() {
    try {
      const r = await api.giveawayDraw();
      toast(`${t("Pemenang: {w}", { w: r.winner })}${r.reward ? ` — ${r.reward}` : ""} 🎉`);
      loadGv();
      loadWinners();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("gagal"), false);
    }
  }
  async function gvStop() {
    try {
      const s = await api.giveawayStop();
      setGv({ ...s, entrants: [] });
    } catch {
      /* ignore */
    }
    toast(t("Giveaway dihentikan"));
  }
  async function removeWinner(id: number) {
    await api.removeWinner(id).catch(() => {});
    loadWinners();
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      <Card title={t("🎡 Giveaway")} accent="var(--cyan)">
        <p className="text-sm opacity-70 mb-2">
          {t("Penonton yang mengetik ")}<b>{t("kata syarat")}</b>{t(" di chat otomatis jadi peserta. Tiap tarik pemenang, yang menang dikeluarkan dari peserta — jadi bisa tarik ")}<b>{t("berkali-kali")}</b>{t(" untuk banyak pemenang.")}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Field label={t("Kata syarat")}>
            <TextInput value={keyword} onChange={(e) => setKeyword(e.target.value)} disabled={gv.active} />
          </Field>
          <Field label={t("Hadiah (opsional)")}>
            <TextInput placeholder={t("mis. Diamond 💎")} value={gvReward} onChange={(e) => setGvReward(e.target.value)} disabled={gv.active} />
          </Field>
        </div>
        <div className="flex gap-2 mb-3">
          {!gv.active ? (
            <Button color="green" onClick={gvStart}>{t("▶️ Mulai")}</Button>
          ) : (
            <Button color="red" onClick={gvStop}>{t("■ Stop")}</Button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Tag style={{ background: gv.active ? "var(--green)" : "var(--red)", color: gv.active ? "#000" : "#fff" }}>
            {gv.active ? t("BERJALAN") : t("MATI")}
          </Tag>
          <span className="text-sm">
            {t("Peserta: ")}<b>{gv.count}</b>
            {gv.active && <>{t(' · kata "')}<b>{gv.keyword}</b>"</>}
            {gv.active && gv.reward && <>{t(" · hadiah ")}<b>{gv.reward}</b></>}
          </span>
          <Button color="pink" onClick={gvDraw} disabled={!gv.active || gv.count === 0}>
            {t("🎲 Tarik Pemenang")}
          </Button>
        </div>

        {gv.entrants.length > 0 && (
          <div className="mt-3">
            <div className="font-extrabold uppercase text-xs mb-1">{t("Peserta ikut ({n})", { n: gv.entrants.length })}</div>
            <div className="flex flex-wrap gap-1 max-h-[220px] overflow-y-auto p-2" style={{ border: "2px solid #000", background: "#fafaf5" }}>
              {gv.entrants.map((n, i) => (
                <span key={i} className="neo text-xs font-bold px-2 py-0.5" style={{ background: "#fff" }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title={t("🏆 Pemenang ({n})", { n: winners.length })} accent="var(--yellow)">
        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
          {winners.length === 0 && <p className="opacity-60 text-sm">{t("Belum ada pemenang.")}</p>}
          {winners.map((w) => (
            <div key={w.id} className="neo p-2 flex items-center gap-2 text-sm" style={{ background: "#fff" }}>
              <span className="font-bold">{w.name}</span>
              {w.reward && <Tag style={{ background: "var(--yellow)" }}>{w.reward}</Tag>}
              <Button color="white" className="ml-auto !px-2 !py-1 text-xs" onClick={() => removeWinner(w.id)}>
                🗑
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* TRIVIA / KUIS */}
      <Card title={t("🎯 Kuis (Trivia)")} accent="var(--pink)" className="md:col-span-2">
        <p className="text-sm opacity-70 mb-2">
          {t("Mulai soal → penonton menjawab di chat. Yang menjawab ")}<b>{t("benar pertama")}</b>{t(" otomatis dapat point + alert muncul di overlay. Jawaban boleh beberapa (pisah dengan ")}<code>|</code>{t(" atau koma).")}
        </p>
        <div className="grid md:grid-cols-[1fr_1fr_120px] gap-3 mb-2">
          <Field label={t("Soal")}>
            <TextInput placeholder={t("mis. Ibukota Indonesia?")} value={tvQ} onChange={(e) => setTvQ(e.target.value)} disabled={tv.active} />
          </Field>
          <Field label={t("Jawaban (pisah | atau ,)")}>
            <TextInput placeholder="Jakarta | DKI Jakarta" value={tvA} onChange={(e) => setTvA(e.target.value)} disabled={tv.active} />
          </Field>
          <Field label={t("Hadiah point")}>
            <TextInput type="number" value={String(tvReward)} onChange={(e) => setTvReward(Number(e.target.value))} disabled={tv.active} />
          </Field>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!tv.active ? (
            <Button color="green" onClick={tvStart}>{t("▶️ Mulai Kuis")}</Button>
          ) : (
            <Button color="red" onClick={tvStop}>{t("■ Stop / Reveal")}</Button>
          )}
          <Tag style={{ background: tv.active ? "var(--green)" : "var(--red)", color: tv.active ? "#000" : "#fff" }}>
            {tv.active ? t("BERJALAN") : tv.winner ? t("SELESAI") : t("MATI")}
          </Tag>
          {tv.active && (
            <span className="text-sm">
              {t("Soal: ")}<b>{tv.question}</b>{t(" · hadiah ")}<b>{tv.reward} 🪙</b>{" · "}{tv.answered}{t(" jawaban masuk")}
            </span>
          )}
          {!tv.active && tv.winner && (
            <span className="text-sm">
              {t("🎉 Pemenang: ")}<b>{tv.winner.name}</b> — "{tv.winner.answer}"
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
