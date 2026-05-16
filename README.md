# truehire

Verified candidate platform — GitHub signals generate a transparent 0-100 score replacing traditional resumes, with public profile pages at `/@handle`.

Scores are **derived, never declared**: every number on a profile traces back to verified GitHub data. There are no user-editable bios, skills, or titles.

## Stack

- Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4
- Drizzle ORM + Turso (libSQL) — `file:./local.db` locally, `libsql://…` in prod
- NextAuth v5 (GitHub OAuth only) + `@auth/drizzle-adapter`
- Vitest (unit, **100% coverage required on `packages/core`**), Playwright (e2e)
- Cloudflare Workers via `@opennextjs/cloudflare`
- pnpm workspaces

## Repo layout

```
apps/web/                 Next.js app — pages, API routes, auth
packages/core/            Pure scoring + GitHub ingest (no IO in scoring fns)
  src/scoring/score.ts    Weighted composite (depth/breadth/recognition/craft/specialization)
  src/ingest/             GitHub GraphQL + REST via @octokit
packages/db/              Drizzle schema, migrations, client
packages/ui/              Shared UI primitives (not yet published)
plans/                    Archived implementation plans
```

## Scoring algorithm

Pure functions in `packages/core/src/scoring/score.ts`. Any weight change requires a corresponding test update. The full prose explanation with live values lives at [`/methodology`](apps/web/src/app/methodology/page.tsx).

| Axis | Weight | Source |
|---|---|---|
| Recognition | 30% | `log10(stars on authored repos)` + log10 of merged-PR credit to repos ≥100★. Stars decay with a 48-month freshness half-life. |
| Depth | 20% | Log-scaled months with ≥ 1 accepted contribution, 30-month recency half-life, 48-month cap. |
| Craft | 20% | Aggregated from PR review velocity, merged-vs-opened ratio, and signal-to-noise across the contributor's repos. |
| Breadth | 15% | Log-scaled distinct repos with ≥ 3 commits or ≥ 1 merged PR, capped at 40. |
| Specialization | 15% | Piecewise on dominant-language share — 0 below 20%, linear to 100 at 100%. |

## Dev

```bash
pnpm install
pnpm dev                              # apps/web on :3000

pnpm --filter @truehire/core test     # scoring unit tests (must stay at 100%)
pnpm --filter web typecheck
pnpm --filter web build
pnpm test:e2e:local                   # disposable DB + local auth env + Playwright
```

## Database

```bash
pnpm db:generate                                            # regen migrations
DATABASE_URL="file:$PWD/local.db" pnpm db:migrate          # apply locally
pnpm db:studio                                              # Drizzle Studio
```

## Local E2E

The default web Playwright command expects a migrated database and auth env.
Use the wrapper when you just need a reliable local smoke pass:

```bash
pnpm test:e2e:local
```

It creates a temporary SQLite/libSQL database, runs migrations, supplies local
dummy GitHub OAuth values plus `AUTH_SECRET`, starts the Next.js web app through
Playwright, and deletes the temp DB afterward. It does not use production
secrets.

## Deploy

```bash
pnpm --filter web cf:build       # next build → opennext transform
pnpm --filter web cf:preview     # local wrangler dev
pnpm --filter web cf:deploy      # wrangler deploy to prod
```

Pushes to `main` deploy automatically.

Secrets via `wrangler secret put` only (never in `vars`):
`AUTH_SECRET`, `AUTH_GITHUB_SECRET`, `DATABASE_AUTH_TOKEN`, `GITHUB_API_TOKEN`.

## Key constraints

- **Ingest is fire-and-forget.** `signIn` dispatches a GitHub ingest async — auth redirect never blocks. The `/@handle` page polls during its own render.
- **`/@handle` route** uses a `startsWith("@")` guard so usernames don't collide with other dynamic routes.
- **GitHub rate limit**: 5,000 req/hr per OAuth token. Manual refresh is rate-limited at the route level.
- **Pre-commit**: husky runs `scripts/secret-scan.mjs` via lint-staged.
- **Do not add**: Prisma, Supabase, CockroachDB, leaderboards, pseudonymous profiles, or any user-editable profile fields.

For full agent guidance and architecture notes, see [`agents.md`](./agents.md).
