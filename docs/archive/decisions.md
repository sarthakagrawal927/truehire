# Key Decisions Log (TrueHire)

**Purpose:** One canonical, lightweight home for the most important architectural and product decisions. Format per documentation preferences: one-sentence "what", one-sentence "why it matters to THIS project", link or pointer to source, optional "where in this codebase."

**See also:** PRD.md, PROJECT_STATUS.md, the focused docs/, plans/, and the original source commits / PRs.

---

## S1 / S2 split in the scores table (migration 0003)

**What:** Store `signal1` (pure GitHub composite) and `signal2` (employer verification bonus) separately on every score snapshot, with `overall = min(100, signal1 + 0.15*signal2 cap)`.

**Why it matters:** Lets recruiters and the UI clearly see the verified-employment bonus without conflating it with the GitHub score; enables clean recompute of only the bonus when a verification arrives (no re-ingest).

**Where:** `packages/db/src/schema.ts` (scores), `verify-service.ts:computeSignal2 + signal2OverallBonus`, `score-service.ts:recomputeSignal2OnVerificationChange`, public profile breakdown and methodology.

---

## Live constants in the methodology page (instead of hard-coded prose)

**What:** `/methodology` imports `SCORING_WEIGHTS`, `SCORING_CAPS`, `SCORING_HALF_LIVES` directly from `@truehire/core` at render time and renders the exact current numbers + explanations.

**Why it matters:** Prevents the most common source of doc/code drift on the scoring model; any weight or cap change immediately appears in the public explanation page and forces a corresponding test update (per core rules).

**Where:** `apps/web/src/app/methodology/page.tsx`, `packages/core/src/scoring/score.ts` (exports), `score.test.ts`.

---

## Ingest is dashboard/SSE driven (sign-in only resets status)

**What:** GitHub data pull + scoring happens when the user lands on `/dashboard` (via EventSource to the long-lived refresh stream route). `signIn` callback only resets `ingestStatus` to idle.

**Why it matters:** Serverless environments can kill fire-and-forget work after the OAuth callback returns; making the owner-initiated dashboard the driver guarantees progress UX, rate-limit control, and a clean "scoring..." state until the first score lands. Matches the "ingest is fire-and-forget" constraint in agents.md.

**Where:** `lib/auth.ts` (signIn), `app/dashboard/ingest-bootstrapper.tsx` + refresh-button, `app/api/refresh/stream/route.ts` (maxDuration 120s), `score-service.ts:beginRefresh`.

---

## "Derived, never declared" as a hard product constraint (no user-editable profile fields)

**What:** Users cannot write bios, titles, skills, or scores. Everything visible on `/@handle` and in exports traces to GitHub data or cryptographically signed employer verifications.

**Why it matters:** This is the entire thesis (costly signals that are expensive to fake). Allowing editable fields would collapse back to the resume problem the product was created to solve and would make recruiter trust impossible.

**Where:** Enforced in schema (no columns for claims), services (score-service, verify-service), UI (no forms for profile content), PRD §6.3, agents.md ("DO NOT ADD ... user-editable profile fields"), and every public surface.

---

## Early recruiter-proof surfaces before full Phase 2/3 signals or ATS features

**What:** Shipped role-fit, resume-claim-audit (with explicit caveats), hiring roles/pipelines/evaluations, shortlist comparison, risk flags, evidence labels, and takeaway CTAs while employer verification was still a manual-link beta and reputation bonds / auditions were deferred.

**Why it matters:** Gave real recruiters concrete, evidence-backed evaluation tools quickly (validating the "costly signal" value prop with the people who pay) without violating the non-goal of becoming an ATS or sourcing platform. Kept scope tight ("keep recruiter proof concrete before adding broader hiring workflow features").

**Where:** `PROJECT_STATUS.md` (Done section + planned next), `app/recruiter/**/*`, core role-fit + resume-claim-audit, the 2026-05 AI task log entries in README.md, PRD §5/11.3.

---

## 100% test coverage required on pure core logic + weight changes must update tests

**What:** `packages/core` scoring, role-fit, resume-claim-audit, and any new pure analysers/generators must have 100% coverage. Changing any weight or cap requires a matching test change.

**Why it matters:** The score is the product. Transparency + auditability are the trust mechanism. Pure functions with exhaustive tests + live methodology make the numbers defensible to candidates and recruiters; accidental drift or untested "improvements" would destroy credibility.

**Where:** `agents.md` ("Vitest (unit — `packages/core` must have 100% test coverage)"), `packages/core/src/scoring/score.test.ts` + role-fit.test.ts + resume-claim-audit.test.ts, CI via `pnpm --filter @truehire/core test`, any plan that adds core logic (0002, 0003, 0004).

---

## HMAC + app-secret signatures for employer verifications (no per-company rotating keys yet)

**What:** Verification responses are signed with `HMAC(authSecret, id|decision|ts)`. The token request is also HMAC-protected. No separate "employer key" infrastructure.

**Why it matters:** Simple, no extra secrets to manage or rotate per company at launch stage. Acceptable trade-off documented in verify-service ("Rotating AUTH_SECRET invalidates past signatures — acceptable for a launch product"). Higher-trust automated methods can add proper keying later.

**Where:** `verify-service.ts:createVerificationRequest + respondToVerification + timingSafeEqual`, schema `employerVerifications.signature` and `tokenHash`, PRD §7.1 (cryptographically signed) vs current implementation.

---

(Decisions are added chronologically when they affect product behavior, architecture, or long-term constraints. Older decisions may live in git history + the archived PRD v0.1.)