# Testing plan

## Done in the build environment
| Layer | What | Result |
|---|---|---|
| Database | 72 SQL assertions: ledger immutability, balances, idempotency, tenant isolation, approvals and segregation of duties, reversal, subscription gate, PO guard, count cancel | pass |
| Unit | 18 tests: validation, CSV, FEFO, variance, permissions, key hashing, Paystack signature | pass |
| Types | Stub typecheck of all four apps and packages | clean |
| Render | Shared UI rendered with React 19 + Tailwind, desktop and phone screenshots | no overflow, palette correct |

## Not done (must be done before launch)
1. `npm install && npm run build` for each app.
2. Real Supabase: apply migrations, run auth flows (register, confirm, reset), storage upload/download, RLS with two real tenants and a staff user.
3. Browser testing: keyboard navigation, mobile widths, screen reader pass, Lighthouse on the website.
4. End-to-end scripts for the five core journeys: request -> client onboarding; product import -> opening balance; stocktake -> approval; purchase order -> receipt; deliverable -> client approval.
5. AppSheet and Paystack live tests (sandbox/test mode).
6. Load test of the movement RPC with concurrent postings on one product.
7. Security review and dependency audit.
8. User acceptance with real ASOTECH staff and one pilot client.
