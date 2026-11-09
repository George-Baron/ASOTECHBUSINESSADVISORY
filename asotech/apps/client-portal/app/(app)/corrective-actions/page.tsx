import { PageHeader, DataTable, StatusBadge, Badge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx, todayIso } from "../../../lib/ctx";

export const metadata = { title: "Corrective actions" };
type Action = { id: string; finding_id: string; description: string; owner_name: string | null; due_date: string | null; status: string };
type Finding = { id: string; title: string };

export default async function CorrectiveActions() {
  const { sb, orgId } = await ctx();
  const [a, f] = await Promise.all([
    sb.from("corrective_actions").select("id, finding_id, description, owner_name, due_date, status").eq("organization_id", orgId).order("due_date", { nullsFirst: false }),
    sb.from("audit_findings").select("id, title").eq("organization_id", orgId),
  ]);
  const today = todayIso();
  const titles = new Map(((f.data ?? []) as Finding[]).map((x) => [x.id, x.title] as const));
  const rows = (a.data ?? []) as Action[];
  return (
    <>
      <PageHeader title="Corrective actions" description="Actions agreed to resolve audit findings." />
      <DataTable empty="No corrective actions have been published yet."
        columns={[{ key: "d", header: "Action" }, { key: "f", header: "Finding" }, { key: "o", header: "Owner" }, { key: "due", header: "Due" }, { key: "s", header: "Status" }]}
        rows={rows.map((x) => {
          const late = x.status !== "done" && !!x.due_date && x.due_date < today;
          return { d: x.description, f: titles.get(x.finding_id) ?? "–", o: x.owner_name ?? "–", due: <span className={late ? "font-bold text-bad" : undefined}>{formatDate(x.due_date)}{late && " (overdue)"}</span>, s: late ? <Badge tone="bad">overdue</Badge> : <StatusBadge status={x.status} /> };
        })} />
    </>
  );
}
