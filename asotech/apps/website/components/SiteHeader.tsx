import Link from "next/link";
import { Logo, LinkButton } from "@asotech/ui";
import { NAV } from "../lib/content";
import { Container } from "./layout";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/70 bg-white/95 backdrop-blur no-print">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="ASOTECH Business Advisory home" className="shrink-0"><Logo /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-navy-50">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-navy-50">Client login</Link>
          <LinkButton href="/consultation" size="sm">Request a consultation</LinkButton>
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-navy-100 px-3 py-2 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
            <span>Menu</span>
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4"><path fill="currentColor" d="M3 5h14v2H3zm0 4h14v2H3zm0 4h14v2H3z" /></svg>
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-navy-100 bg-white p-3 shadow-card">
            <nav aria-label="Mobile">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy-50">{n.label}</Link>
              ))}
              <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy-50">Client login</Link>
            </nav>
            <div className="mt-2 border-t border-navy-100 pt-3"><LinkButton href="/consultation" className="w-full">Request a consultation</LinkButton></div>
          </div>
        </details>
      </Container>
    </header>
  );
}
