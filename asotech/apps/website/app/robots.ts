import { URLS } from "@asotech/configuration";

export default function robots() {
  return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `${URLS.website.replace(/\/$/, "")}/sitemap.xml` };
}
