/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  transpilePackages: ["@asotech/ui", "@asotech/utilities", "@asotech/types", "@asotech/validation", "@asotech/configuration", "@asotech/business-logic", "@asotech/supabase"],
  async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};
export default nextConfig;
