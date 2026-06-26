# truehire

Compute your **AI build profile** — *how* you build with AI — entirely on your own
machine, then publish it to your verified [TrueHire](https://truehire.sarthakagrawal927.workers.dev)
profile.

It reads your local AI-coding tool logs (Claude Code, Cursor, Codex) and scores six
dimensions — Signal Clarity, Build Stability, Decision Weight, Recovery Velocity,
Context Command, Orchestration Range — using transparent, deterministic formulas
(the same `@truehire/core` scorer the site uses).

> Inspired by [nextmillionai](https://github.com/nextmillionai/nextmillionai)'s
> local-first model. The scoring is self-reported, so on TrueHire it is shown as a
> clearly-labeled, self-attested section that **contributes 0 to your verified
> 0–100 score** — it never mixes with the GitHub-derived signal.

## Install

```bash
npm i -g truehire     # or: npx truehire assess
```

## Usage

```bash
truehire login      # connect this machine (opens your browser to approve)
truehire assess     # scan locally, print your profile, save it
truehire publish    # publish to your verified TrueHire account
truehire logout     # disconnect this machine and revoke its token
```

`login` uses a browser-pairing flow (like `gh auth login`): it shows a short code,
opens TrueHire in your browser, you approve while signed in via GitHub, and a
long-lived, revocable token is stored at `~/.truehire/credentials.json` (mode 0600).
`publish` then uses it automatically — no copy-paste. Manage or revoke connected
machines from your dashboard. `TRUEHIRE_NO_BROWSER=1` skips the auto-open (headless).

## What it reads

| Tool | Source | Fidelity |
|------|--------|----------|
| Claude Code | `~/.claude/projects/**/*.jsonl` | deep |
| Cursor | `~/.cursor/ai-tracking/ai-code-tracking.db` + plans | deep |
| Codex | `~/.codex/sessions/**/*.jsonl` | counts |

Each tool is optional — a missing one simply lowers `dataCompleteness`, never your score.

## Privacy

Everything is computed locally. The tool produces **only aggregate counts and
ratios** (session counts, tool-call counts, line ratios, prompt-length averages) —
it never reads, stores, or transmits your **prompt text, source code, or file
paths**. The `assess` artifact is cached at `~/.truehire/ai-build-profile.json`;
`publish` sends only that summary. Set `NO_COLOR=1` to disable ANSI colors and
`TRUEHIRE_API_URL` to point at a local dev server.
