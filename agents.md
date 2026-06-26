# agents.md — truehire

## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

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
      ai-build/            # token (issue) + publish (redeem) — self-attested AI build profile
  src/components/          # Atomic design: atoms/molecules/organisms
  src/lib/
    auth.ts                # NextAuth config + DrizzleAdapter
    score-service.ts       # DB + ingest + score orchestration
    ai-build-service.ts    # AI build profile persistence + publish-token handshake
    ai-build-artifact.ts   # hand-rolled validator for the uploaded CLI artifact
  wrangler.jsonc           # CF Workers config
  open-next.config.ts      # OpenNext CF adapter config
packages/
  core/                    # Pure scoring + GitHub ingest (NO IO in scoring functions)
    src/scoring/
      score.ts             # Weighted composite — all weights as named constants
    src/ai-build/          # Pure 6-dimension AI-build scorer (100% coverage)
    src/ingest/            # GitHub GraphQL + REST via @octokit
  db/                      # Drizzle schema, migrations, client
    src/schema.ts
    src/migrate.ts
    drizzle.config.ts
  cli/                     # `truehire` npm CLI — local AI-build scanner (Claude Code/Cursor/Codex)
    src/adapters/          # one per tool; each optional, declares fidelity
  ui/                      # Shared UI components (not yet published)
plans/                     # Archived implementation plans (0002/0003/0004 finished 2026-06; see docs/ + retrospective)
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
  - Depth 20%: log-scaled active months, recency-weighted (30-month half-life), cap 48 months
  - Breadth 15%: log-scaled meaningful repos (authored w/ engagement, core-contributor, or merged PRs ≥ 2 + commits ≥ 3), cap 40
  - Recognition 30%: log10 of freshness-weighted stars on authored repos (48-month half-life) + core-contributor/merged-PR credit to ≥100★ repos
  - Craft 20%: CI/tests/README/license/releases/collaborators/commit-message quality on top authored + core-contributor repos
  - Specialization 15%: piecewise on dominant-language share (0 below 20%, linear to 100 at 100%)
  - Any weight change requires a corresponding test update.
- **AI Build Profile is self-attested and NEVER touches the score**: the `truehire` CLI (`packages/cli`) computes a 6-dimension "how you build with AI" profile from the user's LOCAL Claude Code/Cursor/Codex logs (a Worker can't read those). It's published via a single-use dashboard token (`cli_publish_tokens`, HMAC-stored) so the upload binds to a GitHub-verified identity, stored in `ai_build_profiles` (one row/user), and rendered on `/@handle` clearly fenced with a "contributes 0 to the score" disclaimer. Only aggregate counts/ratios are ever uploaded — never prompt text, code, or paths. This is the ONE allowed exception to "no self-reported data": it is explicitly labeled and weight-zero, the same way self-claimed Signal 2 work history is.
- **Ingest is dashboard-driven**: the `signIn` event only resets `ingestStatus` (serverless can kill fire-and-forget work after the callback returns); `/dashboard` opens an SSE stream to `/api/refresh/stream` (`maxDuration` 120s) which runs ingest + scoring with live progress. `/@handle` shows a "Scoring…" state until the first score lands.
- **`/@handle` route**: `startsWith("@")` guard prevents collision with other dynamic routes.
- **CF deployment**: secrets via `wrangler secret put` (`AUTH_SECRET`, `AUTH_GITHUB_SECRET`, `DATABASE_AUTH_TOKEN`, `GITHUB_API_TOKEN`) — never in `vars`.
- **GitHub data**: `@octokit/graphql` + `@octokit/rest`. Rate limit: 5k/hr per OAuth token.
- **DO NOT ADD**: Prisma, Supabase, CockroachDB, leaderboards, pseudonymous profiles, user-editable profile fields.
- Husky: pre-commit runs `scripts/secret-scan.mjs` via lint-staged; pre-push runs further checks.

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Add durable work items in SaaS Maker Cockpit Tasks when the task affects product behavior, deployment, user feedback, or fleet maintenance.
- Include the project slug, a concise title, acceptance criteria, priority/status, and links to relevant code, issues, traces, or dashboards.
- If task discovery starts locally in an editor or agent session, mirror the durable next step back into SaaS Maker before handoff.

### Using SaaS Maker
- Treat SaaS Maker as the system of record for project metadata, feedback, tasks, analytics, testimonials, changelog, and fleet visibility.
- Prefer API-first workflows through `fnd api`, the SDK, or widgets instead of one-off scripts when interacting with SaaS Maker features.
- Keep this agent file aligned with the project record when operating rules, integrations, or deployment conventions change.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->

## Active context
