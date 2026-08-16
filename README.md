Requires a Postgres database — see `.env.example` for the `DATABASE_URL` shape. For local dev,
the easiest option is a free project at https://neon.tech (see `DEPLOY.md` for the exact steps).

Run:

npm install
npx prisma migrate dev
npm run dev

Open:
http://localhost:3000

`npm install` triggers `prisma generate` automatically (postinstall). `npx prisma migrate dev`
applies migrations and seeds the database (`prisma/seed.ts`) with demo data. To reset the
database at any point: `npx tsx prisma/seed.ts` (wipes and reseeds) — **never run this against a
production `DATABASE_URL`**; it refuses to run when `NODE_ENV=production` unless explicitly
overridden. See `DEPLOY.md` for production deployment (Railway + Postgres + custom domain).

## Demo logins

Every seeded account uses the password `senha123`.

| Role | Email |
|---|---|
| Admin | admin@nutrimatch.com.br |
| Professional | carolina@nutrimatch.com.br (also: rafael@, mariafernanda@, juliana@, andre@, beatriz@, lucas@, amanda@ — all @nutrimatch.com.br) |
| Patient | ana@email.com (also: carlos@email.com, fernanda@email.com) |

New accounts can also be created via `/cadastro`. Self-registered professionals start with
`PENDING` status and stay out of search results until an admin approves them in
`/admin/profissionais`.

## Notes

- Database is Postgres (any provider — Neon for dev, Railway's managed Postgres for production;
  see `DEPLOY.md`).
- `JWT_SECRET`/`DATABASE_URL` live in `.env` (gitignored); see `.env.example` for the shape.
- `scripts/create-admin.ts` creates a single ADMIN user without touching existing data — use
  this for the first production admin account instead of `prisma/seed.ts`.
