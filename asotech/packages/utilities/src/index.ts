export const formatMoney = (amount: number | string | null | undefined, currency = "NGN", locale = "en-NG"): string => {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
};

/** Kobo (Paystack minor units) to naira. */
export const koboToNaira = (kobo: number): number => kobo / 100;

export const formatQty = (n: number | string | null | undefined): string => {
  const v = typeof n === "string" ? Number(n) : n;
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 4 }).format(v);
};

export const formatDate = (iso: string | Date | null | undefined, withTime = false): string => {
  if (!iso) return "–";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric", month: "short", day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Africa/Lagos",
  }).format(d);
};

export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export const titleCase = (s: string): string =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const cn = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------------------------
// CSV: RFC 4180 compatible parser and writer (no dependencies)
// ---------------------------------------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

/** Guards against spreadsheet formula injection when exporting user-controlled text. */
const neutralise = (v: string): string => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows
    .map((r) =>
      r.map((cell) => {
        const s = cell === null || cell === undefined ? "" : neutralise(String(cell));
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    )
    .join("\r\n");
}

export function csvToObjects(text: string): Array<Record<string, string>> {
  const [head, ...rest] = parseCsv(text);
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** Path prefix this app is served under (e.g. "/portal"); "" when served from the root. Set by each app's next.config.mjs. */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Prefix a root-relative path with the app's base path. Needed only for plain <a href>, redirects and cookies; <Link> and redirect() add it automatically. */
export const withBase = (path: string): string => `${BASE_PATH}${path}`;
