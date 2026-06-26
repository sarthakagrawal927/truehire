# truehire — PROJECT_STATUS

Last updated: 2026-06-26

## Why/What

TrueHire is a verified candidate platform where transparent 0–100 scores are **derived from public GitHub signals**, never declared. Public profile pages live at `/@handle`. Recruiter-facing surfaces explain the evidence behind a candidate's score without turning the product into an ATS. **MVP (Signal 1 + recruiter proof) is shipped.** Signal 2 employer verification is scaffold-complete (manual-link beta); transactional email remains post-MVP.

Non-goals: user-editable bios/skills, leaderboards, pseudonymous profiles, ATS replacement, non-technical roles, resume tailoring.

## Dependencies

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Monorepo | pnpm workspaces: `apps/web`, `packages/core`, `packages/db`, `packages/cli` |
| CLI | `truehire` (npm, unscoped) — local AI-build profile scanner; tsup bundle; `better-sqlite3` for Cursor |
| Database | Drizzle ORM + Turso (libSQL); `file:./local.db` locally |
| Auth | NextAuth v5 (GitHub OAuth only) + `@auth/drizzle-adapter` |
| GitHub | @octokit GraphQL + REST in `packages/core/src/ingest/` |
| Scoring | Pure functions in `packages/core/src/scoring/score.ts` — **100% test coverage required** |
| Testing | Vitest (core unit), Playwright (e2e) |
| Deploy | Cloudflare Workers via `@opennextjs/cloudflare` |
| CI | GitHub Actions — auto-deploy on push to `main` |

**Local dev:** `pnpm install && pnpm dev` → apps/web on :3000

**Key checks:** `pnpm --filter @truehire/core test` (must stay 100%) · `pnpm test:e2e:local` · `pnpm --filter web build`

```
GitHub OAuth (NextAuth)
        │
        ▼
Ingest (fire-and-forget on signIn) ──► Turso (users, repos, contributions, scores, work_history, verifications)
        │
        ├── Signal 1 scoring (pure core): Recognition 30% · Depth 20% · Craft 20% · Breadth 15% · Specialization 15%
        ├── Signal 2 bonus (scaffold): computeSignal2 + 0.15 overall cap (+15 max)
        ├── Public profile /@handle (polls during render while ingest completes)
        ├── Dashboard (SSE bootstrap + manual refresh, rate-limited)
        └── Recruiter proof toolkit (role-fit, pipelines, shortlist, claim audit)
```

**Scoring contract:** any weight change requires corresponding test update in `packages/core`. Live `/methodology` imports `SCORING_WEIGHTS`, `CAPS`, `HALF_LIVES` from core — zero drift from prose to code.

**Profile route guard:** `/@handle` uses `startsWith("@")` guard so usernames do not collide with other dynamic routes.

| Concern | Detail |
|---------|--------|
| Hosting | Cloudflare Worker `truehire` via OpenNext |
| Database | Turso — `DATABASE_URL` + `DATABASE_AUTH_TOKEN` |
| Secrets (wrangler only) | `AUTH_SECRET`, `AUTH_GITHUB_SECRET`, `DATABASE_AUTH_TOKEN`, `GITHUB_API_TOKEN` |
| Local DB | `DATABASE_URL="file:$PWD/local.db" pnpm db:migrate` |
| Deploy | `pnpm --filter web cf:deploy` or push to `main` |
| Core tests | `pnpm --filter @truehire/core test` — must remain 100% before merge |
| E2E smoke | `pnpm test:e2e:local` (disposable DB, no prod secrets) |
| Constraints | No Prisma/Supabase/Cockroach; no user-editable profile fields; ingest never blocks auth redirect |

## Timeline

| Phase | Milestone |
|-------|-----------|
| Signal 1 MVP | GitHub OAuth, full ingest pipeline, pure 5-axis composite scoring, public profiles at `/@handle`, dashboard with SSE progress |
| Methodology & trust | `/methodology` with live constants from core; pre-commit secret scan |
| Recruiter proof (MVP+) | Score proof, recruiter takeaway card, evidence labels, RiskFlags, role-fit, JD demo, resume claim audit prototype, hiring domain (roles/pipelines/shortlist) |
| Signal 2 scaffold | Work history schema, HMAC verification tokens, `/verify/[token]` landing, manual-link beta UX |
| Public exports | OG images, embed badge, data.json/repos.csv exports, compare/recent/stats/suggest routes, score history |
| Current (2026-06-20) | MVP shipped; Signal 2 manual-link beta; email delivery deferred post-MVP validation |
| AI Build Profile (2026-06-26) | `truehire` CLI + self-attested "how you build with AI" profile (6 dimensions) from local Claude Code / Cursor / Codex logs; published via single-use token, shown fenced on `/@handle`, contributes 0 to score |

## Products

**Primary routes:** `/` · `/@handle` (public profile) · `/dashboard` · `/methodology` · `/verify/[token]` · `/recruiter/roles/*` · `/recruiter/pipelines/*` · `/recruiter/shortlist` · resume-audit demo · compare/recent/stats/suggest exports

| Surface | Role |
|---------|------|
| Public profile (`/@handle`) | Hero score, evidence rail, language breakdown, activity timeline, work history |
| Dashboard | Ingest progress, manual refresh, work history self-claim |
| Methodology | Live scoring constants and trust explanation |
| Recruiter toolkit | Role-fit, pipelines, shortlist, JD demo, resume claim audit |
| Signal 2 verify | Public verification landing for employer confirmation |
| AI Build Profile | Self-attested "how you build with AI" section on `/@handle` (companion signal, 0 to score) + dashboard onboarding card |
| `truehire` CLI | Local scanner for Claude Code / Cursor / Codex logs → 6-dimension profile, published with a single-use token |
| Exports | OG images, badge, JSON/CSV, compare, stats, suggest |

## Features (shipped)

### Signal 1 MVP — public GitHub work
- GitHub OAuth sign-up and session management (NextAuth v5).
- Full GitHub ingest: GraphQL contribution calendar, authored repos, craft signals (CI/tests/README/license/releases/collaborators), commit quality, meaningful-contribution gates, blocklists, core-contributor logic for popular repos (≥100★).
- Pure 5-axis composite scoring in `packages/core`:
  - **Recognition (30%):** log10 stars on authored repos + merged-PR credit to popular repos; 48-month freshness half-life.
  - **Depth (20%):** log-scaled months with ≥1 accepted contribution; 30-month recency half-life; 48-month cap.
  - **Craft (20%):** PR review velocity, merged-vs-opened ratio, signal-to-noise across contributor repos.
  - **Breadth (15%):** distinct repos with ≥3 commits or ≥1 merged PR, capped at 40.
  - **Specialization (15%):** piecewise on dominant-language share (0 below 20%, linear to 100 at 100%).
- Versioned score rows (`signal1` stored; `signal2` bonus blended when present).
- Activity months for depth calculation and public activity timelines.
- Public profiles at `/@handle`: hero score, evidence rail, language breakdown, activity timeline, "last verified" badge.
- Dashboard with SSE progress during ingest/refresh and manual refresh (route-level rate limit).
- Ingest is fire-and-forget on `signIn` — auth redirect never blocks; profile page polls during its own render.
- Methodology page at `/methodology` with live constants from core package.
- Pre-commit: husky runs `scripts/secret-scan.mjs` via lint-staged.

### Recruiter proof surfaces (MVP+)
- **Score proof** concrete before claim-profile CTA — evidence visible before conversion prompts.
- **Recruiter takeaway card** on profile: track record / community signal / craft stats, "no ML" trust note, dual CTAs.
- **Evidence source labels** on ScoreBreakdown rows (consistency / public GitHub / portfolio / activity) on demo and live profiles.
- **RiskFlags** molecule: up to 5 non-judgmental data-gap signals (no recent activity, sparse craft, short window, no authored repos, single-language portfolio, low traction); each links to GitHub evidence; hidden when none apply.
- **Next-action comparison** block: primary "Contact {handle} on GitHub" + secondary "Review evidence first" (anchors `#top-evidence`).
- **Role-fit** (pure-core): JD → extracted requirements by category/keywords → evidence match + gaps + remediation suggestions; surfaced per profile.
- **Job-description evaluation demo** for recruiter education.
- **Resume claim audit prototype** (fixture-backed): pasted resume treated as untrusted input; findings reported as verified/partial/unverified with explicit fairness caveats ("Unverified ≠ lacks skill"; no protected-attribute proxy).
- **Hiring domain:** roles (name + description + auto-extracted `requirements_json`), pipelines (per-role, active/closed), candidates (by @handle, stages), evaluations (per-requirement scores + overall recommendation + notes).
- **Recruiter routes:** `/recruiter/roles/*`, `/recruiter/pipelines/*` (stage view + evaluate), `/recruiter/shortlist` (multi-candidate JD comparison + export).
- All surfaces emphasize derived-from-public-GitHub-only positioning.

### Signal 2 scaffold (employer verification — manual-link beta)
- **Schema:** `work_history` (company, title, YYYY-MM dates, optional domain) + `employer_verifications` (status enum: pending/confirmed/denied/disputed/expired; method enum; token hash; cryptographic signature on response).
- **Crypto (`verify-service.ts`):** HMAC-SHA256 signed tokens; 14-day TTL; timing-safe compare; `respondToVerification` records decision + signature over `(id|decision|timestamp)`.
- **Scoring:** `computeSignal2` — 25 base per confirmed role + 4 pts/year tenure (5y cap); `signal2OverallBonus` = round(signal2 × 0.15) capped at +15 on overall; `recomputeSignal2OnVerificationChange` reuses prior signal1 without re-ingest.
- **Dashboard UX (`work-history.tsx`):** add role form with validation; "Request HR verification" returns manual-forwardable link; status chips; beta badge; explicit "Email delivery isn't wired yet" copy.
- **Public profile:** `WorkHistoryPublic` — confirmed entries show "Verified" + signer domain; self-claimed/pending/denied/disputed contribute zero bonus with appropriate chips.
- **`/verify/[token]`** public landing + decision form (confirm/deny/dispute + notes).
- **API:** `/api/work-history`, `/api/work-history/[id]/verify`, `/api/verify/respond`.
- Recruiter surfaces and role-fit reports can surface verified tenure when present.
- Dispute policy: "We do not arbitrate" — disputed entries stay visible with label.

### Public exports and growth surfaces
- OG images, embed badge (`badge.svg`), `data.json` and `repos.csv` exports.
- Compare, recent profiles, stats, suggest (axis headroom) routes.
- History page for score snapshots over time.
- Work history self-claim on dashboard (Signal 2 entry point).

### AI Build Profile — self-attested companion (2026-06-26)
- **`truehire` CLI** (`packages/cli`, npm `truehire`): scans local AI-coding logs entirely on the user's machine and computes a six-dimension "how you build with AI" profile. Commands: `assess` (scan + save `~/.truehire/ai-build-profile.json` + print summary), `publish --token` (POST to the verified account). Privacy: only aggregate counts/ratios leave the machine — never prompt text, code, or file paths.
- **Adapters** (each independently optional, lowers `dataCompleteness` if absent): Claude Code `~/.claude/projects/**/*.jsonl` (deep), Cursor `ai-code-tracking.db` + plans via `better-sqlite3` (deep), Codex `~/.codex/sessions/**` rollouts (counts).
- **Scorer** in `packages/core/src/ai-build/` — pure port of nextmillionai's model: Signal Clarity .18 / Build Stability .22 / Decision Weight .18 / Recovery Velocity .15 / Context Command .12 / Orchestration Range .15; optional signals averaged, reward-only signals never dilute; **100% test coverage**. Fixed weights (work-mode adaptation/archetypes/titles deferred).
- **Identity binding (improves on nextmillionai's bare `verified` flag):** publish auth is a single-use, 15-min, HMAC-stored token issued from the authenticated dashboard (`cli_publish_tokens`), so the upload is bound to a GitHub-verified identity without the CLI holding OAuth secrets.
- **Web:** `POST /api/ai-build/token` (issue) + `POST /api/ai-build/publish` (redeem + hand-rolled artifact validation, no new deps) → `ai_build_profiles` (one row/user). Profile renders fenced on `/@handle` with a prominent "self-attested · contributes 0 to the TrueHire score" disclaimer; dashboard has a copy-paste onboarding card.

### Documentation and quality
- PRD v0.2 at `PRD.md` (high-level stable); topic depth in `docs/signal-1-public-work.md`, `docs/signal-2-employer-verification.md`, `docs/recruiter-proof-tools.md`, `docs/public-surfaces-exports.md`.
- Implementation plans `plans/0002`–`0004` for next extensions (commit storyteller, repo-history analyser, no-signal onboarding).
- Local E2E disposable database wrapper: `pnpm test:e2e:local` creates temp SQLite, runs migrations, supplies dummy OAuth env, deletes temp DB — no production secrets.
- `packages/core` scoring tests at 100% coverage requirement enforced in CI workflow expectations.

## Todo / Planned / Deferred / Blocked

### Planned
1. **MVP score validation** — test composite with real candidate profiles; collect recruiter feedback on trust and usefulness.
2. **Weight calibration discipline** — adjust scoring weights only with corresponding core test updates and `/methodology` sync.
3. **Resume claim audit graduation decision** — move from fixture prototype to live recruiter workflow (pasted resume + selected handles) if MVP trust feedback supports it.
4. **Next extension selection** — choose among `plans/0002` (commit storyteller), `0003` (repo-history analyser), `0004` (no-signal onboarding) once MVP trust or growth feedback is clear.
5. **Signal 2 completion** — wire transactional email (Resend or Cloudflare Email) for verification links after MVP validation, not before.
6. **Signal 2 ops** — pending-request expiry jobs, nudge UI, production email secrets via `wrangler secret put` only.
7. **Publish the `truehire` CLI to npm** — packaging is release-ready (`publishConfig.access: public`, `files`, `prepublishOnly`); the actual `npm publish` is run by the owner (needs npm auth). Verify the `better-sqlite3` prebuild installs cleanly for `npm i -g truehire`.
8. **Deeper AI-build signals** — stability/recovery signals (`aiLineSurvivalRate` beyond Cursor's AI%, `errorFixRate`, `testAfterAiRate`, `buildSuccessRate`, `postAiEditRate`, `avgPlanComplexity`) are currently unfilled, capping `dataCompleteness`. Mine more from Cursor `tracked_file_content` / git, and parse Codex rollout `response_item`s for richer counts.

### Deferred
- Signal 2 payroll integrations (Plaid/Argyle/Rippling/Workday) for automated verification method.
- Signal 3 reputation bonds, Signal 4 paid auditions, Signal 5 outcome tracking. (Distinct from the **self-attested AI Build Profile**, which is a 0-to-score companion, not a verified signal in this ladder.)
- AI Build Profile v2: nextmillionai's work-mode-adaptive weights, archetypes, titles, and "wrapped" stats (v1 ships fixed weights + the six dimensions only).
- Candidate-written resumes, bios, skills, titles, or any user-editable profile fields.
- Leaderboards, generic sourcing, ATS replacement, non-technical-role support.
- Pseudonymous handle-only profiles (real-name-linked GitHub enforced for now).
- Paid tiers (manual refresh, private mode, verified PDF export, recruiter search) until MVP validation completes.

### Blocked / Known gaps
- Signal 2 is **manual-link beta only** — candidate must copy-forward verification URL; no email transport wired.
- Scoring weights need real-user validation before public marketing claims harden.
- GitHub rate limit: 5,000 req/hr per OAuth token; manual refresh rate-limited at route level — monitor for power users.
- `AUTH_SECRET` rotation invalidates old Signal 2 signatures (acceptable at launch stage; document for ops).
- Resume claim audit remains fixture-backed — not yet a live multi-handle production workflow.
