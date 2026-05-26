# truehire

Verified candidate platform — GitHub signals generate a transparent 0-100 score replacing traditional resumes, with public profile pages at `/@handle`.

Scores are **derived, never declared**: every number on a profile traces back to verified GitHub data. There are no user-editable bios, skills, or titles.

## Deployment & External Services

| Concern | Service |
|---------|---------|
| Hosting | Cloudflare Workers (`truehire`) via `@opennextjs/cloudflare` — one Worker serves the Next.js frontend and API routes |
| Database | Turso (libSQL) |
| Auth | NextAuth v5 + GitHub OAuth |
| CI/CD | GitHub Actions — auto-deploy on push to `main` |

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

<!-- ACTIVE-AI-TASK-LOG:START -->
## Active AI Task Log

This section is maintained by the SaaS Maker Active-AI product/design loop so future agents do not reopen duplicate UI tasks.

- Business lane: P1 Explore; recommended P0 candidate
- Rule: do not create another broad "improve the UI" task unless the acceptance criteria differ materially from the tasks listed here.
- Source of truth for task status: SaaS Maker task board. README entries are durable context only.

| Task | Status | Priority | Last known note |
| --- | --- | --- | --- |
| `eba19665` truehire: make score proof concrete before claim-profile CTA | done | high | 2026-05-25 18:42:03 |
| `3fb43ca6` truehire: add recruiter-side score explanation proof | done | high | 2026-05-26 — recruiter takeaway card added to `[handle]/page.tsx` after evidence rail: track record / community signal / craft stats + "no ML" trust note + GitHub CTA |
| `531939c3` truehire: add evidence source labels to score demo | done | high | 2026-05-26 — each ScoreBreakdown row now shows evidence label inline with weight (consistency / public GitHub / portfolio / activity); applied to both demo page and real profile page |
| `162c790a` truehire: add sample candidate risk flags | done | medium | 2026-05-26 — `RiskFlags` molecule added to `[handle]/page.tsx` between evidence rail and recruiter takeaway; computes up to 5 non-judgmental signals (no recent activity, sparse craft, short window, no authored repos, single-language portfolio, low traction) from existing score data; each flag links to GitHub evidence; section hidden when no flags apply |
| `8b883594` truehire: add recruiter next-action comparison | done | medium | 2026-05-26 — recruiter takeaway card now ends with a "Next action" block offering two side-by-side CTAs: primary (filled) "Contact {handle} on GitHub" and secondary "Review evidence first" (anchors to `#top-evidence` on the evidence rail); replaces the prior single "View on GitHub" link |
| `e3311861` truehire: add job-description paste evaluation demo | done | medium | 2026-05-26 — `JdEvaluator` client component added to `/recruiter/shortlist` empty state; recruiter pastes a JD, sees which of the 5 evaluation dimensions (Depth/Breadth/Recognition/Craft/Specialization) are signaled by the JD text via keyword detection, then can expand a sample @sample-dev comparison with real score breakdown; no model/auth/data changes |
<!-- ACTIVE-AI-TASK-LOG:END -->
