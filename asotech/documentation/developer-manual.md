# Developer manual

## Layout
`apps/*` Next 15 (app router) sites; `packages/*` shared code; `database/` SQL; `integrations/` provider notes and contracts; `tests/` unit, SQL integration and stub typecheck.

## Conventions
- `params` and `searchParams` are Promises (await them).
- Mutations are server actions (`"use server"`) that validate input, call an RLS-scoped client or RPC, then `back(path, "notice"|"error", message)`. Messages show through `<Flash />`.
- Never trust hidden form fields for tenancy; the database's composite foreign keys and RLS are the guard.
- Use `createAdmin()` only in the places listed in the security guide.
- Domain logic (permissions, FEFO, variance, CSV, validation) lives in `packages/*` and is unit tested.

## Checks
- `npm run typecheck:stub` (works offline against stubs), `npm run test` (unit), `npm run test:db` (SQL).
- After `npm install`: `npm run typecheck`, `npm run build`, `npm run lint`.
- `npm run db:types` regenerates typed database definitions from a local Supabase.
