import Link from "next/link";
import { Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadOrgs, orgNameMap } from "../../../lib/data";
import { PROJECT_STATUSES, STAGES } from "../../../lib/constants";
import { Flash } from "../../../lib/flash";
import { createSoftware } from "./actions";

export const metadata = { title: "Software projects" };

export default async function SoftwareList({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  const [orgs, { data }] = await Promise.all([loadOrgs(sb), sb.from("software_projects").select("id, organization_id, name, stage, status, target_date").order("created_at", { ascending: false })]);
  const names = orgNameMap(orgs);
  return (
    <>
      <PageHeader title="Software projects" description="Custom software delivery: requirements, milestones, deliverables and tasks." />
      <Flash sp={sp} />
      <Card className="mb-8 max-w-3xl">
        <form action={createSoftware} className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" name="organization_id"><Select id="organization_id" name="organization_id" required defaultValue=""><option value="" disabled>Choose a client</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Project name" name="name"><Input id="name" name="name" required minLength={3} maxLength={160} /></Field>
          <div className="sm:col-span-2"><Field label="Description" name="description"><Textarea id="description" name="description" maxLength={4000} /></Field></div>
          <Field label="Stage" name="stage"><Select id="stage" name="stage" defaultValue="discovery">{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Status" name="status"><Select id="status" name="status" defaultValue="planned">{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Starts" name="starts_on"><Input id="starts_on" name="starts_on" type="date" /></Field>
          <Field label="Target date" name="target_date"><Input id="target_date" name="target_date" type="date" /></Field>
          <div className="sm:col-span-2"><Button>Create project</Button></div>
        </form>
      </Card>
      <DataTable empty="No software projects yet."
        columns={[{ key: "n", header: "Project" }, { key: "c", header: "Client" }, { key: "g", header: "Stage" }, { key: "s", header: "Status" }, { key: "t", header: "Target" }]}
        rows={((data ?? []) as any[]).map((p) => ({ n: <Link className="font-semibold hover:underline" href={`/software-projects/${p.id}`}>{p.name}</Link>, c: names.get(p.organization_id) ?? "–", g: p.stage, s: <StatusBadge status={p.status} />, t: p.target_date ? formatDate(p.target_date) : "–" }))} />
    </>
  );
}
