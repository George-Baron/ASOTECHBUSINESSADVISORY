import { NextResponse } from "next/server";
import { ctx } from "../../../../../../lib/ctx";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const fail = (msg: string) => NextResponse.redirect(`${origin}/support?error=${encodeURIComponent(msg)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Document not found");
  const { sb, orgId } = await ctx();
  const { data } = await sb.from("client_documents").select("storage_path").eq("id", id).eq("organization_id", orgId).eq("visibility", "client").maybeSingle();
  const row = data as { storage_path: string } | null;
  if (!row) return fail("Document not found");
  const { data: signed, error } = await sb.storage.from("client-documents").createSignedUrl(row.storage_path, 60);
  if (error || !signed) return fail("The file could not be retrieved");
  return NextResponse.redirect(signed.signedUrl);
}
