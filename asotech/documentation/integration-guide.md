# Integration guide

See `integrations/README.md` and each provider folder. Summary of what is real today:

| Integration | State |
|---|---|
| AppSheet count capture | Implemented, partly tested, not verified against a live app |
| Paystack subscriptions | Implemented, unit tested, not verified live |
| ERP systems | Contract only. No adapter, nothing claimed |
| ASO Tech Services, POS, accounting, HR | Placeholders |

Connection lifecycle: draft -> configured -> verified (administrator, after a real test) -> disabled. The inventory app shows an event log per connection.
