# agents.md — truehire

## Purpose
Verified-candidate platform replacing resumes with costly, verifiable GitHub signals — computes a transparent 0-100 score from public GitHub work (depth, breadth, recognition, specialization) and generates a candidate profile page.

## Stack
- Framework: Next.js 16 (App Router), React 19, Tailwind CSS v4
- Language: TypeScript
- Styling: Tailwind CSS v4
- DB: Drizzle ORM + Turso (libSQL). Local dev = `file:./local.db`. Prod = Turso `libsql://...`.
- Auth: NextAuth v5 beta (GitHub OAuth only) + `@auth/drizzle-adapter`
- Testing: Vitest (unit — especially `packages/core`), Playwright (e2e in `apps/web/e2e/`)
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare` (`wrangler.jsonc` in `apps/web/`)
- Package manager: pnpm (pnpm workspaces)

## Repo structure
```
truehire/
├── apps/web/                  # Next.js application
│   ├── src/app/
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # GitHub OAuth sign-in
│   │   ├── dashboard/         # Signed-in home + manual refresh UI
│   │   ├── [handle]/          # /@username public profile
│   │   └── api/
│   │       ├── auth/          # NextAuth handlers
│   │       ├── refresh/       # Manual re-ingest (rate-limited)
│   │       └── og/[handle]/   # OG share image generation
│   ├── src/components/        # Atomic design: atoms/molecules/organisms
│   ├── src/lib/
│   │   ├── auth.ts            # NextAuth config + DrizzleAdapter
│   │   └── score-service.ts  # DB + ingest + score orchestration
│   ├── wrangler.jsonc         # Cloudflare Workers config
│   └── open-next.config.ts   # OpenNext Cloudflare adapter config
├── packages/
│   ├── core/                  # Pure scoring + GitHub ingest (no IO in scoring)
│   │   └── src/
│   │       ├── scoring/       # score.ts — weighted composite, all weights as named constants
│   │       └── ingest/        # GitHub GraphQL + REST data fetch via @octokit
│   ├── db/                    # Drizzle schema, migrations, client
│   │   ├── src/schema.ts
│   │   ├── src/migrate.ts
│   │   └── drizzle.config.ts
│   └── ui/                    # Shared UI components (not yet published)
├── plans/                     # Archived implementation plans
└── PRD.md                     # Full product requirements
```

## Key commands
```bash
pnpm dev                              # apps/web on localhost:3000
pnpm --filter @truehire/core test     # unit tests for scoring (must stay 100% tested)
pnpm --filter web typecheck           # TS check
pnpm --filter web build               # next build

# DB
pnpm db:generate                      # regen migrations from schema changes
DATABASE_URL="file:$PWD/local.db" pnpm db:migrate   # apply migrations locally
pnpm db:studio                        # Drizzle Studio GUI

# Cloudflare deploy
pnpm --filter web cf:build            # next build → opennext transform
pnpm --filter web cf:preview          # local wrangler dev
pnpm --filter web cf:deploy           # wrangler deploy to prod
```

## Architecture notes
- **Scores are derived, never declared**: everything on a profile comes from verified GitHub data. No user-editable bio, skills, or title.
- **Scoring algorithm** (4 components, all in `packages/core/src/scoring/score.ts`):
  - Depth 30%: log-scaled months active, recency-weighted (24-month half-life), cap 60 months
  - Breadth 20%: log-scaled distinct repos with commits ≥ 3 OR merged PRs ≥ 1, cap 50
  - Recognition 35%: log10(stars on authored repos + merged-PR credit to ≥100★ repos)
  - Specialization 15%: piecewise on dominant-language share (0 below 20%, linear to 100 at 100%)
  - Any change to weights must have a corresponding test update.
- **Ingest is fire-and-forget**: `signIn` event dispatches GitHub ingest async; never blocks auth redirect. `/@handle` page polls during its own render.
- **`@octokit/graphql` + `@octokit/rest`** for GitHub data. Rate limit: 5k/hr per OAuth token (fine for MVP <100 users).
- **`/@handle` route convention**: `startsWith("@")` guard prevents collision with other dynamic routes.
- **Cloudflare deployment**: `@opennextjs/cloudflare` adapts Next.js for Workers. Secrets provisioned via `wrangler secret put` (AUTH_SECRET, AUTH_GITHUB_SECRET, DATABASE_AUTH_TOKEN, GITHUB_API_TOKEN) — never in `vars`.
- **Do NOT add**: Prisma, Supabase, CockroachDB, leaderboards, pseudonymous profiles, user-editable profile fields.
- husky hooks: pre-commit runs `scripts/secret-scan.mjs` via lint-staged; pre-push runs further checks.

## Active context
