import Link from "next/link";
import { Card, PageHeader } from "@asotech/ui";
import { ctx } from "../../../lib/ctx";
import { NoAccess } from "../../../components/common";
import { REPORTS } from "../../../components/reports";

export const metadata = { title: "Reports" };

export default async function ReportsHub() {
  const c = await ctx();
  if (!c.can("reports.view")) return <NoAccess what="reports" />;
  return (
    <>
      <PageHeader title="Reports" description="View a report on screen or export it as CSV for Excel. Exports are limited to 50,000 rows." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <h2 className="font-bold text-navy">{r.title}</h2>
            <p className="mt-1 text-sm text-slate2">{r.description}</p>
            <div className="mt-4 flex gap-4 text-sm font-semibold">
              <Link className="text-navy underline" href={`/reports/${r.key}`}>View</Link>
              <a className="text-navy underline" href={`/reports/export/${r.key}`}>Export CSV</a>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
