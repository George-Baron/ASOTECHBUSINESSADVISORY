import { NextResponse } from "next/server";
import { ctx } from "../../../../../lib/ctx";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const fail = (msg: string) => NextResponse.redirect(`${origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/reports?error=${encodeURIComponent(msg)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Report not found");
  const { sb, orgId } = await ctx();
  // RLS only returns published reports of organisations the user belongs to.
  const { data } = await sb.from("client_reports").select("storage_path, organization_id").eq("id", id).eq("organization_id", orgId).maybeSingle();
  const row = data as { storage_path: string | null } | null;
  if (!row) return fail("Report not found");
  if (!row.storage_path) return fail("No file is attached to that report");
  const { data: signed, error } = await sb.storage.from("client-documents").createSignedUrl(row.storage_path, 60);
  if (error || !signed) return fail("The file could not be retrieved");
  return NextResponse.redirect(signed.signedUrl);
}
