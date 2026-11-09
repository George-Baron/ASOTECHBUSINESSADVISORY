# Render smoke test

Server-renders the shared UI (AppShell, tables, forms, badges, auth card) with real React 19, compiles the stylesheet with Tailwind's compiler, and screenshots the result at desktop and phone width, checking for horizontal overflow.

It was run once in the build sandbox (results: `documentation/screenshots/`). It is a stand-in for `next build` and does **not** cover routing, data loading or Supabase. Paths inside the scripts point at the sandbox's tool folder (`/opt/npm-tools`); adjust them on your machine, or just run the real apps with `npm run dev:pm`.
