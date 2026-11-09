# Deployment guide

Recommended: Vercel for the four Next apps, Supabase for database/auth/storage. Nothing has been deployed from this build.

1. **Supabase:** create a production project (choose a region near users; confirm plan includes backups). Apply migrations 0001-0004, then `seed.sql` (no demo seed). Create the staff user. Set Auth URL configuration and email templates; configure SMTP with an ASOTECH sending domain.
2. **Vercel:** four projects from the same repo, each with root directory `apps/<name>` and "include files outside root". Build `npm run build`, install `npm install` at the repo root. Domains: `www.asotech.com.ng` (website), `app.` (inventory), `portal.` (client portal), `pm.` (staff). Confirm the domain is owned and DNS is controlled before announcing.
3. **Environment variables:** per `.env.example`. Service-role key only on inventory-app and project-management. Mark as sensitive.
4. **Webhooks:** register the Paystack URL only after approval and test mode passes.
5. **Smoke test:** register, sign in, submit each website form, create a client, upload and download a file, post a stock movement, run a count.
6. **Operate:** enable Supabase backups, uptime monitor, error tracking, and a rollback plan (Vercel instant rollback; database changes ship as new forward migrations).
7. **Content:** replace placeholder contact details (`+234 801 234 5678` is from the banner and is flagged "confirm before launch"), review legal pages with a lawyer, add real case studies only with client permission.
