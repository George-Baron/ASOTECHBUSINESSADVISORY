import { Alert, Button, Card, Field, Input, PageHeader, Select, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { URLS } from "@asotech/configuration";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import type { AnyRow } from "../../../components/core-util";
import { disableConnection, markVerified, saveConnection } from "./actions";
import { KeyForm } from "./KeyForm";

export const metadata = { title: "Integrations" };

const PROVIDERS: Record<string, { label: string; blurb: string }> = {
  erp_system: { label: "ERP systems", blurb: "Products, balances, movements and approved adjustments exchanged with your ERP system. Needs an ERP adapter built and verified against your ERP's API access and subscription." },
  appsheet: { label: "AppSheet", blurb: "Barcode stocktaking and cycle counts captured on phones, sent to the count endpoint below." },
  aso_tech_services: { label: "ASO Tech Services", blurb: "Joint delivery partner. Technical access, data ownership and service levels are documented in the integration guide." },
  paystack: { label: "Paystack", blurb: "Subscription payments. Configured through server environment variables and the webhook URL below." },
  pos: { label: "POS", blurb: "Sales transactions from your point-of-sale system. Needs an adapter for the specific POS." },
  accounting: { label: "Accounting", blurb: "Posting valuation and purchase data to your accounting software." },
  hr: { label: "HR", blurb: "Staff records for count assignment and approvals." },
};

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("integrations.manage")) return <NoAccess what="integrations" />;
  const [{ data }, { data: evs }] = await Promise.all([
    c.sb.from("integration_connections").select("id, provider, name, status, config, last_verified_at, created_at").eq("organization_id", c.orgId).order("created_at"),
    c.sb.from("integration_events").select("connection_id, event_type, status, received_at").eq("organization_id", c.orgId).order("received_at", { ascending: false }).limit(200),
  ]);
  const conns = (data ?? []) as AnyRow[];
  const events = (evs ?? []) as AnyRow[];
  const endpoint = `${URLS.inventory}/api/integrations/appsheet/count`;

  return (
    <>
      <PageHeader title="Integrations" description="A connection is only shown as active after it has been verified with real traffic. Nothing here is assumed to work until proven." />
      <Flash sp={sp} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {Object.entries(PROVIDERS).map(([k, v]) => {
          const mine = conns.filter((x) => x.provider === k);
          const verified = mine.some((x) => x.status === "verified");
          return (
            <Card key={k}>
              <div className="flex items-start justify-between gap-2"><h2 className="font-bold text-navy">{v.label}</h2><StatusBadge status={verified ? "verified" : mine.length ? "configured" : "draft"} /></div>
              <p className="mt-1 text-sm text-slate2">{v.blurb}</p>
              <p className="mt-2 text-xs font-semibold text-slate2">{verified ? "Verified" : mine.length ? "Prepared, not verified" : "Not set up"}</p>
            </Card>
          );
        })}
      </div>

      <Card className="mb-8">
        <h2 className="mb-3 font-bold text-navy">Add a connection</h2>
        <form action={saveConnection} className="grid gap-3 md:grid-cols-2">
          <Field label="Provider" name="provider"><Select id="provider" name="provider">{Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label="Name" name="name"><Input id="name" name="name" required maxLength={120} placeholder="e.g. Warehouse phones" /></Field>
          <Field label="Base URL (optional)" name="base_url" hint="https only. Never enter passwords or API secrets here."><Input id="base_url" name="base_url" /></Field>
          <Field label="Notes (optional)" name="notes"><Input id="notes" name="notes" maxLength={500} /></Field>
          <div><Button>Save connection</Button></div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-bold text-navy">Your connections</h2>
      {conns.length === 0 ? <p className="text-sm text-slate2">No connections yet.</p> : (
        <div className="space-y-4">
          {conns.map((x) => {
            const tested = events.some((e) => e.connection_id === x.id && e.event_type === "test.ping" && e.status === "processed");
            return (
              <Card key={x.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold text-navy">{x.name} <span className="font-normal text-slate2">· {PROVIDERS[x.provider]?.label}</span></p>
                    <p className="text-xs text-slate2">Connection ID <code>{x.id}</code>{x.last_verified_at ? ` · verified ${formatDate(x.last_verified_at, true)}` : ""}</p></div>
                  <StatusBadge status={x.status} />
                </div>
                {x.provider === "appsheet" && x.status !== "disabled" && (
                  <div className="mt-3 text-sm">
                    <p className="text-slate2">1. Generate a key. 2. From AppSheet, POST a test request to the endpoint. 3. Mark verified.</p>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-navy p-3 text-xs text-white">{`POST ${endpoint}\nx-connection-id: ${x.id}\nx-api-key: <your key>\n\n{ "test": true, "event_key": "first-test-0001" }`}</pre>
                    <KeyForm id={x.id} hasKey={!!x.config?.api_key_hash} />
                    <p className="mt-2 text-xs text-slate2">Test event received: <strong>{tested ? "yes" : "not yet"}</strong></p>
                    {x.status !== "verified" && <form action={markVerified} className="mt-2"><input type="hidden" name="id" value={x.id} /><Button size="sm" disabled={!tested}>Mark verified</Button></form>}
                  </div>
                )}
                {x.provider !== "appsheet" && x.status !== "verified" && <Alert tone="info">This provider needs an adapter built and tested against your live system before it can be marked verified. See the integration guide.</Alert>}
                {x.status !== "disabled" && <form action={disableConnection} className="mt-3"><input type="hidden" name="id" value={x.id} /><Button size="sm" variant="ghost">Disable</Button></form>}
              </Card>
            );
          })}
        </div>
      )}
      <Card className="mt-8">
        <h2 className="mb-1 font-bold text-navy">Paystack webhook</h2>
        <p className="text-sm text-slate2">Set this URL in your Paystack dashboard once your business account is approved: <code>{URLS.inventory}/api/webhooks/paystack</code>. Add <code>PAYSTACK_SECRET_KEY</code> to the server environment.</p>
      </Card>
    </>
  );
}
