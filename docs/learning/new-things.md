# new-things — study queue

Short stubs for non-standard tech in this repo. 3–5 lines each. Fill `Why here:`
yourself after learning; never invent rationale.

## Local AI-session log parsing (Claude Code / Cursor / Codex)
- What: deriving signals from each tool's on-disk session store — Claude Code JSONL
  (`~/.claude/projects`), Cursor SQLite (`ai-code-tracking.db`), Codex rollouts.
- Why here: TBD
- Gotcha (from code): a Claude `type:"user"` line is often a *tool result*, not a human
  turn — count only lines with a real text block (`packages/cli/src/adapters/claude-code.ts`).
- Source: formats are undocumented; schemas were reverse-engineered (see adapter comments).

## Self-attested vs. verified identity binding
- What: uploading self-reported data but binding it to a verified identity via a
  single-use, HMAC-stored token issued from an authenticated session.
- Why here: TBD
- Gotcha (from code): the token is redeemed only AFTER artifact validation so a malformed
  upload can't burn it (`apps/web/src/app/api/ai-build/publish/route.ts`).
- Source: `apps/web/src/lib/ai-build-service.ts`; improves on nextmillionai's bare boolean flag.

## better-sqlite3 in a published CLI
- What: a native (node-gyp) dependency shipped in an npm CLI; prebuilt binaries via
  `prebuild-install`; pnpm 10 blocks its install script unless allow-listed.
- Why here: TBD
- Gotcha (from code): allow-listed in `pnpm-workspace.yaml` `onlyBuiltDependencies`; the
  Cursor adapter lazy-imports it and degrades to "presence" if it can't load.
- Source: https://github.com/WiseLibs/better-sqlite3
