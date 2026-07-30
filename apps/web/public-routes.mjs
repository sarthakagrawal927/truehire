export const SITE_URL = 'https://truehire.rolepatch.com';

export const PUBLIC_ROUTES = [
  {
    id: 'home',
    path: '/',
    title: 'TrueHire — the verified-candidate layer',
    description:
      'TrueHire turns public GitHub work into transparent candidate evidence for engineers and recruiters.',
    changeFrequency: 'weekly',
    priority: 1,
    cacheable: true,
    markdown: `# TrueHire

TrueHire is a verified-candidate layer built from public GitHub evidence. It gives candidates a portable proof profile and gives recruiters a transparent way to inspect the work behind a score.

## What you can do

- Review the [scoring methodology](/methodology).
- Explore [recently claimed profiles](/recent) and [aggregate statistics](/stats).
- Compare candidates with the [recruiter shortlist](/recruiter/shortlist).
- Inspect a [sample profile](/demo) before signing in.

Scores are signals, not hiring decisions. Every score is accompanied by evidence and explicit data limitations.`,
  },
  {
    id: 'about',
    path: '/about',
    title: 'About TrueHire',
    description:
      'Why TrueHire uses costly, verifiable public-work signals instead of declarations.',
    changeFrequency: 'monthly',
    priority: 0.7,
    cacheable: true,
    markdown: `# About TrueHire

TrueHire exists because resumes and generated application text are easy to tailor, while sustained public work is costly to fake. The product derives a transparent engineering signal from public GitHub activity and keeps the underlying evidence inspectable.

TrueHire does not claim to measure a person's full ability. Private work, mentoring, leadership, and many other valuable contributions may not be visible. The score is designed to support human review, not replace it.

Read the [methodology](/methodology) or inspect the [sample profile](/demo).`,
  },
  {
    id: 'api',
    path: '/api',
    title: 'Public API — TrueHire',
    description: 'Public TrueHire profile exports, badges, reports, and discovery endpoints.',
    changeFrequency: 'monthly',
    priority: 0.65,
    cacheable: false,
    markdown: `# TrueHire public API

TrueHire exposes public, read-only resources for claimed profiles. Replace \`handle\` with a claimed GitHub username.

## Profile resources

- \`/@handle/data.json\` — portable profile and score snapshot.
- \`/@handle/repos.csv\` — repository evidence as CSV.
- \`/@handle/badge.svg\` — embeddable score badge.
- \`/@handle/role-fit/report.json?jd=...\` — role-fit report for a supplied job description.

Use [the agent catalog](/api/ai) for the complete machine-readable inventory. Authentication and operational APIs are intentionally excluded.`,
  },
  {
    id: 'compare',
    path: '/compare',
    title: 'Compare profiles — TrueHire',
    description: 'Compare public-work scores and evidence across claimed TrueHire profiles.',
    changeFrequency: 'weekly',
    priority: 0.6,
    cacheable: true,
    markdown: `# Compare TrueHire profiles

The comparison view places claimed profiles side by side using the same public-work scoring model. It is useful for understanding differences in depth, breadth, recognition, craft, and specialization without hiding the evidence behind a single composite number.

Comparisons are directional and should be interpreted alongside each profile's evidence and data gaps. Start with the [methodology](/methodology) or open the [comparison tool](/compare).`,
  },
  {
    id: 'demo',
    path: '/demo',
    title: 'Sample verified profile — TrueHire',
    description: 'A fixture-backed example of a TrueHire score, evidence, and limitations.',
    changeFrequency: 'monthly',
    priority: 0.55,
    cacheable: true,
    markdown: `# Sample TrueHire profile

This fixture-backed profile demonstrates the full public profile format without requiring an account. It shows the composite score, scoring axes, repository evidence, language mix, activity, and fairness notes.

The sample data is illustrative, not a real candidate record. See the [methodology](/methodology) for the live scoring rules or [sign in](/login) to claim a real profile.`,
  },
  {
    id: 'methodology',
    path: '/methodology',
    title: 'Scoring methodology — TrueHire',
    description: 'Weights, caps, decay, evidence sources, and limits of the TrueHire score.',
    changeFrequency: 'monthly',
    priority: 0.8,
    cacheable: true,
    markdown: `# TrueHire scoring methodology

TrueHire scores public GitHub evidence across five axes: depth, breadth, recognition, craft, and specialization. The page renders the same constants used by the scoring package so product copy and implementation cannot silently disagree.

Recency decay, caps, eligibility thresholds, and evidence limitations are disclosed. The model intentionally excludes self-declared skills and private work; that makes it auditable, but not complete.

Open the [interactive methodology page](/methodology) for the current weights and formulas.`,
  },
  {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy — TrueHire',
    description: 'What TrueHire stores, where it stores it, and what it never collects.',
    changeFrequency: 'yearly',
    priority: 0.3,
    cacheable: true,
    markdown: `# TrueHire privacy

TrueHire stores GitHub OAuth identity, public contribution data used for scoring, and optional work-history claims. It does not collect private repository contents, browser fingerprints, or candidate-written skill declarations.

Users can revoke GitHub access and request deletion. Public profile data can be exported through \`/@handle/data.json\`.

Read the complete [privacy policy](/privacy).`,
  },
  {
    id: 'recent',
    path: '/recent',
    title: 'Recently claimed profiles — TrueHire',
    description: 'The newest claimed TrueHire profiles and their public-work scores.',
    changeFrequency: 'daily',
    priority: 0.7,
    cacheable: true,
    markdown: `# Recently claimed TrueHire profiles

This directory lists the newest claimed profiles with their latest public-work score. Each entry links to the underlying profile, evidence, and score history.

The list changes as people claim profiles. Open the [live recent-profiles directory](/recent) for current entries.`,
  },
  {
    id: 'stats',
    path: '/stats',
    title: 'Aggregate statistics — TrueHire',
    description: 'Profile counts, score distribution, and language trends across TrueHire.',
    changeFrequency: 'daily',
    priority: 0.75,
    cacheable: true,
    markdown: `# TrueHire aggregate statistics

The statistics page summarizes claimed profiles, score distribution, and common languages. Aggregates help put an individual score in context without exposing private or authentication data.

Open [live statistics](/stats) for the latest database-backed values and consult the [methodology](/methodology) before interpreting them.`,
  },
  {
    id: 'suggest',
    path: '/suggest',
    title: 'Score suggestions — TrueHire',
    description:
      'Inspect scoring-axis headroom and evidence-based ways a public profile could change.',
    changeFrequency: 'weekly',
    priority: 0.6,
    cacheable: true,
    markdown: `# TrueHire score suggestions

The suggestions view explains which scoring axes have the most headroom for a supplied public profile. Suggestions describe how the scoring model responds to sustained, authentic public work; they are not instructions to manufacture activity.

Use the [suggestions tool](/suggest) with a claimed handle and verify every recommendation against the [methodology](/methodology).`,
  },
  {
    id: 'terms',
    path: '/terms',
    title: 'Terms — TrueHire',
    description: 'Terms for TrueHire scores, public exports, and API use.',
    changeFrequency: 'yearly',
    priority: 0.3,
    cacheable: true,
    markdown: `# TrueHire terms

TrueHire is provided as-is. Scores are derived from public GitHub activity and are signals rather than hiring decisions. Public export endpoints may be used for personal or commercial purposes with reasonable request rates.

Read the complete [terms](/terms).`,
  },
  {
    id: 'shortlist',
    path: '/recruiter/shortlist',
    title: 'Recruiter shortlist — TrueHire',
    description:
      'Compare verified candidates against one job description using public-work evidence.',
    changeFrequency: 'weekly',
    priority: 0.7,
    cacheable: false,
    markdown: `# TrueHire recruiter shortlist

The shortlist tool compares claimed TrueHire handles against one job description. It ranks role fit, evidence coverage, gaps, and the underlying public-work score while preserving candidate-level evidence.

Missing public evidence is reported as a limitation, not proof that a candidate lacks a skill. Try the [fixture-backed shortlist demo](/recruiter/shortlist/demo) or open the [live shortlist tool](/recruiter/shortlist).`,
  },
  {
    id: 'shortlist-demo',
    path: '/recruiter/shortlist/demo',
    title: 'Candidate proof board demo — TrueHire',
    description: 'A fixture-backed recruiter shortlist and job-description comparison.',
    changeFrequency: 'monthly',
    priority: 0.55,
    cacheable: true,
    markdown: `# Candidate proof board demo

This fixture-backed demo compares several sample candidates against a job description. It shows verified strengths, gaps, evidence freshness, and explicit caveats without using private candidate data.

Open the [interactive demo](/recruiter/shortlist/demo) or use the [live shortlist tool](/recruiter/shortlist) with claimed profiles.`,
  },
  {
    id: 'resume-audit-demo',
    path: '/recruiter/resume-audit/demo',
    title: 'Resume claim audit demo — TrueHire',
    description:
      'Compare sample resume claims with public GitHub evidence and explicit uncertainty.',
    changeFrequency: 'monthly',
    priority: 0.55,
    cacheable: true,
    markdown: `# Resume claim audit demo

This fixture-backed prototype compares candidate-supplied resume claims with public GitHub evidence. Findings are labelled verified, partial, or unverified, with the explicit rule that unverified does not mean the candidate lacks the skill.

Open the [interactive resume audit demo](/recruiter/resume-audit/demo).`,
  },
];

export const PUBLIC_TEMPLATES = [
  {
    id: 'profile',
    path: '/@{handle}',
    markdownPath: '/@{handle}.md',
    description: 'Claimed profile with score, evidence, activity, and limitations.',
  },
  {
    id: 'profile-history',
    path: '/@{handle}/history',
    markdownPath: '/@{handle}/history.md',
    description: 'Historical score snapshots for a claimed profile.',
  },
  {
    id: 'profile-role-fit',
    path: '/@{handle}/role-fit',
    markdownPath: '/@{handle}/role-fit.md',
    description: 'Role-fit explanation based on a claimed profile and supplied job description.',
  },
];

export const PRIVATE_ROUTE_PREFIXES = [
  '/api/',
  '/cli-auth',
  '/dashboard',
  '/login',
  '/recruiter/pipelines',
  '/recruiter/roles',
  '/verify/',
];

export function markdownPathForRoute(path) {
  return path === '/' ? '/index.md' : `${path}.md`;
}
