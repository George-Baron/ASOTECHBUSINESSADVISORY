import Link from "next/link";
import { DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadProjects, byId } from "../../../lib/data";

export const metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const { sb } = await staffCtx();
  const [projects, { data }] = await Promise.all([loadProjects(sb), sb.from("project_milestones").select("id, software_project_id, title, due_date, status").order("due_date", { ascending: true, nullsFirst: false })]);
  const pm = byId(projects);
  return (
    <>
      <PageHeader title="Milestones" description="Upcoming and completed milestones. Manage them on the project page." />
      <DataTable empty="No milestones yet."
        columns={[{ key: "t", header: "Milestone" }, { key: "p", header: "Project" }, { key: "d", header: "Due" }, { key: "s", header: "Status" }]}
        rows={((data ?? []) as any[]).map((m) => ({ t: m.title, p: <Link className="underline" href={`/software-projects/${m.software_project_id}`}>{pm.get(m.software_project_id)?.name ?? "Project"}</Link>, d: m.due_date ? formatDate(m.due_date) : "–", s: <StatusBadge status={m.status} /> }))} />
    </>
  );
}
