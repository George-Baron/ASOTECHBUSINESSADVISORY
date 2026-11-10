/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
// Served under a path prefix on the shared address (www.asotech.com.ng/<prefix>). Set APP_BASE_PATH=/ to serve from the root
// (for example when an app has its own domain). The value is fixed at build time.
const rawBase = process.env.APP_BASE_PATH;
const BASE_PATH = rawBase === undefined ? "/portal" : rawBase.replace(/\/+$/, "");
const nextConfig = {
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  transpilePackages: ["@asotech/ui", "@asotech/utilities", "@asotech/types", "@asotech/validation", "@asotech/configuration", "@asotech/business-logic", "@asotech/supabase"],
  async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};
export default nextConfig;
