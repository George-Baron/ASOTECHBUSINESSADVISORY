import { NextResponse } from "next/server";
import { createAdmin } from "@asotech/supabase/server";
import { apiKeyMatches, parseAppSheetCount } from "@asotech/business-logic/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * AppSheet count intake.
 *   POST /api/integrations/appsheet/count
 *   Headers: x-connection-id: <connection uuid>, x-api-key: <key shown once when generated>
 *   Body:    { "event_key": "unique-per-scan", "line_id": "<count line uuid>", "quantity": 12, "note": "optional" }
 *   Test:    { "test": true, "event_key": "any unique string" }  (allowed while the connection is "configured")
 * The organisation is always taken from the stored connection, never from the request body.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 10_240) return fail(413, "Payload too large");
  const connectionId = request.headers.get("x-connection-id") ?? "";
  const apiKey = request.headers.get("x-api-key") ?? "";
  if (!UUID.test(connectionId) || !apiKey) return fail(401, "Missing credentials");

  let admin;
  try { admin = createAdmin(); } catch { return fail(503, "Integration endpoint is not configured"); }

  const { data: conn } = await admin.from("integration_connections").select("id, organization_id, provider, status, config").eq("id", connectionId).maybeSingle();
  const hash = typeof conn?.config?.api_key_hash === "string" ? (conn.config.api_key_hash as string) : "";
  // Same response for unknown connection and wrong key: do not reveal which was wrong.
  if (!conn || conn.provider !== "appsheet" || !hash || !apiKeyMatches(apiKey, hash)) return fail(401, "Invalid credentials");
  if (!["configured", "verified"].includes(conn.status)) return fail(403, "Connection is disabled");

  const text = await request.text();
  if (text.length > 10_240) return fail(413, "Payload too large");
  let body: unknown;
  try { body = JSON.parse(text); } catch { return fail(400, "Body must be valid JSON"); }
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  if (b.test === true) {
    const key = typeof b.event_key === "string" && b.event_key.length >= 8 && b.event_key.length <= 200 ? b.event_key : `test-${Date.now()}`;
    const { data, error } = await admin.rpc("record_integration_event", { p_org: conn.organization_id, p_connection: conn.id, p_direction: "inbound", p_event_type: "test.ping", p_key: key, p_payload: { test: true } });
    if (error) return fail(500, "Could not record the test event");
    const ev = Array.isArray(data) ? data[0] : data;
    if (ev?.event_id) await admin.from("integration_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", ev.event_id).eq("organization_id", conn.organization_id);
    return NextResponse.json({ status: "test_ok", verified: conn.status === "verified" }, { headers: { "Cache-Control": "no-store" } });
  }

  if (conn.status !== "verified") return fail(403, "Connection is not verified yet. Send a test event, then ask an administrator to mark it verified.");
  const parsed = parseAppSheetCount(body);
  if (!parsed.ok) return fail(422, parsed.error);
  const { data, error } = await admin.rpc("integration_record_count", {
    p_org: conn.organization_id, p_connection: conn.id, p_event_key: parsed.value.event_key, p_line: parsed.value.line_id, p_quantity: parsed.value.quantity, p_note: parsed.value.note ?? null,
  });
  if (error) {
    // Business-rule failures (line not found, session closed) are the caller's problem; hide everything else.
    const known = /Count line not found|Count session is not open|Quantity must be/.test(error.message ?? "");
    return fail(known ? 409 : 500, known ? error.message : "Could not record the count");
  }
  return NextResponse.json({ status: data }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = () => fail(405, "Use POST");
