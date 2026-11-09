import Link from "next/link";
import { PageHeader, DataTable, Alert } from "@asotech/ui";
import { formatDate, titleCase } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";

export const metadata = { title: "Reconciliation" };
type Report = { id: string; title: string; report_type: string; storage_path: string | null; published_at: string | null; created_at: string };

export default async function Reconciliation() {
  const { sb, orgId } = await ctx();
  const { data } = await sb.from("client_reports").select("id, title, report_type, storage_path, published_at, created_at").eq("organization_id", orgId).in("report_type", ["reconciliation", "audit"]).order("created_at", { ascending: false });
  const rows = (data ?? []) as Report[];
  return (
    <>
      <PageHeader title="Stock reconciliation" description="Stocktake, audit and reconciliation reports prepared by ASOTECH for your organisation." />
      <Alert tone="info">Each report compares physical counts with system quantities, explains every variance and records the approved adjustments. Detailed stock data stays in your inventory system; this page only shows reports we have published to you.</Alert>
      <DataTable empty="No reconciliation or audit reports have been published yet."
        columns={[{ key: "t", header: "Report" }, { key: "type", header: "Type" }, { key: "d", header: "Published" }, { key: "a", header: "" }]}
        rows={rows.map((r) => ({ t: <span className="font-semibold">{r.title}</span>, type: titleCase(r.report_type), d: formatDate(r.published_at ?? r.created_at), a: r.storage_path ? <Link className="font-semibold underline" href={`/reports/${r.id}/download`}>Download</Link> : "No file attached" }))} />
    </>
  );
}
