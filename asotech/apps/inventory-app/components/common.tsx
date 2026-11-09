import Link from "next/link";

export function SubNav({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label="Section" className="mb-6 flex flex-wrap gap-2 border-b border-navy-100 pb-3">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-white px-6 py-10 text-center">
      <p className="font-bold text-navy">You do not have access to {what}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate2">Ask an owner or administrator of this organisation to change your role.</p>
    </div>
  );
}

export function ConfirmButton({ label, message, danger }: { label: string; message?: string; danger?: boolean }) {
  // Native confirm is attached via a data attribute handled by the form's onSubmit in client components;
  // server components keep it simple: a plain submit button with a clear label.
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${danger ? "bg-bad text-white hover:opacity-90 focus-visible:ring-bad" : "border border-navy-100 text-navy hover:bg-navy-50 focus-visible:ring-navy"}`}
      title={message}
    >
      {label}
    </button>
  );
}
