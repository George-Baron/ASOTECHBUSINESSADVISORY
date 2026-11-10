# Deployment guide

Recommended: Vercel for the four Next apps, Supabase for database/auth/storage. Nothing has been deployed from this build.

1. **Supabase:** create a production project (choose a region near users; confirm plan includes backups). Apply migrations 0001-0004, then `seed.sql` (no demo seed). Create the staff user. Set Auth URL configuration and email templates; configure SMTP with an ASOTECH sending domain.
2. **Vercel:** four projects from the same repo, each with root directory `apps/<name>` and "include files outside root". Build `npm run build`, install `npm install` at the repo root. Domains: `www.asotech.com.ng` (website), `app.` (inventory), `portal.` (client portal), `pm.` (staff). Confirm the domain is owned and DNS is controlled before announcing.
3. **Environment variables:** per `.env.example`. Service-role key only on inventory-app and project-management. Mark as sensitive.
4. **Webhooks:** register the Paystack URL only after approval and test mode passes.
5. **Smoke test:** register, sign in, submit each website form, create a client, upload and download a file, post a stock movement, run a count.
6. **Operate:** enable Supabase backups, uptime monitor, error tracking, and a rollback plan (Vercel instant rollback; database changes ship as new forward migrations).
7. **Content:** replace placeholder contact details (`+234 801 234 5678` is from the banner and is flagged "confirm before launch"), review legal pages with a lawyer, add real case studies only with client permission.

## One address, one service (recommended)
Everything is served from one address:

| Address | App |
|---|---|
| `www.asotech.com.ng` | public website |
| `www.asotech.com.ng/portal` | client portal |
| `www.asotech.com.ng/inventory` | inventory app |
| `www.asotech.com.ng/staff` | staff project-management app |

How it works: the three app builds use base paths (`/portal`, `/inventory`, `/staff`, set in each `next.config.mjs`; override with `APP_BASE_PATH`, where `/` means "serve from the root"). `scripts/start-all.mjs` starts the four apps on internal ports 3000-3003 and `scripts/gateway.mjs` on `$PORT` sends each request to the right app by path prefix. Build command: `npm install && npm run build`. Start command: `npm run start:all`. Environment: the two Supabase variables, `SUPABASE_SERVICE_ROLE_KEY` (only handed to the inventory and staff apps), `NODE_VERSION=22`, and the public addresses from `.env.example` (`NEXT_PUBLIC_*_URL`, set before building). Allow roughly 2 GB of memory (not measured).

Notes
- Sign-in is shared: all apps are on one address, so one Supabase session cookie covers them. Access is still enforced per app (`requireStaff`, organisation membership, RLS), so a client who opens `/staff` is refused.
- Supabase Authentication > URL Configuration: Site URL `https://www.asotech.com.ng/portal`; redirect URLs `https://www.asotech.com.ng/**`.
- AppSheet endpoint: `https://www.asotech.com.ng/inventory/api/integrations/appsheet/count`. Paystack webhook: `https://www.asotech.com.ng/inventory/api/webhooks/paystack`.
- Locally the apps are at `localhost:3000`, `localhost:3002/portal`, `localhost:3001/inventory`, `localhost:3003/staff`. To run one app from the root locally, start it with `APP_BASE_PATH=/`.
- If you deploy the apps as separate services instead, set `APP_BASE_PATH=/` on each so they are served from their own root.
- Trade-off: one process group, so a crash restarts all four apps. Tested here: the gateway routing only. The base-path behaviour (sign-in redirects, emailed links, downloads) is not yet tested in a browser.
