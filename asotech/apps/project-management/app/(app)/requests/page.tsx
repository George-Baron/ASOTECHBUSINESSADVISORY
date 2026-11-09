import Link from "next/link";
import { DataTable, PageHeader, Select, Button, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadInbox } from "../../../lib/data";
import { REQUEST_STATUSES } from "../../../lib/constants";
import { Flash } from "../../../lib/flash";

export const metadata = { title: "Requests inbox" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; status?: string; kind?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  let items = await loadInbox(sb, 200);
  if (sp.status) items = items.filter((i) => i.status === sp.status);
  if (sp.kind) items = items.filter((i) => i.kind === sp.kind);
  return (
    <>
      <PageHeader title="Requests inbox" description="Consultation, proposal, contact and service requests from the website." />
      <Flash sp={sp} />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div><label htmlFor="kind" className="mb-1 block text-xs font-semibold text-slate2">Type</label>
          <Select id="kind" name="kind" defaultValue={sp.kind ?? ""}><option value="">All</option><option value="consultation">Consultation</option><option value="proposal">Proposal</option><option value="contact">Contact</option><option value="service">Service</option></Select></div>
        <div><label htmlFor="status" className="mb-1 block text-xs font-semibold text-slate2">Status</label>
          <Select id="status" name="status" defaultValue={sp.status ?? ""}><option value="">All</option>{REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></div>
        <Button variant="secondary" size="sm">Filter</Button>
      </form>
      <DataTable empty="No requests match."
        columns={[{ key: "d", header: "Received" }, { key: "k", header: "Type" }, { key: "n", header: "From" }, { key: "s", header: "Summary" }, { key: "st", header: "Status" }]}
        rows={items.map((i) => ({ d: formatDate(i.created_at, true), k: i.kind, n: <Link className="font-semibold hover:underline" href={`/requests/${i.kind}/${i.id}`}>{i.name}</Link>, s: i.summary || "–", st: <StatusBadge status={i.status} /> }))} />
    </>
  );
}
