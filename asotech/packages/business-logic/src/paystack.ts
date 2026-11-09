import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifies the `x-paystack-signature` header: HMAC-SHA512 of the raw request body with the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null | undefined, secretKey: string): boolean {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8"), b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaystackChargeEvent {
  event: string;
  data: {
    reference: string; amount: number; currency: string; status: string; paid_at?: string | null;
    customer?: { customer_code?: string; email?: string };
    metadata?: { organization_id?: string; plan_key?: string } | null;
    plan?: { plan_code?: string } | null;
  };
}

/** Maps a verified Paystack event to the rows we persist. Returns null for events we do not handle. */
export function mapPaystackEvent(evt: PaystackChargeEvent) {
  if (evt.event !== "charge.success") return null;
  const org = evt.data.metadata?.organization_id;
  const plan = evt.data.metadata?.plan_key;
  if (!org || !plan) return null;
  return {
    organization_id: org,
    plan_key: plan,
    billing: {
      organization_id: org,
      amount_kobo: evt.data.amount,
      currency: evt.data.currency,
      status: "paid" as const,
      paystack_reference: evt.data.reference,
      paid_at: evt.data.paid_at ?? new Date().toISOString(),
    },
    customer_code: evt.data.customer?.customer_code ?? null,
  };
}
