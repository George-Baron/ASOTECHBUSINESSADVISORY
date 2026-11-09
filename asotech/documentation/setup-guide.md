# Setup guide (local development)

Requirements: Node 20.9+, npm 10+, a Supabase project (or the Supabase CLI with Docker for a local stack).

1. `npm install` at the repository root (npm workspaces).
2. Create a Supabase project. Copy `.env.example` to `.env.local` in each of `apps/website`, `apps/inventory-app`, `apps/client-portal`, `apps/project-management` and fill the Supabase URL and anon key. Add `SUPABASE_SERVICE_ROLE_KEY` only to `apps/inventory-app` (AppSheet intake, Paystack webhook, member invites) and `apps/project-management` (staff picker). Never prefix it with `NEXT_PUBLIC_`.
3. Apply the database: `npm run db:build`, then run `database/migrations/0001` to `0004` in order (Supabase CLI: copy them to `supabase/migrations` and `supabase db push`), then `database/seed.sql`.
4. Optional demo data: `database/seed-demo.sql`. Everything in it is labelled "Demo"; do not load it in production.
5. Make the first ASOTECH staff user: register in the portal, then in the SQL editor `insert into platform_staff (user_id, staff_role) values ('<auth user id>', 'admin');`.
6. Run: `npm run dev:website` (3000), `dev:inventory` (3001), `dev:portal` (3002), `dev:pm` (3003).
7. Supabase Auth: add each app URL to Site URL / redirect URLs, including `/auth/callback`.

Not yet performed in the build environment: `npm install` and `next build` (registry was blocked). Expect to fix small build-time issues on first run, and report them.
