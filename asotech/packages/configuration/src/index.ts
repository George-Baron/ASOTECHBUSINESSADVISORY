export const BRAND = {
  name: "ASOTECH Business Advisory",
  shortName: "ASOTECH",
  tagline: "Control. Accuracy. Intelligence.",
  strapline: "Comprehensive Business Solutions for a Smarter, More Efficient Business",
  colors: {
    navy: "#0B2F4F",
    orange: "#F28C1E",
    cloud: "#F3F6FA",
    white: "#FFFFFF",
    slate: "#5B6B7B",
    success: "#1E9E5A",
    warning: "#C2640A",
    danger: "#C0392B",
  },
} as const;

/** Contact details come from the supplied banner. Confirm them before launch (see documentation/setup-guide.md). */
export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@asotech.com.ng",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+234 801 234 5678",
  website: "www.asotech.com.ng",
  country: "Nigeria",
} as const;

export const URLS = {
  website: process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000",
  inventory: process.env.NEXT_PUBLIC_INVENTORY_URL ?? "http://localhost:3001/inventory",
  portal: process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002/portal",
  pm: process.env.NEXT_PUBLIC_PM_URL ?? "http://localhost:3003/staff",
} as const;

export const SUPABASE_ENV = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? "",
} as const;

export const DEFAULT_CURRENCY = "NGN";
export const DEFAULT_LOCALE = "en-NG";
