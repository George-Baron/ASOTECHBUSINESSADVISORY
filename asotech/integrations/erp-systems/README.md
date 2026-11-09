# ERP systems

ASOTECH implements and supports ERP systems for clients. The inventory app talks to any of them through one vendor-neutral contract, `ErpConnector` (`packages/business-logic/src/integrations.ts`):
`verify`, `pullProducts`, `pullWarehouses`, `pullStockBalances`, `pushStockMovement`, `pushApprovedAdjustment`.

The default adapter is `NotConfiguredErpConnector`, which fails loudly. **No ERP integration is claimed or active.**

## To add a real adapter
1. Confirm with the client: which ERP, version, hosting, API access, permissions, and any licence entitlement for API use.
2. Implement `ErpConnector` in `integrations/erp-systems/adapters/<name>.ts`. Map `external_ref` values to ASOTECH products and locations. Use `idempotency_key` on every push.
3. Store credentials in `integration_secrets` (service role) and register the adapter in a server-only factory.
4. Verify against the client's sandbox first: pull products, pull balances, push one movement, push one approved adjustment. Only then mark the connection `verified`.
5. Only approved adjustments are pushed; ASOTECH never writes unapproved variances to the ERP.
