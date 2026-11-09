import { toCsv } from "@asotech/utilities";
import { ctx } from "../../../../../lib/ctx";
import { buildReport } from "../../../../../components/reports";

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const c = await ctx();
  if (!c.can("reports.view")) return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const res = await buildReport(c.sb, c.orgId, report, { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
  if (!res) return new Response("Unknown report", { status: 404 });
  const body = toCsv([res.columns, ...res.rows]);
  const file = `asotech-${report}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store", ...(res.truncated ? { "X-Truncated": "true" } : {}) } });
}
