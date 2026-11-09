import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@asotech/utilities";

/** ASOTECH mark: "A" with ascending bars and orange swoosh. Decorative unless `title` is provided. */
export function LogoMark({ size = 36, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M60 8 L112 100 H88 L60 50 L32 100 H8 Z" fill="#0B2F4F" />
      <rect x="42" y="78" width="12" height="22" rx="1.5" fill="#F3F6FA" />
      <rect x="60" y="66" width="12" height="34" rx="1.5" fill="#F3F6FA" />
      <rect x="78" y="54" width="12" height="46" rx="1.5" fill="#F3F6FA" />
      <path d="M4 82 C34 56 80 40 116 50 C84 44 44 60 20 92 Z" fill="#F28C1E" />
    </svg>
  );
}

/** Logo for dark backgrounds uses a light mark tile so the navy "A" stays visible. */
export function Logo({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={cn("inline-flex rounded-lg", onDark && "bg-white p-1")}>
        <LogoMark size={compact ? 28 : 36} />
      </span>
      <span className="leading-none">
        <span className={cn("block font-extrabold tracking-wide", compact ? "text-lg" : "text-xl", onDark ? "text-white" : "text-navy")}>ASOTECH</span>
        {!compact && <span className="mt-0.5 block text-[10px] font-bold tracking-[0.26em] text-brand-orange">BUSINESS ADVISORY</span>}
      </span>
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  // Orange buttons use navy text for AA contrast (white on orange is ~2.4:1).
  primary: "bg-brand-orange text-navy hover:bg-[#f59a38] focus-visible:ring-navy",
  secondary: "bg-navy text-white hover:bg-navy-700 focus-visible:ring-brand-orange",
  ghost: "bg-transparent text-navy hover:bg-navy-50 border border-navy-100 focus-visible:ring-navy",
  danger: "bg-bad text-white hover:opacity-90 focus-visible:ring-bad",
};
export const buttonClass = (variant: Variant = "primary", size: "sm" | "md" | "lg" = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "px-3 py-1.5 text-sm", size === "md" && "px-4 py-2.5 text-sm", size === "lg" && "px-6 py-3 text-base",
    variants[variant], extra,
  );

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button {...rest} className={buttonClass(variant, size, className)} />;
}
export function LinkButton({ href, children, variant = "primary", size = "md", className }: { href: string; children: ReactNode; variant?: Variant; size?: "sm" | "md" | "lg"; className?: string }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-navy-100/70 bg-white p-5 shadow-card", className)}>{children}</div>;
}

const badgeTone = { neutral: "bg-navy-50 text-navy-600", ok: "bg-green-50 text-ok", warn: "bg-orange-50 text-warn", bad: "bg-red-50 text-bad", info: "bg-blue-50 text-blue-800" } as const;
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTone[tone])}>{children}</span>;
}

/** Maps common status strings to a badge tone. */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = (["posted", "approved", "done", "active", "resolved", "received", "verified", "paid", "counted", "won", "completed"].includes(s) ? "ok"
    : ["pending", "pending_approval", "review", "reconciling", "in_review", "trialing", "partially_received", "in_progress", "recount", "scheduled", "proposal_sent", "draft"].includes(s) ? "warn"
    : ["rejected", "failed", "cancelled", "expired", "past_due", "overdue", "blocked", "lost", "critical", "high", "changes_requested"].includes(s) ? "bad" : "neutral") as keyof typeof badgeTone;
  return <Badge tone={tone}>{s.replace(/_/g, " ")}</Badge>;
}

export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate2">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-navy")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate2">{hint}</p>}
    </Card>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "ok" | "warn" | "bad"; title?: string; children?: ReactNode }) {
  const t = { info: "border-blue-200 bg-blue-50 text-blue-900", ok: "border-green-200 bg-green-50 text-green-900", warn: "border-orange-200 bg-orange-50 text-orange-900", bad: "border-red-200 bg-red-50 text-red-900" }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", t)}>
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-white px-6 py-10 text-center">
      <p className="font-bold text-navy">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DataTable({ columns, rows, empty = "Nothing to show yet." }: {
  columns: Array<{ key: string; header: string; align?: "left" | "right" }>;
  rows: Array<Record<string, ReactNode>>;
  empty?: string;
}) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100/70 bg-white shadow-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-navy-50 text-xs uppercase tracking-wide text-slate2">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cn("px-4 py-3 font-semibold", c.align === "right" && "text-right")}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-navy-100/60">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-cloud/70">
              {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle text-navy", c.align === "right" && "text-right tabular-nums")}>{r[c.key] ?? "–"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputBase = "w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-slate2/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60";
export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-navy">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate2">{hint}</p>}
      {error && <p id={`${name}-error`} className="mt-1 text-xs font-medium text-bad">{error}</p>}
    </div>
  );
}
export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cn(inputBase, className)} />; }
export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={cn(inputBase, className)} />; }
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cn(inputBase, "min-h-[120px]", className)} />; }
