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
  // read-excel-file -> unzipper mentions optional cloud-storage packages we never use. Ignore them so the build
  // does not fail; they are only needed to read zip files straight from S3, which this app does not do.
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^(@aws-sdk\/client-s3|aws-sdk)$/ }));
    return config;
  },
  async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};
export default nextConfig;
