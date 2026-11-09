# Implementation status report

Date: 2026-11-09. Written to separate what was **tested**, what is **written but unbuilt**, and what is **pending** external input.

## 1. Tested (evidence exists)
- **Database** (PostgreSQL 16, Supabase stub): 72 assertions pass: immutable ledger, balance trigger, idempotency, tenant isolation, count workflow, reconciliation and approvals with segregation of duties, reversals, subscription gate, PO approval guard, count cancel.
- **Shared logic:** 18 unit tests pass (validation, CSV, FEFO, variance, permissions, API key hashing, Paystack signature).
- **Types:** stub typecheck is clean across all four apps and all packages.
- **Rendering:** the shared UI was server-rendered with real React 19, styled with the brand palette and screenshotted at 1366px and 390px with no horizontal overflow (`documentation/screenshots/`, `tests/render-smoke/`). Individual app pages and their data loading were not rendered.

## 2. Written, not built or run
All four apps (website 29 routes; client portal; inventory app with products, import, warehouses, movements, stocktaking, cycle counting, reconciliation, approvals, procurement, expiry, reports, integrations, subscription, settings, audit log, organisations; project management with requests, clients, consulting and software projects, quotations, tasks, approvals).
Why unbuilt: the npm registry was blocked in the build sandbox, so `npm install`, `next build`, browser rendering and a real Supabase run were impossible. First deployment step: `npm install && npm run build`, fix any build-time errors, run migrations on Supabase.

## 3. Integrations
AppSheet and Paystack paths implemented, not verified live. ERP systems: vendor-neutral contract only, **no ERP integration is claimed**. ASO Tech Services, POS, accounting, HR: placeholders.

## 4. Pending (needs you or third parties)
- Confirm domain, phone, email and address (banner values are placeholders flagged "confirm before launch").
- Set prices and subscription plan prices; they are intentionally blank.
- Paystack business approval and keys; SMTP sender; Supabase production project; Vercel projects.
- Lawyer review of privacy policy and terms (NDPA 2023).
- Real case studies and testimonials, only with client permission (none are invented).
- ASO Tech Services integration details.
- Accessibility and browser testing, security review, load test, UAT (see `testing-plan.md`).

## 5. Known limitations
- Quotation form takes 8 line items; no tax calculation or PDF export.
- Staff picker needs the service-role key; without it only the signed-in user is offered.
- Member invite requires the person to have registered first.
- Project-management status changes on milestones/deliverables stop once a client has approved.
