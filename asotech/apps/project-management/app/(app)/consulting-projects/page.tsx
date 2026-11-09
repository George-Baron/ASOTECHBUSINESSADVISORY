import Link from "next/link";
import { Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadOrgs, loadServices, orgNameMap } from "../../../lib/data";
import { PROJECT_STATUSES } from "../../../lib/constants";
import { Flash } from "../../../lib/flash";
import { createConsulting } from "./actions";

export const metadata = { title: "Consulting projects" };

export default async function ConsultingList({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  const [orgs, services, { data }] = await Promise.all([loadOrgs(sb), loadServices(sb), sb.from("consulting_projects").select("id, organization_id, title, status, starts_on, ends_on").order("created_at", { ascending: false })]);
  const names = orgNameMap(orgs);
  return (
    <>
      <PageHeader title="Consulting projects" description="Advisory engagements: reports, audit findings and corrective actions." />
      <Flash sp={sp} />
      <Card className="mb-8 max-w-3xl">
        <form action={createConsulting} className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" name="organization_id"><Select id="organization_id" name="organization_id" required defaultValue=""><option value="" disabled>Choose a client</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Service" name="service_id"><Select id="service_id" name="service_id" defaultValue=""><option value="">Not linked</option>{services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="Title" name="title"><Input id="title" name="title" required minLength={3} maxLength={160} /></Field></div>
          <div className="sm:col-span-2"><Field label="Summary" name="summary"><Textarea id="summary" name="summary" maxLength={2000} /></Field></div>
          <Field label="Status" name="status"><Select id="status" name="status" defaultValue="planned">{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Starts" name="starts_on"><Input id="starts_on" name="starts_on" type="date" /></Field><Field label="Ends" name="ends_on"><Input id="ends_on" name="ends_on" type="date" /></Field></div>
          <div className="sm:col-span-2"><Button>Create project</Button></div>
        </form>
      </Card>
      <DataTable empty="No consulting projects yet."
        columns={[{ key: "t", header: "Project" }, { key: "c", header: "Client" }, { key: "s", header: "Status" }, { key: "d", header: "Dates" }]}
        rows={((data ?? []) as any[]).map((p) => ({ t: <Link className="font-semibold hover:underline" href={`/consulting-projects/${p.id}`}>{p.title}</Link>, c: names.get(p.organization_id) ?? "–", s: <StatusBadge status={p.status} />, d: [p.starts_on, p.ends_on].filter(Boolean).map((d: string) => formatDate(d)).join(" to ") || "–" }))} />
    </>
  );
}
