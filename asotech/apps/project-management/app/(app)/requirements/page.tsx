import Link from "next/link";
import { DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { staffCtx } from "../../../lib/ctx";
import { loadProjects, byId } from "../../../lib/data";

export const metadata = { title: "Requirements" };

export default async function RequirementsPage() {
  const { sb } = await staffCtx();
  const [projects, { data }] = await Promise.all([loadProjects(sb), sb.from("project_requirements").select("id, software_project_id, title, priority, status").order("created_at", { ascending: false })]);
  const pm = byId(projects);
  return (
    <>
      <PageHeader title="Requirements" description="All requirements across software projects. Add and edit them on the project page." />
      <DataTable empty="No requirements yet."
        columns={[{ key: "t", header: "Requirement" }, { key: "p", header: "Project" }, { key: "r", header: "Priority" }, { key: "s", header: "Status" }]}
        rows={((data ?? []) as any[]).map((r) => ({ t: r.title, p: <Link className="underline" href={`/software-projects/${r.software_project_id}`}>{pm.get(r.software_project_id)?.name ?? "Project"}</Link>, r: <StatusBadge status={r.priority} />, s: <StatusBadge status={r.status} /> }))} />
    </>
  );
}
