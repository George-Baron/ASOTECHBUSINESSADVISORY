# ASOTECH Business Advisory: build progress

Updated: 2026-11-09. Legend: DONE and checked, PARTIAL, TODO.

| # | Step | Status | How it was checked |
|---|---|---|---|
| 1 | Brand assets, master blueprint (StockPilot -> ASOTECH, Odoo -> ERP systems) | DONE | text sweep |
| 2 | Database: schema, triggers, RPC functions, RLS, seeds | DONE | 67 SQL assertions on PostgreSQL 16 |
| 3 | Shared packages (types, validation, utilities, business-logic, ui, supabase) | DONE | 18 unit tests, stub typecheck |
| 4 | Corporate website (29 routes, forms, blog, pricing, legal) | DONE (unbuilt) | stub typecheck |
| 5 | Client portal | DONE (unbuilt) | stub typecheck |
| A | Inventory: products, import, warehouses, movements | DONE (unbuilt) | stub typecheck |
| B | Inventory: onboarding, stocktaking, cycle count, reconciliation, approvals | DONE (unbuilt) | stub typecheck; DB workflow covered by 70 SQL assertions |
| C | Inventory: procurement, expiry, reports | DONE (unbuilt) | stub typecheck; PO approval guard covered by SQL tests (72 total) |
| D | Inventory: integrations, API routes, subscription, settings, audit, orgs | DONE (unbuilt) | stub typecheck; key hashing and webhook signature covered by unit tests |
| E | Project management app (staff): dashboard, requests inbox, clients, consulting and software projects, quotations, tasks, approvals | DONE (unbuilt) | stub typecheck |
| F | Integration folders, documentation, deployment config | DONE | text review against code |
| G | Final verification and packaging | DONE | 72 SQL assertions, 18 unit tests, stub typecheck clean, name sweep clean |

"Unbuilt" means: written and type-checked against stubs, but `next build` has not been run because the npm registry is blocked in the build sandbox. Run `npm install && npm run build` on a normal machine as the first deployment step.

## Update 2026-11-10: one-address layout
Apps now served under /portal, /inventory, /staff (website at /). Gateway routes by path (tested). Base-path handling of sign-in redirects, emailed links, downloads, icons and org cookies changed in code and type-checked, but NOT yet tested in a browser.
