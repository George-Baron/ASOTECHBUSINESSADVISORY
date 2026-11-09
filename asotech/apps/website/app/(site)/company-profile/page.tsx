import { Logo } from "@asotech/ui";
import { BRAND, CONTACT } from "@asotech/configuration";
import { SERVICES } from "@asotech/business-logic";
import { Container } from "../../../components/layout";
import { PrintButton } from "../../../components/PrintButton";
import { PROCESS } from "../../../lib/content";

export const metadata = { title: "Company profile", description: "Printable company profile for ASOTECH Business Advisory." };

export default function CompanyProfile() {
  return (
    <Container className="max-w-3xl py-12">
      <div className="mb-8 flex items-center justify-between gap-4"><Logo /><PrintButton /></div>
      <h1 className="text-3xl font-extrabold text-navy">Company profile</h1>
      <p className="mt-1 font-semibold tracking-[0.18em] text-brand-orange">{BRAND.tagline.toUpperCase()}</p>
      <p className="mt-4 text-slate2">{BRAND.name} is a business consulting and technology solutions company serving Nigerian businesses, with an approach designed to extend internationally. We help clients establish, organise, automate and improve their operations.</p>
      <h2 className="mt-8 text-xl font-extrabold text-navy">Services</h2>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-navy sm:grid-cols-2">{SERVICES.map((s) => <li key={s.slug}>• {s.title}</li>)}</ul>
      <h2 className="mt-8 text-xl font-extrabold text-navy">How we work</h2>
      <ol className="mt-3 space-y-2 text-sm text-slate2">{PROCESS.map((p) => <li key={p.name}><span className="font-bold text-navy">{p.name}.</span> {p.text}</li>)}</ol>
      <h2 className="mt-8 text-xl font-extrabold text-navy">Contact</h2>
      <p className="mt-2 text-sm text-navy">{CONTACT.email} · {CONTACT.phone} · {CONTACT.website}</p>
    </Container>
  );
}
