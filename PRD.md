# TrueHire — Product Requirements Document

**Version:** 0.2  
**Owner:** Sarthak Agrawal  
**Last updated:** 2026-06-20  
**Status:** MVP shipped (Signal 1 + recruiter proof). Signal 2 scaffold complete (manual-link beta). Signal 2+ extensions and next features in `plans/` and `docs/signal-2-employer-verification.md`.

---

## 1. The problem

Hiring is broken in a new way: AI resume-tailoring tools (ChatGPT, RolePatch, Teal, etc.) have collapsed the signal value of resumes. Every applicant can produce a perfect-fit resume in 30 seconds. Recruiters now face:

- **Volume:** 500-1000 applicants per role (vs ~100 pre-ChatGPT)
- **Signal collapse:** top-quartile resumes are indistinguishable from AI-tailored mid-tier ones
- **Coping strategies:** auto-reject anything that "looks AI," over-rely on referrals, ignore applications entirely

Result: hiring is slower, more biased toward warm intros, and worse for both sides. Good candidates without networks are invisible. Companies miss hires and pay more to recruiters.

Existing approaches fail because they target one side:

- **Candidate-side (RolePatch, Teal, Resume.io, Rezi):** makes the signal-collapse worse
- **Employer-side ATS (Greenhouse, Lever, Ashby):** filters using the same broken signal
- **Matching startups (Mercor, Paraform, Ribbon, Final Round):** compete on volume, not trust

## 2. Our hypothesis

The only durable fix is **costly signals**: evidence that is expensive to fake. Resumes are cheap. Costly signals are:

| Signal | Why ungameable | MVP-relevance |
|---|---|---|
| Public work at scale (GitHub, Kaggle, published research, conference talks) | Years of real output | ✅ **MVP** — automatable, no buy-in needed |
| Third-party signed credentials (employer signs title/tenure) | Requires corrupting employer HR | Phase 2 |
| Reputation bonds / skin-in-game referrals | Real money or reputation at stake | Phase 2 |
| Paid audition (2-week paid trial → convert) | Full weeks of candidate time | Phase 3 |
| Outcome-tracked matching (hire → performance → feedback) | Years of real outcomes | Phase 4 |
| Proctored live skill tests | Witnessed under supervision | Weakening to AI, deprioritized |

A single signal is partially gameable. **Four orthogonal costly signals stacked are near-impossible to fake** unless you actually are the person you claim to be. That is the product.

## 3. Vision

**TrueHire becomes the verified-candidate layer of the internet.** A candidate's TrueHire profile is a portable credential that aggregates costly signals over time. Recruiters trust it because every data point has a verification source. A candidate who has "stacked" enough signals never needs to tailor a resume again — their profile speaks louder than any JD-matched one-pager.

Long term: the profile is the resume.

## 4. Target users

### Phase 1 (MVP → first 100 users)

- **Senior IC engineers** (backend, infra, ML) with 3+ years of public GitHub activity, currently applying to roles
- **Early career engineers** with strong OSS / Kaggle / side-project history but no brand-name employer
- **Frustrated-by-resume-ATS candidates** who have real work to show but can't get past keyword screens

### Phase 2 (+ reputation bonds)

- Mid-to-senior engineers leveraging referrer network

### Phase 3 (+ paid audition)

- Both sides of matched audition marketplace

## 5. Non-goals (v1)

- Generalist / non-technical roles (no way to verify a marketing associate via GitHub)
- Recruiter-side ATS replacement (we're a credential provider, not a pipeline tool)
- Candidate sourcing / JD posting (we pull candidates to us via credential quality, don't push roles)
- AI interview prep / mock interviews (RolePatch or competitors)
- Resume editing / tailoring (explicitly the opposite of our thesis)

## 6. MVP scope — "Signal 1: Public Work"

Single signal. Validate demand before building signals 2-4.

### Core flow (high level)
1. Candidate signs up with GitHub OAuth.
2. System pulls public repos, commits over time, contributions to popular repos (≥100★), releases, issue/PR activity.
3. Compute 0-100 composite from costly, verifiable GitHub signals.
4. Produce public profile at `/@handle` (or `/handle`) with hero score, evidence rail, language breakdown, activity timeline, "last verified" badge.
5. Candidate shares link or embeds badge; third parties view evidence directly.

### Key design decisions
- **Derived, never declared.** No user-written bio, summary, skills, or title. Everything traces to verified GitHub data.
- **Public by default.** Profiles indexed and shareable. (Privacy later.)
- **No peer ranking in v1.** Absolute score + transparent evidence only.
- **Recompute on demand (rate-limited) + periodic.** Dashboard-driven ingest + SSE progress (sign-in only resets status).

Detailed current implementation, exact weights/caps/half-lives, craft signals, meaningful-contribution gates, blocklists, core-contributor logic, and exports live in:
- `docs/signal-1-public-work.md`
- `/methodology` (imports `SCORING_WEIGHTS` / `CAPS` / `HALF_LIVES` live from `@truehire/core` — zero drift)
- `packages/core/src/scoring/score.ts` + `ingest/github.ts` (pure functions, 100% test coverage required)

## 7. Current shipped state (as of 2026-06)

MVP Signal 1 core + "recruiter proof" surfaces are live. These validate the costly-signal thesis with real recruiter interaction without turning the product into an ATS or sourcing tool (see non-goals).

**Shipped (Signal 1 + extensions):**
- Full GitHub ingest (GraphQL contribution calendar + authored repos + craft signals for CI/tests/README/license/releases/collaborators + commit quality), pure 5-axis scoring (Recognition 30%, Depth 20%, Craft 20%, Breadth 15%, Specialization 15%), versioned scores (signal1 + signal2 bonus), activity months for depth + timelines.
- Public `/@handle` profiles, dashboard (SSE bootstrap + manual refresh, rate-limited), role-fit per profile, work history (self-claim), history page, embed/OG/badge.svg/data.json/repos.csv exports, compare, recent, stats, suggest (axis headroom).
- Craft axis, RiskFlags (non-judgmental data-gap signals), evidence source labels, recruiter takeaway with dual CTAs ("Contact on GitHub" + "Review evidence").
- All surfaces emphasize "derived from public GitHub only."

**Signal 2 scaffold (Phase 2 partial):**
- `work_history` + `employer_verifications` tables (HMAC-signed tokens, 14-day expiry, status: pending/confirmed/denied/disputed/expired, method enum, cryptographic signature on response).
- `computeSignal2` (25 base + 4/yr tenure, capped) + 0.15 overall bonus (max +15).
- Public "Verified" chips (domain signer) vs self-claimed/pending/disputed (zero contribution). Recompute on verification change without re-ingest.
- Beta UX in dashboard: add role (YYYY-MM), request verification (returns manual-forwardable link; "Email delivery isn’t wired yet").
- `/verify/[token]` + respond flow. "We do not arbitrate" disputes.

**Recruiter-proof toolkit (MVP+):**
- Pure-core `role-fit` (JD → extracted requirements by category/keywords → evidence match + gap + remediation suggestions).
- `resume-claim-audit` prototype (resume text treated as untrusted claims; produces verified/partial/unverified findings + coverage + explicit fairness caveats: "Unverified ≠ lacks the skill"; "Do not use as proxy for protected attributes").
- Hiring domain: roles (name + description + auto-extracted `requirements_json`), pipelines (per-role, active/closed), candidates (by @handle, stages), evaluations (per-requirement scores + overall rec + notes).
- Surfaces: `/recruiter/roles/*`, `/recruiter/pipelines/*` (stage view + evaluate), `/recruiter/shortlist` (multi-candidate JD comparison + export), resume-audit demo (fixture-backed).
- Used for concrete evidence-backed evaluation while staying a credential layer.

**Constraints honored:** GitHub-only, 100% coverage on pure core logic, ingest is dashboard/SSE-driven (not fire-and-forget after sign-in), no pseudonymous profiles, no user-editable profile fields, no leaderboards, no forbidden stack items.

See `PROJECT_STATUS.md` (single source of truth for Done / Planned Next / Deferred). See `docs/` for canonical topic pages. See `plans/` for next extension specs.

## 8. Phased roadmap (condensed)

**Phase 1 / MVP+ (current):** Signal 1 (public GitHub work) + craft + recruiter-proof surfaces (role-fit, claim audit, pipelines for evaluation only). Validate score trust and growth loops.

**Phase 2 (Signal 2 — Employer verification):** Candidate-entered work history + signed employer confirm (email or manager or peer). Green verified chips + small bonus to overall. Scaffold complete (crypto, scoring, UI flows); real transactional email and payroll alternatives remain. Trust hierarchy: automated > HR email > peer > unverified. "We do not arbitrate."

**Phase 3 (Signal 3 — Reputation bonds):** Stakers (referrers, colleagues, self) put money/reputation on claims. Kalshi-style: truth is what people bet on. Escrow on placement, forfeit on failure. Legal + liability review required before broad use. Low early volume bootstrapped internally.

**Phase 4 (Signal 4 — Paid audition):** 2-week paid contract (pro-rated target comp) → convert. TrueHire handles contract/escrow/NDA + outcome feedback (future signal 5). High margin, low volume complement to lower-tier signals.

Later phases remain deferred until Signal 1 MVP validation completes with real usage and recruiter feedback. Signal 2 email/payroll wiring spec: `docs/signal-2-employer-verification.md`. Next candidate-side extensions: `plans/0002`–`0004`. See PROJECT_STATUS.md.

## 9. Open questions

- **Pseudonymous profiles:** handle-only vs real name? (Protects from discrimination vs kills recruiter trust for real hires.) Enforced real-name-linked (GitHub) for now.
- **Score decay / recency:** already addressed via half-lives (30-month depth, 48-month recognition freshness) + activity-month weighting. Monitor whether career-changers or returners need additional floor logic.
- **No-signal / sparse profiles:** students, career-changers, strong private-work builders get honest "not enough verified public work yet" treatment. Dedicated guidance + improvement path without fake scores or claims. Direction captured in `plans/0004-no-signal-onboarding.md`.
- **Non-GitHub signals:** strictly GitHub for core MVP+ (narrower, faster, higher-signal). Kaggle/arXiv/writing/talks considered for later orthogonal layers only after GitHub trust is solid.
- **Growth vs depth extensions:** storyteller (recurring share artifact) vs repo-history analyser (critical-path ownership, effort proxies) — see `plans/0002` and `0003`. Decide after MVP score validation feedback.

## 10. Milestones

**Historical (MVP build):**
- Scaffold, OAuth, ingest, basic scoring, public profile, OG, seeded anchors.
- Launch, iterate scoring + embed/badge, methodology page (live constants).

**Current (validation + proof):**
- Recruiter-proof surfaces (score explanation, risk flags, next-action CTAs, JD eval, role-fit, resume-claim audit, pipelines/evals).
- Signal 2 scaffold (work history + cryptographic verification + bonus blending).
- Public exports, compare, history, suggest, stats, recent.

**Next:**
- Validate the MVP score with real candidate profiles and recruiter feedback.
- Calibrate scoring weights only with corresponding core tests + methodology updates.
- Decide whether resume-claim-audit graduates from fixture prototype to live recruiter workflow.
- Decide next extension (commit storyteller vs repo-history analyser vs no-signal onboarding polish) — see `plans/0002`, `0003`, `0004`.
- Keep recruiter proof concrete before adding broader hiring workflow features.

See `PROJECT_STATUS.md` for the durable record.

---

**References & canonical homes (DRY):**
- Detailed Signal 1 requirements + as-built: `docs/signal-1-public-work.md`
- Signal 2 (as-built + remaining work): `docs/signal-2-employer-verification.md`
- Recruiter proof toolkit (role-fit, audit, pipelines, shortlist): `docs/recruiter-proof-tools.md`
- Public surfaces & exports: `docs/public-surfaces-exports.md`
- Implementation plans for next features: `plans/`
- Current status (Done / Next / Parked): `PROJECT_STATUS.md`
- Live scoring numbers & philosophy: `/methodology` + `packages/core/src/scoring/`
- Architecture, constraints, dev commands: `agents.md` + `README.md`

The original v0.1 full draft (with detailed old data model, scoring sketch, GTM, success metrics per phase, and appendix) is preserved at `docs/archive/prd-v0.1-draft-2026-04.md`.

This document is intentionally high-level and stable. Topic depth lives in the focused docs/ pages.