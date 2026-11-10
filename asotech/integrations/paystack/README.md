# Paystack subscriptions

Webhook: `POST https://www.asotech.com.ng/inventory/api/webhooks/paystack` (the inventory app is served under `/inventory`). The `x-paystack-signature` header is checked with HMAC-SHA512 over the raw body using `PAYSTACK_SECRET_KEY`; invalid signatures get 401 and nothing is written.

Activation steps (only after Paystack approves the business account):
1. Start each checkout with metadata `{ organization_id, plan_key }` (`plan_key` must match a `subscription_plans` key). Only `charge.success` events carrying both values are applied; anything else is ignored.
2. Set `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in the hosting environment.
3. Add the webhook URL in the Paystack dashboard and send a test charge.
4. Confirm a row appears in `billing_records` and the subscription becomes `active`.

Prices are blank in the database on purpose: ASOTECH sets them. Nothing here has been run against a live Paystack account.
