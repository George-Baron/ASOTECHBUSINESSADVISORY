import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Button, DataTable, Input, PageHeader } from "@asotech/ui";
import { formatQty } from "@asotech/utilities";
import { ctx } from "../../../../lib/ctx";
import { NoAccess } from "../../../../components/common";
import { PrintButton } from "../../../../components/core-print-button";
import { buildReport } from "../../../../components/reports";

export const metadata = { title: "Report" };
const SHOW = 200;

export default async function ReportPage({ params, searchParams }: { params: Promise<{ report: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { report } = await params;
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("reports.view")) return <NoAccess what="reports" />;
  const res = await buildReport(c.sb, c.orgId, report, sp);
  if (!res) return notFound();
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string" && v) as Array<[string, string]>).toString();
  return (
    <>
      <PageHeader title={res.title} description={`${formatQty(res.rows.length)} rows`}
        actions={<><PrintButton /><a className="rounded-lg bg-brand-orange px-3 py-1.5 text-sm font-semibold text-navy" href={`/reports/export/${report}${qs ? `?${qs}` : ""}`}>Export CSV</a><Link className="text-sm font-semibold text-navy underline" href="/reports">All reports</Link></>} />
      {report === "movements" && (
        <form className="no-print mb-4 flex flex-wrap items-end gap-3">
          <div><label htmlFor="from" className="mb-1 block text-xs font-semibold text-slate2">From</label><Input id="from" name="from" type="date" defaultValue={sp.from} /></div>
          <div><label htmlFor="to" className="mb-1 block text-xs font-semibold text-slate2">To</label><Input id="to" name="to" type="date" defaultValue={sp.to} /></div>
          <Button variant="secondary" size="sm">Apply</Button>
        </form>
      )}
      {res.truncated && <Alert tone="warn">This report was capped at 50,000 rows. Narrow the date range or filters.</Alert>}
      {res.rows.length > SHOW && <Alert tone="info">Showing the first {SHOW} rows. Export CSV for the full report.</Alert>}
      <DataTable empty="No data for this report yet." columns={res.columns.map((h, i) => ({ key: String(i), header: h, align: typeof res.rows[0]?.[i] === "number" ? ("right" as const) : ("left" as const) }))}
        rows={res.rows.slice(0, SHOW).map((r) => Object.fromEntries(r.map((v, i) => [String(i), typeof v === "number" ? formatQty(v) : v])))} />
    </>
  );
}
