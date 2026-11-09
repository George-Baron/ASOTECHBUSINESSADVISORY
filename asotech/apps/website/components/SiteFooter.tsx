import Link from "next/link";
import { Logo } from "@asotech/ui";
import { CONTACT, BRAND } from "@asotech/configuration";
import { SERVICES } from "@asotech/business-logic";
import { Container } from "./layout";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white no-print">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo onDark />
          <p className="mt-4 text-sm text-white/75">{BRAND.strapline}.</p>
          <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-brand-orange">{BRAND.tagline.toUpperCase()}</p>
        </div>
        <nav aria-label="Services" className="md:col-span-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">Services</h2>
          <ul className="space-y-2 text-sm">
            {SERVICES.slice(0, 7).map((s) => <li key={s.slug}><Link href={`/${s.slug}`} className="text-white/85 hover:text-brand-orange">{s.title}</Link></li>)}
            <li><Link href="/services" className="font-semibold text-brand-orange hover:underline">All services</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="md:col-span-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">Company</h2>
          <ul className="space-y-2 text-sm text-white/85">
            {[["/about", "About"], ["/industries", "Industries"], ["/technology", "Technology"], ["/case-studies", "Case studies"], ["/pricing", "Pricing"], ["/insights", "Insights"], ["/company-profile", "Company profile"], ["/login", "Client login"]].map(([h, l]) => (
              <li key={h}><Link href={h} className="hover:text-brand-orange">{l}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">Contact</h2>
          <ul className="space-y-2 text-sm text-white/85">
            <li><a className="hover:text-brand-orange" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li><a className="hover:text-brand-orange" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
            <li>{CONTACT.website}</li>
            <li>{CONTACT.country}</li>
          </ul>
          <Link href="/consultation" className="mt-4 inline-block rounded-lg bg-brand-orange px-4 py-2 text-sm font-bold text-navy hover:bg-[#f59a38]">Request a consultation</Link>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-white/60">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="flex gap-4"><Link href="/privacy" className="hover:text-white">Privacy policy</Link><Link href="/terms" className="hover:text-white">Terms of service</Link></p>
        </Container>
      </div>
    </footer>
  );
}
