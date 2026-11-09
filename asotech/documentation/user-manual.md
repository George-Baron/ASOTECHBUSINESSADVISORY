# User manual (summary)

## Visitors (website)
Browse services, read articles, and send a consultation, proposal, contact or service request. Staff reply by email.

## Clients (portal)
Sign in, then use: Dashboard; Projects; Reports and downloads; Audit findings; Reconciliation; Deliverables (approve or request changes); Corrective actions; Support tickets. Only items ASOTECH has published to you are shown.

## Inventory users
1. **Onboarding:** create organisation, warehouses and locations, import products (CSV/XLSX; download the template; preview shows errors per row).
2. **Movements:** opening balance, receipts, issues, transfers, adjustments, returns. Posted entries cannot be edited; reverse them.
3. **Stocktaking:** create a session, assign lines, count blind, request recounts, close counting, reconcile, submit for approval. Approval cannot be given by the person who submitted.
4. **Procurement:** suppliers, purchase orders (approval by owner/admin who did not create it), goods receipts.
5. **Expiry:** FEFO suggestions and near-expiry list. **Reports:** hub with CSV export. **Integrations, Subscription, Settings, Audit log, Organisations.**
Roles: owner, admin, manager, stock counter, auditor, viewer (and client in the portal); see `packages/business-logic/src/permissions.ts` for exact rights.

## ASOTECH staff (project management)
Requests inbox -> convert to client -> add client users -> create consulting or software project -> record requirements, milestones, deliverables (attach file, send for review), tasks; prepare quotations (draft, then send). Client decisions appear under Client approvals.
