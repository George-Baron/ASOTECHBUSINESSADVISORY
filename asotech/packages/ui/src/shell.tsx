import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./primitives";
import { cn } from "@asotech/utilities";

export interface NavItem { href: string; label: string }

/** Application shell: navy sidebar (collapses to a top bar on small screens) and content area. */
export function AppShell({ appName, nav, user, signOutAction, orgName, children }: {
  appName: string; nav: NavItem[]; user?: string | null; orgName?: string | null;
  signOutAction?: () => Promise<void>; children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cloud lg:flex">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Logo onDark compact />
          <p className="mt-0 text-[11px] font-semibold uppercase tracking-widest text-white/60 lg:mt-3">{appName}</p>
        </div>
        {orgName && <p className="hidden px-4 pb-2 text-sm font-semibold text-brand-orange lg:block">{orgName}</p>}
        <nav aria-label={`${appName} navigation`} className="flex gap-1 overflow-x-auto px-2 pb-3 lg:block lg:space-y-0.5 lg:pb-6">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
              {n.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="hidden border-t border-white/10 px-4 py-4 text-xs text-white/70 lg:block">
            <p className="truncate">{user}</p>
            {signOutAction && (
              <form action={signOutAction}><button className="mt-2 font-semibold text-brand-orange hover:underline">Sign out</button></form>
            )}
          </div>
        )}
      </aside>
      <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cloud px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-navy-100/70 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-extrabold text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate2">{subtitle}</p>}
          <div className={cn("mt-6 space-y-4")}>{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate2">{footer}</div>}
      </div>
    </div>
  );
}

/** Email/password form used by every app's /login, /register and /forgot-password pages. */
export function AuthForm({ mode, action, error, notice, next }: {
  mode: "login" | "register" | "forgot"; action: (fd: FormData) => Promise<void>; error?: string; notice?: string; next?: string;
}) {
  const cls = "w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60";
  const lbl = "mb-1 block text-sm font-semibold text-navy";
  return (
    <form action={action} className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">{notice}</p>}
      {mode === "register" && (<div><label htmlFor="full_name" className={lbl}>Full name</label><input id="full_name" name="full_name" required minLength={2} autoComplete="name" className={cls} /></div>)}
      <div><label htmlFor="email" className={lbl}>Email</label><input id="email" name="email" type="email" required autoComplete="email" className={cls} /></div>
      {mode !== "forgot" && (
        <div>
          <label htmlFor="password" className={lbl}>Password</label>
          <input id="password" name="password" type="password" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className={cls} />
          {mode === "register" && <p className="mt-1 text-xs text-slate2">At least 10 characters.</p>}
        </div>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <button className="w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-bold text-navy hover:bg-[#f59a38] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        {mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
      </button>
    </form>
  );
}
