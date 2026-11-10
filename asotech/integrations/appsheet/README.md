# AppSheet count capture

Lets warehouse staff scan or key counts in an AppSheet app while the count is recorded in ASOTECH as a normal blind count entry (the counter never sees the system quantity).

## Set up (administrator)
1. In the inventory app open **Integrations**, create an **AppSheet** connection and generate a key. The key is shown once; only its SHA-256 hash is stored.
2. In AppSheet add a webhook / automation action that sends the request below.
3. Send a **test** event, confirm it appears in the event log, then mark the connection **verified**. Until then only test events are accepted.

## Request
```
POST https://www.asotech.com.ng/inventory/api/integrations/appsheet/count
x-connection-id: <connection uuid>
x-api-key: <key>
Content-Type: application/json

{ "event_key": "unique-per-scan", "line_id": "<count line uuid>", "quantity": 12, "note": "optional" }
```
Test: `{ "test": true, "event_key": "any-unique-string" }`.

## Responses
200 recorded / `test_ok`; 401 bad credentials (same answer for unknown connection and wrong key); 403 connection disabled or not yet verified; 409 business rule (line not found, session not open); 413 payload over 10 KB; 422 invalid payload.

## Verified so far
Payload parsing, key hashing and constant-time comparison (unit tests); `integration_record_count` idempotency and tenant isolation (SQL tests). **Not verified:** a live AppSheet app. Do that during UAT.
