import type {
  ContributionInput,
  EvidenceEntry,
  MonthBucket,
  ScoreBreakdown,
  ScoreInput,
} from "./types";

// Weights — sum to 1.0
const W = { depth: 0.3, breadth: 0.2, recognition: 0.35, specialization: 0.15 };

// Caps — tuned so a prolific but not-legendary engineer tops out near 90.
// "Linus effect" suppressed by log scaling before the cap.
const DEPTH_CAP_MONTHS = 60; // 5 years
const BREADTH_CAP_REPOS = 50;
// log10 cap: 10^6 weighted-stars → 100. 100k → 83. 10k → 67. 1k → 50.
const RECOGNITION_CAP = 6;

// Half-life for recency weighting in months. Commits from 2 years ago count ~half.
const DEPTH_HALF_LIFE_MONTHS = 24;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const logScale = (value: number, cap: number) =>
  value <= 0 ? 0 : clamp((Math.log1p(value) / Math.log1p(cap)) * 100);

/**
 * Depth — sustained output over time, with recency-weighted month count.
 * A burst of activity last month should not beat 3 years of consistent commits.
 */
function depthScore(months: MonthBucket[], nowMs: number): number {
  if (months.length === 0) return 0;
  const now = new Date(nowMs);
  const nowIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();

  let weighted = 0;
  for (const { month, commits } of months) {
    if (commits <= 0) continue;
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) continue;
    const monthIdx = y * 12 + (m - 1);
    const agoMonths = Math.max(0, nowIdx - monthIdx);
    // recent months worth 1, decays geometrically
    const recency = Math.pow(0.5, agoMonths / DEPTH_HALF_LIFE_MONTHS);
    weighted += recency;
  }
  return logScale(weighted, DEPTH_CAP_MONTHS);
}

/**
 * Breadth — distinct meaningful repos contributed to. Authored repos with
 * real commits and external repos with merged PRs both count.
 */
function breadthScore(contributions: ContributionInput[]): number {
  const meaningful = contributions.filter(
    (c) => c.commits >= 3 || c.mergedPrs >= 1,
  );
  return logScale(meaningful.length, BREADTH_CAP_REPOS);
}

/**
 * Recognition — external validation. Stars on authored repos + weighted
 * merged-PR contribution to high-star repos. Log-scaled so no single
 * Linus-tier repo dominates.
 */
function recognitionScore(contributions: ContributionInput[]): number {
  let total = 0;
  for (const c of contributions) {
    if (c.isAuthor) {
      total += c.repoStars;
    } else if (c.mergedPrs > 0 && c.repoStars >= 100) {
      // credit for landing PRs in respected projects, scaled by # merged
      total += Math.min(c.repoStars, 5000) * Math.log1p(c.mergedPrs);
    }
  }
  if (total <= 0) return 0;
  return clamp((Math.log10(total + 1) / RECOGNITION_CAP) * 100);
}

/**
 * Specialization — concentration in a dominant language. Rewards a user who
 * is demonstrably-a-<lang>-engineer over a dabbler. Max bonus at ~70% share.
 */
function specializationScore(languages: ScoreBreakdown["languages"]): number {
  if (languages.length === 0) return 0;
  const top = languages[0]?.share ?? 0;
  // Piecewise: 0 -> 0, 0.3 -> 40, 0.5 -> 70, 0.7 -> 95, 1.0 -> 100.
  // Discourages single-repo lang monopolies by capping below 30% to 0.
  if (top < 0.2) return 0;
  const scaled = ((top - 0.2) / 0.8) * 100;
  return clamp(scaled);
}

function aggregateLanguages(contributions: ContributionInput[]) {
  const byLang = new Map<string, number>();
  let total = 0;
  for (const c of contributions) {
    if (!c.primaryLanguage) continue;
    const w = c.commits + c.mergedPrs * 5; // PRs weighted higher
    if (w <= 0) continue;
    byLang.set(c.primaryLanguage, (byLang.get(c.primaryLanguage) ?? 0) + w);
    total += w;
  }
  if (total === 0) return [];
  return Array.from(byLang.entries())
    .map(([language, commits]) => ({
      language,
      commits,
      share: commits / total,
    }))
    .sort((a, b) => b.share - a.share);
}

function buildEvidence(contributions: ContributionInput[]): EvidenceEntry[] {
  return contributions
    .map((c) => {
      // Weight: reward authorship + stars + merged PRs. Log-scaled stars so
      // one viral repo doesn't own the rail.
      const starWeight = Math.log1p(c.repoStars) * 8;
      const commitWeight = Math.log1p(c.commits) * 3;
      const prWeight = c.mergedPrs * 4;
      const authorBonus = c.isAuthor ? starWeight * 0.5 : 0;
      const weight = starWeight + commitWeight + prWeight + authorBonus;
      return {
        repoFullName: c.repoFullName,
        stars: c.repoStars,
        commits: c.commits,
        mergedPrs: c.mergedPrs,
        isAuthor: c.isAuthor,
        primaryLanguage: c.primaryLanguage,
        weight,
      };
    })
    .filter((e) => e.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const now = input.now ?? Date.now();

  const depth = Math.round(depthScore(input.months, now));
  const breadth = Math.round(breadthScore(input.contributions));
  const recognition = Math.round(recognitionScore(input.contributions));
  const languages = aggregateLanguages(input.contributions);
  const specialization = Math.round(specializationScore(languages));

  const overall = Math.round(
    depth * W.depth +
      breadth * W.breadth +
      recognition * W.recognition +
      specialization * W.specialization,
  );

  const totals = {
    commits: input.contributions.reduce((s, c) => s + c.commits, 0),
    stars: input.contributions.reduce(
      (s, c) => (c.isAuthor ? s + c.repoStars : s),
      0,
    ),
    repos: input.contributions.length,
    monthsActive: input.months.filter((m) => m.commits > 0).length,
  };

  return {
    overall: clamp(overall),
    depth,
    breadth,
    recognition,
    specialization,
    totals,
    languages: languages.slice(0, 8),
    evidence: buildEvidence(input.contributions),
  };
}
