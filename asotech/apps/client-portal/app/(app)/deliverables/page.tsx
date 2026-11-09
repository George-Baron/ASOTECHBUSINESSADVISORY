import { PageHeader, DataTable, StatusBadge, Button } from "@asotech/ui";
import { titleCase } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { decide } from "../../../lib/actions";
import { Flash } from "../../../lib/flash";

export const metadata = { title: "Deliverables" };
type Deliv = { id: string; title: string; kind: string; status: string; software_project_id: string };
type Proj = { id: string; name: string };

export default async function Deliverables({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb, orgId } = await ctx();
  const [d, p] = await Promise.all([
    sb.from("project_deliverables").select("id, title, kind, status, software_project_id").eq("organization_id", orgId).order("created_at", { ascending: false }),
    sb.from("software_projects").select("id, name").eq("organization_id", orgId),
  ]);
  const rows = (d.data ?? []) as Deliv[];
  const names = new Map(((p.data ?? []) as Proj[]).map((x) => [x.id, x.name] as const));
  return (
    <>
      <PageHeader title="Deliverables" description="Work products ASOTECH has published for your review. Approve them or ask for changes." />
      <Flash sp={sp} />
      <DataTable empty="No deliverables have been published yet."
        columns={[{ key: "t", header: "Deliverable" }, { key: "p", header: "Project" }, { key: "k", header: "Type" }, { key: "s", header: "Status" }, { key: "a", header: "Your response" }]}
        rows={rows.map((x) => ({
          t: <span className="font-semibold">{x.title}</span>, p: names.get(x.software_project_id) ?? "–", k: titleCase(x.kind), s: <StatusBadge status={x.status} />,
          a: x.status === "in_review" ? (
            <form action={decide} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="entity" value="deliverable" /><input type="hidden" name="id" value={x.id} /><input type="hidden" name="return_to" value="/deliverables" />
              <input name="note" placeholder="Optional note" aria-label="Optional note" className="w-36 rounded-lg border border-navy-200 px-2 py-1.5 text-sm" />
              <Button name="approve" value="true" size="sm">Approve</Button>
              <Button name="approve" value="false" size="sm" variant="ghost">Request changes</Button>
            </form>
          ) : "–",
        }))} />
    </>
  );
}
