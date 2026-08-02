# TrueHire Web

Next.js app for TrueHire public profiles, dashboard, recruiter surfaces, and GitHub score refreshes. It deploys to Cloudflare Workers through OpenNext.

## Getting Started

Run from the repository root:

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Useful checks:

```bash
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

## Deployment

Cloudflare configuration lives in `wrangler.jsonc`. Secrets are managed through Wrangler, not committed config.

The relational database is the `DB` D1 binding. Required runtime secrets include `AUTH_SECRET`, `AUTH_GITHUB_SECRET`, and `GITHUB_API_TOKEN`.

## Notes

Scoring logic belongs in `packages/core`; database schema/client code belongs in `packages/db`. Keep the app layer focused on routing, auth, views, and orchestration.
