# Integrations

Status vocabulary used everywhere in ASOTECH: **draft** (saved, nothing tested), **configured** (credentials/settings entered), **verified** (a real test against the live system succeeded and an administrator confirmed it), **disabled**.

| Folder | Direction | State in this repository |
|---|---|---|
| `appsheet/` | AppSheet field apps -> ASOTECH (count capture) | Endpoint implemented. Key hashing, payload validation and the database path are covered by tests. Not exercised against a real AppSheet app. |
| `paystack/` | Paystack -> ASOTECH (subscription webhook) | Signature check and plan mapping implemented and unit tested. Not exercised against a live Paystack account. |
| `erp-systems/` | ASOTECH <-> client ERP systems | Vendor-neutral contract only (`ErpConnector`). No ERP adapter exists, so no ERP integration is claimed. |
| `aso-tech-services/` | ASOTECH <-> ASO Tech Services | Placeholder. The interface is not defined until the partner confirms what they expose. |
| `pos/`, `accounting/`, `hr/` | various | Placeholders with a data-mapping checklist. Nothing implemented. |

Rules for every integration:
1. Secrets are never stored in `integration_connections.config` (it is readable by organisation members). They go in `integration_secrets` (service role only) or environment variables.
2. The tenant is always derived from the stored connection, never from the request body.
3. Every inbound event carries an idempotency key; duplicates are ignored by a unique constraint.
4. A connection is not shown as active until it is `verified`.
