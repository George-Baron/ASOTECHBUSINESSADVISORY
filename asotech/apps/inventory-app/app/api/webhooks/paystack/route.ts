import { NextResponse } from "next/server";
import { createAdmin } from "@asotech/supabase/server";
import { mapPaystackEvent, verifyPaystackSignature, type PaystackChargeEvent } from "@asotech/business-logic/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack webhook (charge.success). Set the URL in the Paystack dashboard to:
 *   https://<inventory-domain>/api/webhooks/paystack
 * The raw body is verified with HMAC-SHA512 (x-paystack-signature) before anything is trusted.
 * Duplicate deliveries are ignored through the unique billing_records.paystack_reference.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payments are not enabled" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"), secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let evt: PaystackChargeEvent;
  try { evt = JSON.parse(raw) as PaystackChargeEvent; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const mapped = mapPaystackEvent(evt);
  if (!mapped) return NextResponse.json({ status: "ignored" });

  const admin = createAdmin();
  const { data: org } = await admin.from("organizations").select("id").eq("id", mapped.organization_id).maybeSingle();
  const { data: plan } = await admin.from("subscription_plans").select("key").eq("key", mapped.plan_key).maybeSingle();
  if (!org || !plan) return NextResponse.json({ status: "ignored" });

  const { data: inserted, error } = await admin.from("billing_records").upsert(mapped.billing, { onConflict: "paystack_reference", ignoreDuplicates: true }).select("id");
  if (error) return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  if (!inserted?.length) return NextResponse.json({ status: "duplicate" });

  const start = new Date();
  const end = new Date(start); end.setMonth(end.getMonth() + 1);
  const { data: live } = await admin.from("subscriptions").select("id").eq("organization_id", mapped.organization_id).in("status", ["trialing", "active", "past_due"]).maybeSingle();
  const fields = { plan_key: mapped.plan_key, status: "active", current_period_start: start.toISOString(), current_period_end: end.toISOString(), paystack_customer_code: mapped.customer_code };
  const res = live
    ? await admin.from("subscriptions").update(fields).eq("id", live.id)
    : await admin.from("subscriptions").insert({ organization_id: mapped.organization_id, ...fields });
  if (res.error) return NextResponse.json({ error: "Could not update subscription" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}

export const GET = () => NextResponse.json({ error: "Use POST" }, { status: 405 });
