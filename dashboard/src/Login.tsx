import { useState } from "react";
import { api } from "./api";
import { useLang, registerDict } from "./i18n";
import { Button, TextInput } from "./components/ui";

registerDict({
  "🔒 Login Admin": "🔒 Admin Login",
  "Password…": "Password…",
  "login gagal": "login failed",
  Masuk: "Sign in",
  "Password diatur lewat {a} di {b} (default: admin).":
    "Password is set via {a} in {b} (default: admin).",
});

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login gagal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="neo-lg bg-white p-6 w-full max-w-sm">
        <div
          className="text-2xl font-black uppercase px-3 py-1 mb-5 inline-block"
          style={{ background: "var(--pink)", border: "3px solid #000", boxShadow: "4px 4px 0 #000" }}
        >
          Streaming Assistant
        </div>
        <h1 className="font-extrabold uppercase text-lg mb-3">{t("🔒 Login Admin")}</h1>
        <TextInput
          type="password"
          placeholder={t("Password…")}
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && (
          <div className="neo mt-3 p-2 text-sm font-bold" style={{ background: "var(--red)", color: "#fff" }}>
            {error}
          </div>
        )}
        <div className="mt-4">
          <Button color="green" onClick={submit} disabled={busy || !password}>
            {t("Masuk")}
          </Button>
        </div>
        <p className="mt-4 text-xs opacity-60">
          {t("Password diatur lewat {a} di {b} (default: admin).", { a: "ADMIN_PASSWORD", b: "server/.env" })
            .split(/(\{[^}]+\}|ADMIN_PASSWORD|server\/\.env)/)
            .map((seg, i) =>
              seg === "ADMIN_PASSWORD" || seg === "server/.env" ? <code key={i}>{seg}</code> : seg,
            )}
        </p>
      </div>
    </div>
  );
}
