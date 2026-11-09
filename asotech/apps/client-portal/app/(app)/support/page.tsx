import Link from "next/link";
import { PageHeader, Card, DataTable, StatusBadge, Field, Input, Select, Textarea, Button } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { createTicket, uploadDocument } from "./actions";

export const metadata = { title: "Support" };
type Ticket = { id: string; subject: string; priority: string; status: string; created_at: string };
type Doc = { id: string; name: string; size_bytes: number | null; created_at: string };

export default async function Support({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb, orgId } = await ctx();
  const [t, d] = await Promise.all([
    sb.from("support_tickets").select("id, subject, priority, status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
    sb.from("client_documents").select("id, name, size_bytes, created_at").eq("organization_id", orgId).eq("visibility", "client").order("created_at", { ascending: false }),
  ]);
  const tickets = (t.data ?? []) as Ticket[];
  const docs = (d.data ?? []) as Doc[];
  return (
    <>
      <PageHeader title="Support" description="Ask ASOTECH a question, report an issue, or share documents with us." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">New support request</h2>
          <form action={createTicket} className="space-y-4">
            <Field label="Subject" name="subject"><Input id="subject" name="subject" required minLength={3} maxLength={200} /></Field>
            <Field label="Priority" name="priority"><Select id="priority" name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></Select></Field>
            <Field label="Details" name="body"><Textarea id="body" name="body" required minLength={3} maxLength={8000} /></Field>
            <Button>Send request</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold text-navy">Upload a document</h2>
          <form action={uploadDocument} className="space-y-4">
            <Field label="File" name="file" hint="PDF, Word, Excel, CSV, PNG, JPG or text. Up to 20 MB."><Input id="file" name="file" type="file" required accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.xlsx,.docx" /></Field>
            <Button>Upload</Button>
          </form>
        </Card>
      </div>
      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Your requests</h2>
      <DataTable empty="You have not sent any requests yet."
        columns={[{ key: "s", header: "Subject" }, { key: "p", header: "Priority" }, { key: "st", header: "Status" }, { key: "d", header: "Sent" }]}
        rows={tickets.map((x) => ({ s: <span className="font-semibold">{x.subject}</span>, p: x.priority, st: <StatusBadge status={x.status} />, d: formatDate(x.created_at, true) }))} />
      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Shared documents</h2>
      <DataTable empty="No documents have been shared yet."
        columns={[{ key: "n", header: "Name" }, { key: "z", header: "Size", align: "right" }, { key: "d", header: "Added" }, { key: "a", header: "" }]}
        rows={docs.map((x) => ({ n: x.name, z: x.size_bytes ? `${Math.max(1, Math.round(x.size_bytes / 1024))} KB` : "–", d: formatDate(x.created_at), a: <Link className="font-semibold underline" href={`/support/documents/${x.id}/download`}>Download</Link> }))} />
    </>
  );
}
