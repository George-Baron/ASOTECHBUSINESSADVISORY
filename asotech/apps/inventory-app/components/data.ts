// Server-side data helpers shared by the procurement, expiry, reports and settings modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Sb = any;

/** Today's date in Lagos as YYYY-MM-DD. */
export function lagosDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Document numbers such as PO-20261105-001. `offset` is used to retry after a unique-violation. */
export async function nextNumber(sb: Sb, table: string, column: string, prefix: string, orgId: string, offset = 0): Promise<string> {
  const stem = `${prefix}-${lagosDate().replace(/-/g, "")}-`;
  const { count } = await sb.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId).like(column, `${stem}%`);
  return `${stem}${String((count ?? 0) + 1 + offset).padStart(3, "0")}`;
}

export async function orgCurrency(sb: Sb, orgId: string): Promise<string> {
  const { data } = await sb.from("organizations").select("currency").eq("id", orgId).maybeSingle();
  return (data?.currency as string | undefined) ?? "NGN";
}

/** Pages through a query 1000 rows at a time (PostgREST caps each response). Stops at `cap` rows. */
export async function fetchPages(
  build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
  cap = 20000,
): Promise<{ rows: Row[]; truncated: boolean }> {
  const rows: Row[] = [];
  let from = 0;
  while (rows.length < cap) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    from += data.length;
  }
  return { rows: rows.slice(0, cap), truncated: rows.length >= cap };
}

/** All rows of an organisation-scoped table or view. `order` must be a stable, unique-enough column. */
export async function loadAll(sb: Sb, table: string, columns: string, orgId: string, order = "id", cap = 20000) {
  return fetchPages((from, to) => sb.from(table).select(columns).eq("organization_id", orgId).order(order).range(from, to), cap);
}

export const mapById = (rows: Row[], key = "id"): Map<string, Row> => new Map(rows.map((r) => [r[key] as string, r]));

export const isUuid = (v: string | null | undefined): v is string =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const isIsoDate = (v: string | null | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + "T00:00:00Z").getTime());
