# Database guide

Source files: `database/schema.sql`, `triggers/triggers.sql`, `functions/rpc.sql`, `policies/row-level-security.sql`, seeds. `database/build.sh` assembles them into `migrations/0001..0004` and `seed.sql`.

## Design rules
- **Multi-tenancy:** every business row carries `organization_id`. Child tables use composite foreign keys `(organization_id, id)` so a row cannot reference another tenant's parent.
- **RLS deny by default.** Helpers: `is_staff()`, `is_org_member()`, `org_role_in()`. Clients see only published consulting/delivery data for their own organisation.
- **Ledger:** `stock_movements` and lines are immutable (triggers reject update/delete). Balances change only through an AFTER INSERT trigger. Corrections are reversing movements (`reverse_stock_movement`).
- **All writes with business rules go through SECURITY DEFINER RPCs** (post movement, count workflow, reconciliation, approvals, goods receipt, client decisions, onboarding).
- **Idempotency keys** on movements and integration events.
- **Blind counts:** counters read `v_count_sheet`, which hides system quantities.
- **Segregation of duties:** a creator cannot approve their own adjustment or purchase order.
- **Last-owner protection;** audit-log triggers on key tables (audit log itself is immutable).
- **Subscription gate:** `assert_subscription` raises `P0003` when an organisation's plan is not active or trialing.
- **Storage:** private bucket `client-documents`, first path segment is the organisation id.

## Tests
`PGHOST=... PGUSER=... bash tests/integration/run-db-tests.sh` runs 72 assertions against a throwaway PostgreSQL 16 database using a Supabase stub (`tests/integration/supabase-stub.sql`). It proves the logic, but it is not a substitute for testing on a real Supabase project (Auth, Storage and PostgREST are stubbed).
