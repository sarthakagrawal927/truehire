# TrueHire — Agent Context

Read this first before touching code. It exists so subagents (and future-you) don't have to re-explore.

## What this is

TrueHire = **the verified-candidate layer of the internet.** AI-tailored resumes have collapsed the signal value of resumes. TrueHire replaces the resume with *costly, verifiable signals* — the first of which is public GitHub work.

See `PRD.md` for full product scope.

## Stack

- **Monorepo**: pnpm workspaces, Turborepo (optional — not required for MVP)
- **App**: Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript
- **DB**: Drizzle ORM + Turso (libsql). Local dev = `file:./local.db`. Prod = Turso `libsql://…`
- **Auth**: NextAuth v4 + GitHub OAuth only. DrizzleAdapter wraps our `users/accounts/sessions/verificationTokens` tables.
- **Ingest**: GraphQL + REST via `@octokit/*`. Runs on sign-in and on manual refresh. Fire-and-forget — never blocks the auth redirect.
- **Scoring**: Pure function in `packages/core/src/scoring`. 100% unit-tested, no IO.
- **Tests**: Vitest for unit, Playwright for e2e.
- **Package manager**: `pnpm`. Don't use `npm` or `yarn`.

## Structure

```
truehire/
├── apps/web/                  # Next.js app (pages, API, UI)
│   ├── src/app/               # App-router routes
│   │   ├── page.tsx           # landing
│   │   ├── login/             # signin (GitHub OAuth)
│   │   ├── dashboard/         # signed-in home, refresh UI
│   │   ├── [handle]/          # /@username profile
│   │   └── api/
│   │       ├── auth/          # NextAuth
│   │       ├── refresh/       # manual re-ingest (rate-limited)
│   │       └── og/[handle]/   # OG share image
│   ├── src/components/        # atomic design: atoms/molecules/organisms
│   └── src/lib/
│       ├── auth.ts            # NextAuth config
│       └── score-service.ts   # DB + ingest + score orchestration
├── packages/db/               # Drizzle schema + migrations + client
├── packages/core/             # pure scoring + GitHub ingest
├── PRD.md                     # product requirements
└── plans/                     # archived implementation plans
```

## Invariants (do not violate)

1. **Profile is derived, never declared.** Nothing on a user's profile is self-authored. If it's displayed, it came from a verifiable source (currently only GitHub).
2. **Scoring is transparent.** The algorithm lives in one file (`packages/core/src/scoring/score.ts`) with weights as named constants. No ML, no black boxes.
3. **Ingest never blocks auth.** The NextAuth `signIn` event dispatches ingest as fire-and-forget; the `/dashboard` route polls via its own render.
4. **No user-owned edit surface for the profile.** Bio, summary, skills, title — all computed.
5. **Public by default.** No privacy toggle until we have proof of value. Profiles are indexable.
6. **Don't commit .env / .env.local.** `.gitignore` already covers it. `.env.example` must stay populated with every variable the app needs.

## Scoring algorithm (v0)

Weighted composite, 0–100:

- **Depth 30%** — log-scaled count of months active, *recency-weighted* with a 24-month half-life. Cap at 60 months (5 years).
- **Breadth 20%** — log-scaled distinct repos with `commits ≥ 3 OR mergedPrs ≥ 1`. Cap at 50.
- **Recognition 35%** — log10 of (stars on authored repos + merged-PR credit to ≥100★ repos, PR count log-weighted). Cap at 10^6.
- **Specialization 15%** — piecewise on dominant-language share. 0 below 20%, scaled linearly to 100 at 100%.

All weights + caps are named constants in `score.ts`. Any change must ship with a corresponding test update.

## Common commands

```bash
# Dev
pnpm dev                       # boots apps/web on :3000
pnpm --filter @truehire/core test

# DB
pnpm db:generate               # regen migrations from schema
DATABASE_URL="file:$PWD/local.db" pnpm db:migrate

# Checks
pnpm --filter web typecheck
pnpm --filter web build
```

## Conventions

- **Atomic design** in `apps/web/src/components/{atoms,molecules,organisms}`. Pages compose organisms.
- **Server Components by default.** Only drop `"use client"` for genuine interactivity (buttons, forms, polling).
- **CSS vars over Tailwind color classes** (see `globals.css`) so theming stays single-source. Light/dark already wired.
- **Tabular numerics everywhere** that shows a score or count — use the `.num` utility.
- **No unused error branches / fallbacks**. Validate at boundaries (API routes) only.

## Risks flagged

- `ingestGitHubUser` runs synchronously inside `signIn` event. Good enough for MVP (<100 users). Move to a queue (Upstash Redis / Vercel Cron) once ingest p95 exceeds 10s.
- `/@handle` route will shadow any top-level static route. We guard with `startsWith("@")`. Don't add dynamic single-segment routes without an explicit check.
- GitHub rate limits (5k/hr per OAuth token) are plenty for 100 users but not for a batch recomputation. Weekly cron must use a GitHub App token, not OAuth.

## What NOT to add

- Prisma, Supabase, CockroachDB (user pref: never)
- CRA / Webpack custom builds
- A "write your bio" editor on the profile (breaks invariant #1)
- Leaderboards (PR backlash risk — PRD 6.3)
- Pseudonymous profiles (kills recruiter trust — decided)
