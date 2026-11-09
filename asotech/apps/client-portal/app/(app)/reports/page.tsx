import Link from "next/link";
import { PageHeader, DataTable } from "@asotech/ui";
import { formatDate, titleCase } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";

export const metadata = { title: "Reports" };
type Report = { id: string; title: string; report_type: string; storage_path: string | null; published_at: string | null; created_at: string };

export default async function Reports({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb, orgId } = await ctx();
  const { data } = await sb.from("client_reports").select("id, title, report_type, storage_path, published_at, created_at").eq("organization_id", orgId).order("created_at", { ascending: false });
  const rows = (data ?? []) as Report[];
  return (
    <>
      <PageHeader title="Reports" description="Reports ASOTECH has published for your organisation." />
      <Flash sp={sp} />
      <DataTable empty="No reports have been published to you yet."
        columns={[{ key: "t", header: "Report" }, { key: "type", header: "Type" }, { key: "d", header: "Published" }, { key: "a", header: "" }]}
        rows={rows.map((r) => ({ t: <span className="font-semibold">{r.title}</span>, type: titleCase(r.report_type), d: formatDate(r.published_at ?? r.created_at), a: r.storage_path ? <Link className="font-semibold underline" href={`/reports/${r.id}/download`}>Download</Link> : "No file attached" }))} />
    </>
  );
}
