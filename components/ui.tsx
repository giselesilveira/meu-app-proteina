import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { IconCheck, IconInfo } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "copper";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-espresso active:bg-cocoa",
  copper: "bg-copper text-ivory hover:bg-copper-dark",
  secondary: "border border-bark/25 bg-ivory text-ink hover:border-bark/50",
  ghost: "text-cocoa hover:bg-sand/60",
  danger: "border border-danger/30 bg-ivory text-danger hover:bg-danger/5",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-6 text-[1.0625rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, className)} disabled={loading || rest.disabled} aria-busy={loading} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...rest} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role={label ? "status" : undefined}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Carregando</span>}
    </span>
  );
}

export function Card({ className = "", children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="font-serif text-[2.1rem] font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-mute">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const styles = {
    info: "border-gold/40 bg-gold/10 text-cocoa",
    error: "border-danger/30 bg-danger/5 text-danger",
    success: "border-copper/30 bg-copper/5 text-cocoa",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles}`}>
      <span className="mt-0.5 shrink-0">{tone === "success" ? <IconCheck size={20} /> : <IconInfo size={20} />}</span>
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-bark/20 px-6 py-10 text-center">
      <p className="font-serif text-2xl font-semibold">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-sm text-mute">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-taupe">{label}</p>
      <p className="tabular mt-1 whitespace-nowrap text-[clamp(1.1rem,5.4vw,1.5rem)] font-bold leading-tight text-ink">{value}</p>
      {hint ? <p className="text-sm text-mute">{hint}</p> : null}
    </div>
  );
}
