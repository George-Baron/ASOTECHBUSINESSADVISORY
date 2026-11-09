import Link from "next/link";
import { Button, Card, PageHeader, Select } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx, today, isUuid, staffUsers } from "../../../lib/ctx";
import { loadProjects, byId } from "../../../lib/data";
import { TASK_STATUSES } from "../../../lib/constants";
import { Flash } from "../../../lib/flash";
import { moveTask } from "../software-projects/actions";

export const metadata = { title: "Tasks" };

export default async function TasksBoard({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; project?: string; mine?: string }> }) {
  const sp = await searchParams;
  const { sb, session } = await staffCtx();
  const [projects, team] = await Promise.all([loadProjects(sb), staffUsers(session)]);
  let q = sb.from("project_tasks").select("id, software_project_id, title, stage, status, assignee, due_date").order("due_date", { ascending: true, nullsFirst: false });
  if (sp.project && isUuid(sp.project)) q = q.eq("software_project_id", sp.project);
  if (sp.mine === "1") q = q.eq("assignee", session.userId);
  const { data } = await q;
  const tasks = (data ?? []) as any[];
  const pm = byId(projects);
  const who = new Map(team.map((u) => [u.id, u.name]));
  const ret = `/tasks${sp.project ? `?project=${sp.project}` : ""}`;
  return (
    <>
      <PageHeader title="Tasks" description="Delivery board across software projects." />
      <Flash sp={sp} />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div><label htmlFor="project" className="mb-1 block text-xs font-semibold text-slate2">Project</label><Select id="project" name="project" defaultValue={sp.project ?? ""}><option value="">All</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} /> Only my tasks</label>
        <Button size="sm" variant="secondary">Filter</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {TASK_STATUSES.map((st) => {
          const col = tasks.filter((t) => t.status === st);
          return (
            <section key={st} aria-label={st.replace("_", " ")} className="rounded-xl bg-cloud p-3">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">{st.replace("_", " ")} <span className="text-slate2">({col.length})</span></h2>
              <div className="space-y-3">
                {col.length === 0 && <p className="text-xs text-slate2">Nothing here.</p>}
                {col.map((t) => {
                  const late = t.status !== "done" && t.due_date && t.due_date < today();
                  return (
                    <Card key={t.id} className="!p-3">
                      <p className="text-sm font-semibold text-navy">{t.title}</p>
                      <p className="mt-1 text-xs text-slate2"><Link className="underline" href={`/software-projects/${t.software_project_id}`}>{pm.get(t.software_project_id)?.name ?? "Project"}</Link> · {t.stage}</p>
                      <p className="text-xs text-slate2">{(t.assignee && who.get(t.assignee)) || "Unassigned"}{t.due_date ? ` · due ${formatDate(t.due_date)}` : ""}{late ? " · OVERDUE" : ""}</p>
                      <form action={moveTask} className="mt-2 flex gap-2"><input type="hidden" name="id" value={t.id} /><input type="hidden" name="return" value={ret} />
                        <Select name="status" aria-label="Move to" defaultValue={t.status}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select><Button size="sm" variant="secondary">Move</Button></form>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
