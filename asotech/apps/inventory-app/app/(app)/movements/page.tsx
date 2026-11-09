import Link from "next/link";
import { DataTable, LinkButton, PageHeader, StatusBadge, Select, Input, Button } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import type { MovementType } from "@asotech/types";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { Pager } from "../../../components/core-pager";
import { MOVEMENT_LABELS, PAGE_SIZE, pageNum, profileNames, searchTerm, type AnyRow } from "../../../components/core-util";

export const metadata = { title: "Stock movements" };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; type?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="the stock ledger" />;
  const page = pageNum(sp.page);
  const q = searchTerm(sp.q);
  let query = c.sb.from("stock_movements").select("id, reference, movement_type, approval, notes, created_at, created_by, reverses_movement_id", { count: "exact" }).eq("organization_id", c.orgId);
  if (sp.type && sp.type in MOVEMENT_LABELS) query = query.eq("movement_type", sp.type);
  if (q) query = query.ilike("reference", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as AnyRow[];
  const names = await profileNames(c.sb, rows.map((r) => r.created_by));

  return (
    <>
      <PageHeader title="Stock movements" description="The ledger is the authoritative record of every stock change. Entries cannot be edited or deleted; mistakes are corrected with a reversal."
        actions={c.can("movements.post") ? <LinkButton href="/movements/new" size="sm">New movement</LinkButton> : undefined} />
      <Flash sp={{ ...sp, error: sp.error ?? (error ? "Could not load movements." : undefined) }} />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div><label htmlFor="type" className="mb-1 block text-xs font-semibold text-slate2">Type</label>
          <Select id="type" name="type" defaultValue={sp.type ?? ""}>
            <option value="">All types</option>
            {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></div>
        <div><label htmlFor="q" className="mb-1 block text-xs font-semibold text-slate2">Reference</label><Input id="q" name="q" defaultValue={q} placeholder="Search reference" /></div>
        <Button variant="secondary" size="sm">Filter</Button>
      </form>
      <DataTable empty="No movements match."
        columns={[{ key: "d", header: "Date" }, { key: "r", header: "Reference" }, { key: "t", header: "Type" }, { key: "u", header: "By" }, { key: "s", header: "Status" }]}
        rows={rows.map((m) => ({
          d: formatDate(m.created_at, true),
          r: <Link className="font-semibold underline-offset-2 hover:underline" href={`/movements/${m.id}`}>{m.reference}</Link>,
          t: <>{MOVEMENT_LABELS[m.movement_type as MovementType]}{m.reverses_movement_id ? " (reversal)" : ""}</>,
          u: names[m.created_by] ?? "–",
          s: <StatusBadge status={m.approval === "not_required" ? "posted" : m.approval} />,
        }))} />
      <Pager base="/movements" params={{ type: sp.type, q }} page={page} total={count ?? 0} pageSize={PAGE_SIZE} />
    </>
  );
}
