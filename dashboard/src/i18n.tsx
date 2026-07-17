// i18n ringan: teks Bahasa Indonesia dipakai sebagai KEY. Mode "id" mengembalikan
// key apa adanya; mode "en" mencari terjemahan di registry (fallback ke key/ID).
//
// Tiap tab mendaftarkan kamusnya sendiri via registerDict({...}) di top-level file,
// jadi tak ada satu file kamus raksasa yang jadi sumber konflik.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "id" | "en";

const EN: Record<string, string> = {};
/** Daftarkan terjemahan Inggris (ID → EN). Dipanggil di top-level tiap file. */
export function registerDict(dict: Record<string, string>): void {
  Object.assign(EN, dict);
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = lang === "en" ? EN[key] ?? key : key;
  if (params) {
    for (const k of Object.keys(params)) s = s.split(`{${k}}`).join(String(params[k]));
  }
  return s;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
}

const Ctx = createContext<LangCtx | null>(null);

const STORAGE_KEY = "sa_lang";
function initialLang(): Lang {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "id" ? v : "id";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };
  const t = useMemo<TFunc>(() => (key, params) => translate(lang, key, params), [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang harus di dalam <LangProvider>");
  return c;
}
