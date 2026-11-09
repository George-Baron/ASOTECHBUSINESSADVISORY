# Security guide

- **Secrets:** only in hosting environment variables. `.env.example` has no real values. The service-role key is server-only and used in: the AppSheet intake route, the Paystack webhook, member invites and key generation in inventory settings/integrations, marking a connection verified (after an owner/admin check), and the staff picker in project management (after `requireStaff()`).
- **Authentication:** Supabase Auth with cookie sessions refreshed in middleware. Staff-only app calls `requireStaff()` on every request; portal and inventory call `requireOrg()` / `requireSession()`.
- **Authorisation:** enforced in the database by RLS and RPC role checks, not only in the UI.
- **API keys (AppSheet):** 32 random bytes, shown once, only the SHA-256 hash stored, constant-time comparison, tenant taken from the stored connection.
- **Webhooks:** Paystack HMAC-SHA512 over the raw body; duplicates ignored by unique reference.
- **Uploads:** type and size allow-list (`validateUpload`), random object names, private bucket, 5-minute signed links.
- **Forms:** server-side validation, honeypot (`looksLikeBot`), optional Turnstile keys.
- **Redirects:** post-action targets limited to same-site relative paths.
- **Error messages:** database errors are translated (`friendly`); internals are not shown.

## Before launch
Independent security review; dependency audit (`npm audit`) after install; set Supabase Auth password policy and email confirmation; rate limiting at the host/CDN; backups and point-in-time recovery on the Supabase plan; legal review of privacy and terms pages (Nigeria Data Protection Act 2023 obligations such as lawful basis and DPO appointment where applicable). These have not been done.
