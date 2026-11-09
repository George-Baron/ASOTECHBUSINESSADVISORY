import Link from "next/link";
import { DataTable, PageHeader, StatusBadge, Badge } from "@asotech/ui";
import { staffCtx } from "../../../lib/ctx";
import { loadProjects, byId } from "../../../lib/data";

export const metadata = { title: "Deliverables" };

export default async function DeliverablesPage() {
  const { sb } = await staffCtx();
  const [projects, { data }] = await Promise.all([loadProjects(sb), sb.from("project_deliverables").select("id, software_project_id, title, kind, status, is_published").order("created_at", { ascending: false })]);
  const pm = byId(projects);
  return (
    <>
      <PageHeader title="Deliverables" description="Everything handed to clients, and what is waiting on their review." />
      <DataTable empty="No deliverables yet."
        columns={[{ key: "t", header: "Deliverable" }, { key: "p", header: "Project" }, { key: "k", header: "Kind" }, { key: "s", header: "Status" }, { key: "v", header: "Visibility" }]}
        rows={((data ?? []) as any[]).map((d) => ({ t: d.title, p: <Link className="underline" href={`/software-projects/${d.software_project_id}`}>{pm.get(d.software_project_id)?.name ?? "Project"}</Link>, k: d.kind, s: <StatusBadge status={d.status} />, v: <Badge tone={d.is_published ? "ok" : "neutral"}>{d.is_published ? "Client can see" : "Internal"}</Badge> }))} />
    </>
  );
}
