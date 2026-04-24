# agents.md — truehire

## Purpose
Verified candidate platform — GitHub signals generate a transparent 0-100 score replacing traditional resumes, with public profile pages at `/@handle`.

## Stack
- Framework: Next.js 16 (App Router), React 19
- Language: TypeScript
- Styling: Tailwind CSS v4
- DB: Drizzle ORM + Turso (libSQL). Local: `file:./local.db`. Prod: Turso `libsql://...`
- Auth: NextAuth v5 beta (GitHub OAuth ONLY) + `@auth/drizzle-adapter`
- Testing: Vitest (unit — `packages/core` must have 100% test coverage), Playwright (e2e in `apps/web/e2e/`)
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare`
- Package manager: pnpm workspaces

## Repo structure
```
apps/web/                  # Next.js application
  src/app/
    page.tsx               # Landing page
    login/                 # GitHub OAuth sign-in
    dashboard/             # Signed-in home + manual refresh UI
    [handle]/              # /@username public profile (startsWith("@") guard)
    api/
      auth/                # NextAuth handlers
      refresh/             # Manual re-ingest (rate-limited)
      og/[handle]/         # OG share image generation
  src/components/          # Atomic design: atoms/molecules/organisms
  src/lib/
    auth.ts                # NextAuth config + DrizzleAdapter
    score-service.ts       # DB + ingest + score orchestration
  wrangler.jsonc           # CF Workers config
  open-next.config.ts      # OpenNext CF adapter config
packages/
  core/                    # Pure scoring + GitHub ingest (NO IO in scoring functions)
    src/scoring/
      score.ts             # Weighted composite — all weights as named constants
    src/ingest/            # GitHub GraphQL + REST via @octokit
  db/                      # Drizzle schema, migrations, client
    src/schema.ts
    src/migrate.ts
    drizzle.config.ts
  ui/                      # Shared UI components (not yet published)
plans/                     # Archived implementation plans
PRD.md                     # Full product requirements
```

## Key commands
```bash
pnpm dev                              # apps/web on localhost:3000
pnpm --filter @truehire/core test     # unit tests for scoring (100% coverage required)
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
- **Scoring algorithm** (`packages/core/src/scoring/score.ts` — pure functions, 100% test coverage required):
  - Depth 30%: log-scaled months active, recency-weighted (24-month half-life), cap 60 months
  - Breadth 20%: log-scaled distinct repos with commits ≥ 3 OR merged PRs ≥ 1, cap 50
  - Recognition 35%: log10(stars on authored repos + merged-PR credit to ≥100★ repos)
  - Specialization 15%: piecewise on dominant-language share (0 below 20%, linear to 100 at 100%)
  - Any weight change requires a corresponding test update.
- **Ingest is fire-and-forget**: `signIn` event dispatches GitHub ingest async — never blocks auth redirect. `/@handle` page polls during its own render.
- **`/@handle` route**: `startsWith("@")` guard prevents collision with other dynamic routes.
- **CF deployment**: secrets via `wrangler secret put` (`AUTH_SECRET`, `AUTH_GITHUB_SECRET`, `DATABASE_AUTH_TOKEN`, `GITHUB_API_TOKEN`) — never in `vars`.
- **GitHub data**: `@octokit/graphql` + `@octokit/rest`. Rate limit: 5k/hr per OAuth token.
- **DO NOT ADD**: Prisma, Supabase, CockroachDB, leaderboards, pseudonymous profiles, user-editable profile fields.
- Husky: pre-commit runs `scripts/secret-scan.mjs` via lint-staged; pre-push runs further checks.

## Active context
