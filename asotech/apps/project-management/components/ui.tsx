import type { ReactNode } from "react";
import { Button, Select } from "@asotech/ui";

export function Opts({ values }: { values: readonly string[] }) {
  return <>{values.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}</>;
}

export function Hidden({ values }: { values: Record<string, string | null | undefined> }) {
  return <>{Object.entries(values).map(([k, v]) => (v !== null && v !== undefined ? <input key={k} type="hidden" name={k} value={v} /> : null))}</>;
}

/** Small inline "pick a status and save" form bound to a server action. */
export function StatusForm({ action, hidden, value, options, name = "status", label = "Status" }: {
  action: (fd: FormData) => Promise<void>; hidden: Record<string, string | null | undefined>;
  value: string; options: readonly string[]; name?: string; label?: string;
}) {
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <form action={action} className="flex items-center gap-1">
      <Hidden values={hidden} />
      <Select name={name} defaultValue={value} aria-label={label} className="!w-auto !py-1.5 !text-xs">
        <Opts values={opts} />
      </Select>
      <Button size="sm" variant="ghost">Save</Button>
    </form>
  );
}

export function ActionButton({ action, hidden, children, variant = "ghost" }: {
  action: (fd: FormData) => Promise<void>; hidden: Record<string, string | null | undefined>;
  children: ReactNode; variant?: "ghost" | "danger" | "secondary" | "primary";
}) {
  return (
    <form action={action} className="inline">
      <Hidden values={hidden} />
      <Button size="sm" variant={variant}>{children}</Button>
    </form>
  );
}

export function FileLink({ url, label = "Download" }: { url?: string | null; label?: string }) {
  if (!url) return <span className="text-xs text-slate2">No file</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-navy underline">{label}</a>;
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-extrabold text-navy">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-sm text-slate2">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="mb-4 rounded-xl border border-navy-100/70 bg-white p-4 shadow-card">
      <summary className="cursor-pointer text-sm font-bold text-navy">{summary}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export const FormGrid = ({ children }: { children: ReactNode }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
