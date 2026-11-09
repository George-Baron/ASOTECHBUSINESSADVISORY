import { Alert, Card, DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney, koboToNaira } from "@asotech/utilities";
import { CONTACT } from "@asotech/configuration";
import { ctx } from "../../../lib/ctx";
import { NoAccess } from "../../../components/common";
import type { AnyRow } from "../../../components/core-util";

export const metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const c = await ctx();
  if (!c.can("billing.view")) return <NoAccess what="billing" />;
  const [{ data: subs }, { data: plans }, { data: bills }] = await Promise.all([
    c.sb.from("subscriptions").select("*").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(5),
    c.sb.from("subscription_plans").select("*").eq("is_published", true),
    c.sb.from("billing_records").select("*").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(50),
  ]);
  const sub = ((subs ?? []) as AnyRow[]).find((s) => ["trialing", "active", "past_due"].includes(s.status)) ?? ((subs ?? []) as AnyRow[])[0];
  const published = (plans ?? []) as AnyRow[];
  const payEnabled = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY && published.some((p) => p.monthly_price_kobo !== null);
  return (
    <>
      <PageHeader title="Subscription" description="Your plan and billing history." />
      <Card className="mb-6">
        {sub ? (
          <dl className="grid gap-4 sm:grid-cols-4 text-sm">
            <div><dt className="text-xs font-semibold uppercase text-slate2">Plan</dt><dd className="mt-1 font-bold capitalize">{String(sub.plan_key).replace("_", " ")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate2">Status</dt><dd className="mt-1"><StatusBadge status={sub.status} /></dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate2">{sub.status === "trialing" ? "Trial ends" : "Renews"}</dt><dd className="mt-1 font-bold">{formatDate(sub.status === "trialing" ? sub.trial_ends_at : sub.current_period_end)}</dd></div>
          </dl>
        ) : <p className="text-sm text-slate2">No subscription on record.</p>}
      </Card>
      {!payEnabled && <Alert tone="info" title="Online payment is not enabled yet">To activate or renew your plan, contact ASOTECH at {CONTACT.email} or {CONTACT.phone}. When your plan expires you can still view and export your data; posting new transactions is paused.</Alert>}
      <h2 className="mb-3 text-lg font-bold text-navy">Plans</h2>
      {published.length === 0 ? <p className="mb-6 text-sm text-slate2">Plan pricing has not been published yet. Contact ASOTECH for a quote.</p> : (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {published.map((p) => (
            <Card key={p.key}><h3 className="font-bold text-navy">{p.name}</h3><p className="mt-1 text-sm text-slate2">{p.description}</p>
              <p className="mt-3 text-xl font-extrabold">{p.monthly_price_kobo === null ? "Contact us for pricing" : `${formatMoney(koboToNaira(Number(p.monthly_price_kobo)))} / month`}</p></Card>
          ))}
        </div>
      )}
      <h2 className="mb-3 text-lg font-bold text-navy">Billing history</h2>
      <DataTable empty="No payments yet." columns={[{ key: "d", header: "Date" }, { key: "r", header: "Reference" }, { key: "a", header: "Amount", align: "right" }, { key: "s", header: "Status" }]}
        rows={((bills ?? []) as AnyRow[]).map((b) => ({ d: formatDate(b.paid_at ?? b.created_at), r: b.paystack_reference ?? "–", a: formatMoney(koboToNaira(Number(b.amount_kobo)), b.currency), s: <StatusBadge status={b.status} /> }))} />
    </>
  );
}
