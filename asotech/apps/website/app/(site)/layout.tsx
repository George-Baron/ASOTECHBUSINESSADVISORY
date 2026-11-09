import type { ReactNode } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { BRAND, CONTACT, URLS } from "@asotech/configuration";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.name,
  url: URLS.website,
  email: CONTACT.email,
  telephone: CONTACT.phone,
  slogan: BRAND.tagline,
  areaServed: "NG",
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
