# Plan 0001 — Signal extensions from idea backlog

**Status:** backlog (post-MVP)
**Created:** 2026-04-26
**Source:** moved from `saas-ideas/README.md`

Two adjacent ideas that compound TrueHire's GitHub-signal layer once the MVP score is calibrated. Both extend Section 2 ("costly signals") and Section 14 ("open questions") of `PRD.md`.

---

## A. Commit storyteller (candidate-side share loop)

Auto-summarise a candidate's last N commits into a tweetable / shareable update. Reference: https://github.com/jnsahaj/lumen.

**Why it belongs in TrueHire:**
- Recurring share surface → growth loop (Section 11.1: "every profile has a share button").
- Lightweight to build on top of the existing GitHub ingest pipeline — same data, different output.
- Candidates with steady cadence get a passive habit; those without surface the gap honestly (costly-signal-aligned).

**MVP shape:**
- Weekly digest email + tweet draft per profile owner.
- Pulls from the same commit window already ingested for scoring.
- Optional auto-post to Twitter (OAuth) or copy-to-clipboard.

**Non-goals:**
- Not a generic devrel tool. Must remain attached to a TrueHire profile.

---

## B. Repo-history analyser (deeper score axes)

Codiem-style analysis of a candidate's repo contributions: file/flow importance from change frequency, commit effort estimation, and contribution share across org.

**Why it belongs in TrueHire:**
- Directly enriches the Section 6 scoring rubric beyond commit volume / star count.
- Distinguishes "owns a critical path" from "ships peripheral changes" — reduces score gaming (Section 12 risk row 2).
- Resolves Section 14 question "should last activity matter more than total?" via per-file decay weighted by file importance.

**Candidate signal axes to add:**
- **Critical-path ownership:** % of commits in files that change frequently AND are touched by many contributors.
- **Effort proxy:** lines-changed × test-coverage delta × review depth (PR comment count).
- **Org footprint:** contribution share within each repo's contributor graph.
- **Decayed recency:** activity last 90d weighted higher than activity 5y ago, but only above a `min_total_activity` floor so career-changers aren't penalised twice.

**Build path:**
1. Reuse existing `packages/core` ingest. Add a `repo-history` analyser that runs on a sampled set of the candidate's top-N repos.
2. Persist per-file metrics in a new `repo_file_signals` table.
3. Surface a "What this score is built on" panel on the public profile page.

**Non-goals:**
- Not a general repo-analytics tool. Always anchored to a candidate score.
- No multi-repo dashboards for org admins (that's a separate B2B SKU per Section 11.3).

---

## Sequencing

Block both behind:
- MVP score is live in production
- ≥ 100 profiles seeded
- First external feedback says "the score is hard to trust" or "the score is too easy to game" — pick whichever applies. A picks growth surface, B picks score depth.
