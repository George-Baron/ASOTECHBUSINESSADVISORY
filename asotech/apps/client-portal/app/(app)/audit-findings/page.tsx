import { PageHeader, Card, StatusBadge, EmptyState } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";

export const metadata = { title: "Audit findings" };
type Finding = { id: string; title: string; description: string | null; severity: string; status: string; created_at: string };
type Action = { id: string; finding_id: string; description: string; owner_name: string | null; due_date: string | null; status: string };

export default async function AuditFindings() {
  const { sb, orgId } = await ctx();
  const [f, a] = await Promise.all([
    sb.from("audit_findings").select("id, title, description, severity, status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
    sb.from("corrective_actions").select("id, finding_id, description, owner_name, due_date, status").eq("organization_id", orgId),
  ]);
  const findings = (f.data ?? []) as Finding[];
  const actions = (a.data ?? []) as Action[];
  return (
    <>
      <PageHeader title="Audit findings" description="Findings raised during ASOTECH audits and reviews, with the actions agreed to resolve them." />
      {findings.length === 0 ? <EmptyState title="No findings have been published to you" /> : (
        <div className="space-y-4">
          {findings.map((x) => {
            const linked = actions.filter((c) => c.finding_id === x.id);
            return (
              <div key={x.id}><Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-navy">{x.title}</h2>
                  <span className="flex gap-2"><StatusBadge status={x.severity} /><StatusBadge status={x.status} /></span>
                </div>
                {x.description && <p className="mt-2 text-sm text-slate2">{x.description}</p>}
                <p className="mt-1 text-xs text-slate2">Raised {formatDate(x.created_at)}</p>
                {linked.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-navy-100/60 pt-3 text-sm">
                    {linked.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2"><span>{c.description}{c.owner_name ? ` (${c.owner_name})` : ""}</span><span className="flex items-center gap-2 text-slate2">Due {formatDate(c.due_date)} <StatusBadge status={c.status} /></span></li>)}
                  </ul>
                )}
              </Card></div>
            );
          })}
        </div>
      )}
    </>
  );
}
