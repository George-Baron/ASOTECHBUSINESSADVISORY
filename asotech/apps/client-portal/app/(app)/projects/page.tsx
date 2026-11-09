import Link from "next/link";
import { PageHeader, DataTable, StatusBadge } from "@asotech/ui";
import { formatDate, titleCase } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";

export const metadata = { title: "Projects" };
type Consulting = { id: string; title: string; summary: string | null; status: string; starts_on: string | null; ends_on: string | null };
type Software = { id: string; name: string; stage: string; status: string; target_date: string | null };

export default async function Projects({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb, orgId } = await ctx();
  const [c, s] = await Promise.all([
    sb.from("consulting_projects").select("id, title, summary, status, starts_on, ends_on").eq("organization_id", orgId).order("created_at", { ascending: false }),
    sb.from("software_projects").select("id, name, stage, status, target_date").eq("organization_id", orgId).order("created_at", { ascending: false }),
  ]);
  const consulting = (c.data ?? []) as Consulting[];
  const software = (s.data ?? []) as Software[];
  return (
    <>
      <PageHeader title="Projects" description="Your consulting engagements and software projects with ASOTECH." />
      <Flash sp={sp} />
      <h2 className="mb-2 text-lg font-bold text-navy">Software projects</h2>
      <DataTable
        empty="No software projects yet."
        columns={[{ key: "name", header: "Project" }, { key: "stage", header: "Stage" }, { key: "status", header: "Status" }, { key: "target", header: "Target date" }]}
        rows={software.map((p) => ({ name: <Link className="font-semibold underline" href={`/projects/${p.id}`}>{p.name}</Link>, stage: titleCase(p.stage), status: <StatusBadge status={p.status} />, target: formatDate(p.target_date) }))}
      />
      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Consulting projects</h2>
      <DataTable
        empty="No consulting projects yet."
        columns={[{ key: "title", header: "Project" }, { key: "summary", header: "Summary" }, { key: "status", header: "Status" }, { key: "period", header: "Period" }]}
        rows={consulting.map((p) => ({ title: <span className="font-semibold">{p.title}</span>, summary: p.summary ?? "–", status: <StatusBadge status={p.status} />, period: `${formatDate(p.starts_on)} to ${formatDate(p.ends_on)}` }))}
      />
    </>
  );
}
