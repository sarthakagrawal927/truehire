# 2026-06 PRD Refresh & Documentation Sync — Retrospective

**Status:** Archived (2026-06-20) — journey artifact from the 2026-06-13 documentation pass.  
**Date:** 2026-06-13  
**Context:** Original PRD.md (v0.1, 2026-04-24, 368 lines) had become stale relative to shipped features (Signal 2 scaffold, recruiter-proof toolkit, craft axis, public exports, etc.). The four `plans/*.md` were still short "proposal" docs. Documentation preferences (shorter pages 150-300 lines, DRY, journey + learning artifacts as first-class, preserve on consolidate) were not yet applied at project scale. This pass archived the old PRD, refreshed the high-level one, finished the four implementation plans, added focused topic docs, a decisions log, and this retrospective, and synced PROJECT_STATUS.

**Format:** What happened, what we learned, what we'd do differently, durable follow-ups. Kept short (target ~150-200 lines).

---

## What we shipped in the product (the delta that made docs stale)

- Core Signal 1 MVP (OAuth, ingest with craft, 5-axis pure scoring with half-lives + gates + blocklists, versioned scores, public profiles, SSE dashboard refresh).
- Recruiter-proof layer (role-fit + resume-claim-audit in core with explicit caveats, hiring roles/pipelines/evals, shortlist comparison, JdEvaluator, risk flags, evidence labels, takeaway CTAs with dual actions).
- Signal 2 scaffold (full tables, HMAC crypto, tenure math, 0.15 bonus, public chips, beta dashboard + /verify flow, recompute path) — only email delivery missing.
- Many public surfaces & exports (history, compare, recent, stats, suggest, embed, badge, data.json, repos.csv, OG).
- Live methodology page that imports constants directly from core (zero-drift precedent).
- Seeded/claimed handling, analytics taxonomy, strict "derived never declared" enforcement.

All of this was accurately captured in `PROJECT_STATUS.md` (2026-06-08) and the README active-AI-task-log, but the canonical "PRD" and the "plans/" were not updated.

## What the documentation work produced

- Archived the 368-line v0.1 PRD to `docs/archive/...` (preserve history).
- New `PRD.md` v0.2 (~180 lines): high-level problem/hypothesis/vision/users/non-goals + condensed current MVP scope + "current shipped state" section + phased roadmap pointers + updated milestones + explicit links to the new canonical homes.
- Four finished implementation plans (0002 storyteller, 0003 repo-history analyser, 0004 no-signal onboarding expanded to 200+ lines each with concrete file paths, pure-core requirements, ACs, risks, sequencing; 0001 marked superseded with pointers).
- Focused short docs (all in target range):
  - `signal-1-public-work.md`
  - `signal-2-employer-verification.md`
  - `recruiter-proof-tools.md`
  - `public-surfaces-exports.md`
  - `decisions.md` (7 entries in the required "one-sentence what + why + where" format)
- This retrospective (learning artifact).
- PROJECT_STATUS updated with the doc deliverables.
- Cross-refs cleaned (DRY: scoring details live in core + /methodology; no re-explanation in multiple places).

## Key lessons

1. **Live code-sourced docs are a superpower.** The methodology page that imports `SCORING_*` constants was already the right pattern. We should have applied the same idea (or at least aggressive pointers) to the PRD much earlier instead of letting a long static document rot.

2. **"Recruiter proof" was the correct early bet.** Shipping concrete evaluation tools (role-fit, audit with fairness caveats, pipelines, takeaway CTAs) while the core signal was still being validated gave us fast feedback from the demand side without violating any non-goals. The docs refresh now makes that strategy visible and citable.

3. **The "derived, never declared" rule paid for itself many times.** Every time a new surface (shortlist, resume-audit, role-fit, work-history) was added, the invariant made scope decisions trivial and kept trust intact. It belongs in every plan and doc as a first-class constraint.

4. **Half-lives, blocklists, and meaningful gates are the real anti-gaming technology.** Not the high-level weights. Future plans (0003 especially) correctly focus on deeper shape-of-contribution signals rather than just adding more volume.

5. **plans/ as "archived implementation plans" only works if they are actually finished.** Short proposal docs are useful for brainstorming but become liabilities for future agents. Finishing them (file-level steps, pure vs IO, test mandates, ACs, risks, sequencing) turns them into executable artifacts.

6. **Journey artifacts (decisions + retrospective) are cheap to write at the moment of change and extremely valuable later.** We had none before this pass. The decisions log already makes the S1/S2 split, live methodology, ingest model, and early recruiter-proof choices legible without archaeology.

7. **Shorter pages + DRY force better navigation.** Splitting the old monolithic PRD and giving each major topic (Signal 1, Signal 2, recruiter tools, public exports, decisions) its own canonical home with explicit "see also" sections makes the system easier for both humans and future agents. The 150-300 line target is a forcing function for focus.

8. **Seeded anchors + sparse profiles are first-class citizens.** Any no-signal or onboarding work (plan 0004) must handle unclaimed seeded profiles from day one. The honest "absence of proof" framing is not just for students — it protects the credibility of the whole credential layer.

## What we'd do differently next time

- Treat the PRD + plans as living code-adjacent artifacts with the same review bar as a core change. Update them in the same PR that ships the corresponding feature (or immediately after validation).
- Add a "docs" check to the pre-push or CI that greps for contradictions between PRD language and current status / schema comments.
- When adding a new major surface (role-fit, pipelines, etc.), immediately add or update the corresponding short doc page instead of relying on the catch-all PRD and status file.
- Capture decisions in `docs/decisions.md` (or the log inside PROJECT_STATUS) at the time they are made, with a one-line pointer in the commit message.

## Durable follow-ups (for PROJECT_STATUS or SaaS Maker)

- After the next significant scope change (e.g. wiring real email for Signal 2, graduating resume-audit from demo, shipping storyteller or the analyser), repeat a mini version of this refresh (update the relevant short doc + decisions + plans status + PROJECT_STATUS).
- Consider making parts of `docs/` web-visible (simple dynamic routes or Astro pages in the landing surface) once the marketing site expands — the content is already written in a linkable, self-contained style.
- If any of plans 0002/0003/0004 are implemented, the corresponding plan file can be moved to `plans/archive/` or marked "implemented" with a link to the PR / release note (preserve history).

## Sources consulted (for this retrospective)

- Original exploration (subagent summaries of features vs PRD, schema evolution, services, UI inventory).
- Full reads of PRD.md (old), PROJECT_STATUS.md, all four plans (pre-refresh), schema.ts, verify-service.ts, score.ts (partial), methodology page, hiring-service, recruiter routes, core role-fit + resume-claim-audit, agents.md, Fleet AGENTS.md, README active log.
- Code comments that explicitly called out "scaffold / beta / prototype / not wired / demo".

This pass leaves the documentation in better shape than we found it: shorter where needed, DRY, with the journey artifacts present, and every major concept having one canonical home that future agents (and humans) can trust.

**End of retrospective.** Update PROJECT_STATUS with the doc work as a completed item under "Done."