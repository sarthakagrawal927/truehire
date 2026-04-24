# TrueHire — Product Requirements Document

**Version:** 0.1 (draft)
**Owner:** Sarthak Agrawal
**Last updated:** 2026-04-24
**Status:** Pre-MVP, scoping

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

Single signal. Ship in 2 weeks. Validate demand before building signals 2-4.

### 6.1 Core flow

1. Candidate signs up with GitHub OAuth
2. We pull:
   - All public repos authored / committed to
   - Commit count over time, by language
   - Contributions to popular repos (threshold: repos with ≥100 stars)
   - Release history, issue/PR activity
3. We score:
   - **Depth:** sustained activity over years vs recent burst
   - **Breadth:** distinct projects, languages, domains
   - **Recognition:** stars earned on authored repos, merged PRs to high-star repos
   - **Specialization:** dominant language(s), dominant domain (infra, ML, frontend, etc.)
4. We produce a public profile at `truehire.dev/@username`:
   - Hero score (0-100, weighted composite)
   - Evidence rail: top 10 contributions, ordered by weight
   - Language/domain breakdown
   - Activity timeline chart
   - "Last verified: <date>" badge
5. Candidate shares the profile link in applications, or embeds score badge in their own site

### 6.2 Out of scope for MVP

- Manual profile editing (profile = derived from GitHub, not user-written)
- Recruiter-side tools (view profile = open public URL)
- Payment (free during signal-validation phase)
- Multi-signal aggregation (only signal 1)
- Other providers (GitLab, Bitbucket, Kaggle, arXiv — all phase 2)

### 6.3 Key design decisions

- **Derived not declared.** User cannot write their own bio, summary, skills list. Everything is computed from verified sources. This is the entire point.
- **Public by default.** Profiles are indexed, shareable, linkable. Privacy toggle in v2, not v1.
- **No ranking against peers in v1.** Absolute score only. Leaderboards come later once we have enough users to benchmark. Premature ranking would create PR backlash ("TrueHire says you're a bad engineer").
- **Recompute weekly.** Contribution data changes. Recompute opens conversation: "your score went up — share it".

## 7. Phase 2 — Signal 2: Employer verification

Timeline: months 3-5 after MVP launch.

### 7.1 Core flow

1. Candidate enters work history
2. TrueHire emails `hr@<company-domain>` (or a specific HR contact) asking "confirm X was Y role from Z1-Z2"
3. HR clicks signed link → one-click confirm / deny / partial-confirm
4. Confirmation cryptographically signed with TrueHire-issued employer key (one key per company, issued on first confirm)
5. Profile shows green check on verified history entries

### 7.2 Edge cases to design

- Employer doesn't respond → "pending" state, candidate can nudge
- Employer disputes → surface dispute publicly (we do not arbitrate)
- Candidate worked at dead/acquired company → alternative verification paths (tax records, pay stubs via Plaid / Argyle)
- Small employer without HR → founder/manager email works

### 7.3 Trust hierarchy

- **Automated** (payroll provider integration via Rippling/Gusto/Workday): highest trust
- **Semi-automated** (HR email confirm): high trust
- **Peer** (former manager at same employer confirms): medium trust
- **Unverified** (candidate-entered only): shown greyed out

## 8. Phase 3 — Signal 3: Reputation bonds

Timeline: months 5-8.

### 8.1 Concept

Anyone can stake money or reputation on any claim about a candidate. Staker loses the stake if the claim proves false.

### 8.2 Mechanisms

- **Referral bond:** referrer stakes $200-$2000 on "this candidate will stay and not be fired-for-cause for 90 days". Payout from hiring company on successful placement minus the bond as escrow. If candidate fails, stake is forfeited.
- **Self-claim bond:** candidate stakes personally on "I will ship X feature in Y weeks if hired for Z role". Verified by employer post-hire.
- **Third-party vouch:** former colleague stakes smaller amount ($50-$200) on one specific claim ("shipped the payments system at Stripe end-to-end"). Verified by follow-up calls.

### 8.3 Why this works

Kalshi/Polymarket-style: truth is what people bet on. Applied to hiring: truth is what people bet their money / reputation on. Unfakeable in aggregate.

### 8.4 Risks

- Liability: we're hosting a prediction market on humans. Legal review needed.
- Payout disputes: need clear escrow terms, arbitrator of last resort.
- Low-volume early: need critical mass of stakers to work. Bootstrap with our own capital in early experiments.

## 9. Phase 4 — Signal 4: Paid audition

Timeline: months 8-12.

### 9.1 Concept

Two-week paid contract (at candidate's target comp, pro-rated) → convert to FT.

### 9.2 Flow

- Candidate opts in to "available for audition"
- Company selects candidate from their TrueHire-matched pool
- TrueHire handles:
  - Contract (1099 / contractor agreement)
  - Payment escrow (company pays TrueHire, TrueHire pays candidate on completion)
  - NDA + IP assignment templates
  - Outcome feedback form (signal 5: outcome tracking)
- Optional conversion to FT with standard offer letter

### 9.3 Why this works

Two weeks of real work = highest-signal interview possible. Company sees actual output. Candidate sees actual team and role. Auttomatic / GitLab do this internally; we make it a market.

### 9.4 Economics

- Company pays candidate: standard 2-week salary-equivalent ($5-10k for senior eng)
- TrueHire fee: 15% on the audition + 10% on conversion
- High gross margin, low volume. Complementary to lower-tier signals.

## 10. Technical architecture

### 10.1 Stack

Same as RolePatch (user's standing preference):

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind 4
- **Database:** Turso (libsql) — SQLite edge
- **Auth:** NextAuth v4 with GitHub + Google providers (GitHub required for MVP since that IS the signal)
- **Deployment:** Vercel
- **Testing:** Vitest + Playwright
- **Package manager:** pnpm

### 10.2 Services

| Service | Purpose | MVP? |
|---|---|---|
| GitHub REST + GraphQL API | Fetch contributions, repos, stars | ✅ |
| Octokit | SDK for GitHub API | ✅ |
| Upstash Redis | Job queue for contribution-scoring workers, cache | ✅ |
| OG Image API (Vercel) | Share-card image generation for profile URLs | ✅ |
| Resend | Transactional email (employer verification in P2) | Phase 2 |
| Plaid / Argyle | Payroll / income verification | Phase 2 |
| Stripe Connect / Wise | Escrow + payouts for reputation bonds and audition | Phase 3 |

### 10.3 Data model (MVP)

```sql
-- users: one row per signed-in candidate
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  created_at INTEGER NOT NULL,
  last_scored_at INTEGER
);

-- contributions: raw GitHub activity, refreshed weekly
CREATE TABLE contributions (
  user_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_stars INTEGER NOT NULL,
  first_commit_at INTEGER,
  last_commit_at INTEGER,
  commits INTEGER,
  additions INTEGER,
  deletions INTEGER,
  merged_prs INTEGER,
  is_author BOOLEAN,
  primary_language TEXT,
  PRIMARY KEY (user_id, repo_full_name)
);

-- scores: computed weekly, versioned
CREATE TABLE scores (
  user_id TEXT NOT NULL,
  computed_at INTEGER NOT NULL,
  overall INTEGER NOT NULL,      -- 0-100
  depth INTEGER NOT NULL,
  breadth INTEGER NOT NULL,
  recognition INTEGER NOT NULL,
  specialization_json TEXT,      -- JSON: top languages, domains
  evidence_json TEXT,            -- JSON: top 10 contribution entries
  PRIMARY KEY (user_id, computed_at)
);
```

### 10.4 Scoring algorithm (v0)

Weighted composite, 0-100:

- **Depth (30%):** log(distinct months with activity) / log(60) * 100. Capped at 5 years.
- **Breadth (20%):** log(distinct repos authored + contributed) / log(50) * 100.
- **Recognition (35%):** sum(repo_stars * contribution_ratio) across repos; log-scaled.
- **Specialization bonus (15%):** concentration in top language / top domain; rewards depth in area.

All components log-scaled to avoid "Linus Torvalds effect" (one user with 100k commits drowns scale).

**Explicit design choice:** v0 is transparent and boring. Not ML. Candidates must understand why they scored what they did. Black-box scoring loses trust.

### 10.5 Background jobs

- **Initial ingest:** on first sign-in, queue Octokit pulls for all repos/contributions. Max 5 min acceptable latency (ship "scoring..." state).
- **Weekly refresh:** cron, re-pull deltas for all users, recompute scores.
- **On-demand refresh:** manual trigger from profile page, rate-limited to 1 per day per user.

### 10.6 Scale planning (not premature, reality check)

MVP: 100 users, ~500 repos ingested each. 50k contribution rows. Trivial on Turso free tier.

1k users: 500k rows. Still trivial.

10k users: 5M rows. Still fine on Turso paid tier ($29/mo).

No sharding concerns until 100k+ users.

## 11. Go-to-market

### 11.1 Launch sequence

1. **Pre-launch (week -2):** seed 50 profiles of known-strong engineers (OSS maintainers, ex-FAANG ICs, popular tech twitter) — their profiles become anchor cases
2. **Soft launch (week 0):** Show HN + Twitter post. Pitch: "your GitHub as a verified resume"
3. **Growth loop:** every profile has a share button + embeddable score badge. Candidates market us to each other.
4. **B2B touch (month 2):** cold-email 20 recruiters at hiring-active startups. "Search TrueHire profiles instead of LinkedIn. Free beta."

### 11.2 Growth experiments (post-launch)

- **"What's your TrueHire score?"** Twitter campaign — encourages sharing
- **Compare two profiles** — side-by-side, viral mechanic (consent required, only shown if both users opt in)
- **"Hidden gems"** — email recruiters monthly with under-radar high-scoring users
- **RolePatch funnel:** users who tailor 3+ resumes get prompt to "stop tailoring, start being trusted"

### 11.3 Monetization (not in MVP)

- Free: public profile, weekly score refresh
- **Pro ($9/mo):** manual refresh anytime, private mode, export verified PDF, custom domain for profile
- **Recruiter (B2B, $199/mo):** search by score, filter by specialization, bulk profile export, verified-candidate shortlist
- **Enterprise (custom):** API access, integrations with ATS

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GitHub deprecates API access for scoring services | Low | High | Rate-limit respect, fall back to graphql, diversify signals early |
| Score gaming (bot commits, fake stars) | Medium | Medium | Require commits to repos with real issue/PR velocity; star-buying detection |
| Recruiters don't trust our score | High early | High | Show underlying evidence, not just number; don't hide methodology |
| Signal collapse (everyone has GitHub now) | Low | High | Phase 2 signals protect against single-signal collapse |
| Legal risk (reputation bonds = regulated?) | Medium | High | Legal review before P3; consider dropping bonds if regulatory risk too high |
| RolePatch cannibalization is a PR problem | Low | Medium | Separate brand, different domain. Funnel is opt-in, not forced. |

## 13. Success metrics

### Phase 1 (MVP → month 3)

- **North star:** weekly active profile views by third parties (non-owner)
- **Activation:** % of signed-up users who get first score within 5 min
- **Retention:** % of users whose profile is refreshed (implies they're sharing it)
- **External signal:** profile URLs shared on Twitter, LinkedIn, Reddit

### Phase 2 (+ employer verification)

- Verified work-history rate per profile (target: avg 2+ employers verified by month 6)
- Employer activation rate (% who respond to verification email)

### Phase 3 (+ reputation bonds)

- GMV of staked bonds
- Default rate on staked bonds (must be <10% for system credibility)

### Phase 4 (+ audition)

- Audition → hire conversion rate (target: 40%+)
- Repeat company usage (target: companies running 3+ auditions/year)

## 14. Open questions

- Should we support **pseudonymous profiles** (handle only, no real name)? Pros: protects candidates from discrimination. Cons: kills recruiter trust for real hires. Decision needed before launch.
- **Score decay over time:** should last activity matter more than total? E.g., someone with 10 years of commits ending 5 years ago — how should they score vs someone with 3 years ending last week? Answer shapes incentives.
- **Non-code signals in MVP?** Should we ingest Kaggle / arXiv / writing in v1, or strictly GitHub? Argument for: richer profile. Against: narrower MVP ships faster.
- **How to display "no signal yet"** for students / career-changers without real output? Crucial not to make them feel unwelcome. Possibly a separate onboarding path.

## 15. Milestones

- **Week 1-2:** scaffold repo, GitHub OAuth, basic ingest pipeline, MVP scoring
- **Week 3-4:** public profile page, share card OG image, first 50 seeded profiles
- **Week 5-6:** launch on HN / Twitter, 100 signups target
- **Week 7-10:** iterate on scoring based on feedback, ship profile embed / score badge
- **Week 11-12:** decide: double down on signal 1 polish, or start signal 2 build

## 16. Appendix: why not these alternatives

- **LinkedIn verification** (opens to real-name, phone, etc.) — they have verification but no scoring. Also, they are not going to prioritize candidates with few connections.
- **Stack Overflow developer story** (sunset 2023) — pre-empted the idea but didn't execute. Closed, centralized, no growth loop.
- **Polywork, Read.cv, Bento** — social-first profile builders. User-written, not verified. Same trust problem as resume.
- **GitHub Profile README** — user-written. Not verified.
- **Developer rank APIs (e.g., CodersRank)** — closest existing. Poor scoring transparency, little adoption, no costly-signal strategy beyond code. We position as "CodersRank + verified employer + reputation bonds + audition" — the stack.
