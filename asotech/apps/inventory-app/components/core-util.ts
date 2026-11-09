import type { createServer } from "@asotech/supabase/server";
import type { MovementType } from "@asotech/types";

export type Sb = Awaited<ReturnType<typeof createServer>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRow = Record<string, any>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Numeric form field: null when empty, NaN when not a number. */
export function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Strips characters that have meaning inside PostgREST filter strings. */
export const searchTerm = (q?: string): string => (q ?? "").replace(/[%*,()\\:]/g, " ").trim().slice(0, 60);

export const PAGE_SIZE = 50;
export const pageNum = (p?: string): number => { const n = Number(p); return Number.isInteger(n) && n > 0 ? n : 1; };

export function href(base: string, params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening_balance: "Opening balance", receipt: "Receipt", issue: "Issue", transfer: "Transfer",
  adjustment_in: "Adjustment in", adjustment_out: "Adjustment out", return_in: "Return in", return_out: "Return out",
};

/** Fetch rows of `table` by id (chunked) and index them. */
export async function byId(sb: Sb, table: string, ids: Array<string | null | undefined>, cols: string): Promise<Record<string, AnyRow>> {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const out: Record<string, AnyRow> = {};
  for (let i = 0; i < uniq.length; i += 100) {
    const { data } = await sb.from(table).select(cols).in("id", uniq.slice(i, i + 100));
    for (const r of (data ?? []) as AnyRow[]) out[r.id as string] = r;
  }
  return out;
}

export async function profileNames(sb: Sb, ids: Array<string | null | undefined>): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const out: Record<string, string> = {};
  if (!uniq.length) return out;
  const { data } = await sb.from("user_profiles").select("id, full_name").in("id", uniq.slice(0, 200));
  for (const r of (data ?? []) as AnyRow[]) out[r.id as string] = (r.full_name as string) || "User";
  return out;
}

export const UUID_RE = UUID;
