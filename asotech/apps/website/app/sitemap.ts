import { SERVICES } from "@asotech/business-logic";
import { URLS } from "@asotech/configuration";
import { ARTICLES } from "../lib/articles";

export default function sitemap() {
  const base = URLS.website.replace(/\/$/, "");
  const fixed = ["", "/about", "/services", "/product-design", "/industries", "/technology", "/case-studies", "/pricing", "/insights", "/contact", "/consultation", "/proposal", "/login", "/register", "/privacy", "/terms", "/company-profile"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, priority: p === "" ? 1 : 0.7 })),
    ...SERVICES.map((s) => ({ url: `${base}/${s.slug}`, priority: 0.8 })),
    ...ARTICLES.map((a) => ({ url: `${base}/insights/${a.slug}`, lastModified: new Date(a.date), priority: 0.6 })),
  ];
}
