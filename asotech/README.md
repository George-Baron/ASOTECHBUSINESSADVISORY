# ASOTECH Business Advisory

Corporate website, consulting service catalogue, inventory-management SaaS, client portal and staff project-management app. Next.js 15, TypeScript, Tailwind, Supabase/PostgreSQL. Tagline: *Control. Accuracy. Intelligence.*

| App | Folder | Live address | Local address | Audience |
|---|---|---|---|---|
| Website | `apps/website` | `/` | localhost:3000 | Public |
| Inventory SaaS | `apps/inventory-app` | `/inventory` | localhost:3001/inventory | Client organisations |
| Client portal | `apps/client-portal` | `/portal` | localhost:3002/portal | Consulting clients |
| Project management | `apps/project-management` | `/staff` | localhost:3003/staff | ASOTECH staff |

Start here: `documentation/setup-guide.md`. Honest status: `documentation/implementation-status.md`. Progress log: `PROGRESS.md`.

```
apps/       four Next.js apps
packages/   configuration, types, validation, utilities, business-logic, ui, supabase
database/   schema, triggers, RPC functions, RLS, seeds, migrations
integrations/  provider notes and the ERP connector contract
documentation/ guides, blueprint, status report
tests/      unit, SQL integration, stub typecheck
```

Demo data (`database/seed-demo.sql`) is labelled "Demo". No client names, prices or achievements are invented. Contact details come from the brand banner and must be confirmed before launch.
