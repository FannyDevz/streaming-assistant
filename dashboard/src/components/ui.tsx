import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

type Color = "yellow" | "pink" | "cyan" | "green" | "red" | "white";

export function Button({
  color = "yellow",
  children,
  className = "",
  ...rest
}: { color?: Color } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`neo-btn ${color} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  title,
  accent,
  children,
  className = "",
}: {
  title?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`neo-card ${className}`}>
      {title && (
        <header
          className="px-4 py-2 border-b-3 flex items-center gap-2"
          style={{ background: accent ?? "var(--yellow)", borderBottom: "3px solid #000" }}
        >
          <h2 className="font-extrabold uppercase tracking-wide text-lg">{title}</h2>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Tag({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="neo-tag" style={style}>
      {children}
    </span>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`neo-input ${className}`} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block mb-1 font-extrabold text-sm uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
