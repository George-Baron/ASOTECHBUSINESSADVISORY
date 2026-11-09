import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell, PageHeader, StatTile, DataTable, StatusBadge, Card, Button, LinkButton, Field, Input, Select, Alert, AuthCard, Badge, EmptyState } from "@asotech/ui";
import { writeFileSync } from "node:fs";

const nav = ["Dashboard","Requests inbox","Clients","Consulting projects","Software projects","Quotations","Tasks","Client approvals"].map((l,i)=>({href:"/"+i,label:l}));
const dash = (
  <AppShell appName="Project management" nav={nav} user="staff@asotech.example" signOutAction={async()=>{}}>
    <PageHeader title="Dashboard" description="Incoming enquiries and delivery work at a glance." actions={<LinkButton href="#" size="sm" variant="secondary">New client</LinkButton>} />
    <Alert tone="ok">Status updated.</Alert>
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatTile label="New requests" value={3} tone="warn" /><StatTile label="Active software" value={2} /><StatTile label="Active consulting" value={4} />
      <StatTile label="Overdue tasks" value={1} tone="bad" /><StatTile label="In review" value={2} /><StatTile label="Quotes awaiting" value={1} />
    </div>
    <h2 className="mb-3 text-lg font-bold text-navy">Latest requests (demo data)</h2>
    <DataTable columns={[{key:"d",header:"Received"},{key:"k",header:"Type"},{key:"n",header:"From"},{key:"s",header:"Status"}]}
      rows={[{d:"09 Nov 2026",k:"consultation",n:"Demo Contact A",s:<StatusBadge status="new"/>},{d:"08 Nov 2026",k:"proposal",n:"Demo Contact B",s:<StatusBadge status="in_review"/>},{d:"07 Nov 2026",k:"contact",n:"Demo Contact C",s:<StatusBadge status="won"/>}]} />
    <Card className="mt-8 max-w-md"><form className="space-y-3"><Field label="Status" name="s"><Select id="s"><option>new</option></Select></Field><Field label="Name" name="n"><Input id="n"/></Field><div className="flex gap-2"><Button>Save</Button><Button variant="secondary">Cancel</Button><Badge tone="ok">Published</Badge></div></form></Card>
  </AppShell>
);
const login = <AuthCard title="Sign in" subtitle="Staff access only"><Field label="Email" name="e"><Input id="e" type="email"/></Field><Button>Sign in</Button></AuthCard>;
const wrap = (b: React.ReactNode) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="out.css"></head><body>${renderToStaticMarkup(<>{b}</>)}</body></html>`;
writeFileSync("dashboard.html", wrap(dash)); writeFileSync("login.html", wrap(login));
