import Link from "next/link";
import { Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney } from "@asotech/utilities";
import { staffCtx, isUuid } from "../../../lib/ctx";
import { loadOrgs, loadProjects, orgNameMap } from "../../../lib/data";
import { Flash } from "../../../lib/flash";
import { createQuotation } from "./actions";

export const metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; org?: string; project?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  const [orgs, projects, { data }] = await Promise.all([loadOrgs(sb), loadProjects(sb), sb.from("quotations").select("id, organization_id, quote_number, status, total_amount, currency, created_at").order("created_at", { ascending: false })]);
  const names = orgNameMap(orgs);
  const org = sp.org && isUuid(sp.org) ? sp.org : "";
  return (
    <>
      <PageHeader title="Quotations" description="Prices are entered by you for each client. Nothing is pre-filled or published on the website." />
      <Flash sp={sp} />
      <Card className="mb-8 max-w-4xl">
        <form action={createQuotation} className="grid gap-4 sm:grid-cols-3">
          <Field label="Client" name="organization_id"><Select id="organization_id" name="organization_id" required defaultValue={org}><option value="" disabled>Choose a client</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Software project" name="software_project_id"><Select id="software_project_id" name="software_project_id" defaultValue={sp.project ?? ""}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({names.get(p.organization_id) ?? "client"})</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Currency" name="currency"><Input id="currency" name="currency" defaultValue="NGN" maxLength={3} pattern="[A-Z]{3}" /></Field><Field label="Valid until" name="valid_until"><Input id="valid_until" name="valid_until" type="date" /></Field></div>
          <fieldset className="sm:col-span-3"><legend className="mb-2 text-sm font-semibold text-navy">Line items (leave unused rows empty)</legend>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_7rem_9rem]">
                <Input name={`desc_${i}`} aria-label={`Line ${i + 1} description`} placeholder={`Description ${i + 1}`} maxLength={300} />
                <Input name={`qty_${i}`} aria-label={`Line ${i + 1} quantity`} placeholder="Qty" inputMode="decimal" />
                <Input name={`price_${i}`} aria-label={`Line ${i + 1} unit price`} placeholder="Unit price" inputMode="decimal" />
              </div>
            ))}
          </fieldset>
          <div className="sm:col-span-3"><Button>Save as draft</Button></div>
        </form>
      </Card>
      <DataTable empty="No quotations yet."
        columns={[{ key: "n", header: "Number" }, { key: "c", header: "Client" }, { key: "a", header: "Total" }, { key: "s", header: "Status" }, { key: "d", header: "Created" }]}
        rows={((data ?? []) as any[]).map((q) => ({ n: <Link className="font-semibold hover:underline" href={`/quotations/${q.id}`}>{q.quote_number}</Link>, c: names.get(q.organization_id) ?? "–", a: formatMoney(Number(q.total_amount), q.currency), s: <StatusBadge status={q.status} />, d: formatDate(q.created_at) }))} />
    </>
  );
}
