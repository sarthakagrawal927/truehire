import type {
  ContributionInput,
  CraftSignals,
  EvidenceEntry,
  MonthBucket,
  ScoreBreakdown,
  ScoreInput,
} from "./types";

// Weights sum to 1.0. Craft joins the composite so engineering discipline is
// explicitly rewarded and star-popularity alone can't carry a profile.
const W = {
  depth: 0.25,
  breadth: 0.15,
  recognition: 0.2,
  craft: 0.25,
  specialization: 0.15,
};

const DEPTH_CAP_MONTHS = 60;
const BREADTH_CAP_REPOS = 50;
const RECOGNITION_CAP = 6;

const DEPTH_HALF_LIFE_MONTHS = 24;
// Stars on authored repos decay if the repo is abandoned. Half-life 36m means
// a 5-year-dead repo's star weight drops to ~38% of a currently-maintained one.
const FRESHNESS_HALF_LIFE_MONTHS = 36;
const MS_PER_MONTH = 30 * 24 * 3_600_000;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const logScale = (value: number, cap: number) =>
  value <= 0 ? 0 : clamp((Math.log1p(value) / Math.log1p(cap)) * 100);

/**
 * Blocklist of repo-name patterns that are known bucket-list / tutorial /
 * first-PR / meme-list repos. Massive star counts from educational value,
 * but contributing to them says nothing about engineering ability.
 */
const LOW_SIGNAL_REPO = /(?:^|\/)(?:first[-_]?contributions?|your[-_]?first[-_]?pr|hacktoberfest|good[-_]?first[-_]?issue|30[-_]?days[-_]?of|100[-_]?days[-_]?of|365[-_]?days|github[-_]?graduation|coding[-_]?interview|tech[-_]?interview|awesome[-_]?[a-z0-9-]+|morethanfaang|system[-_]?design[-_]?primer|build[-_]?your[-_]?own|every[-_]?programmer|project[-_]?based[-_]?learning|developer[-_]?roadmap|free[-_]?programming|public[-_]?apis|cheatsheet|leetcode|interview[-_]?prep)/i;

/**
 * `isFork` from GitHub is authoritative: if the user "owns" a fork (login
 * matches) they didn't author the upstream code. Treat forks as non-authored
 * no matter what the owner field says.
 */
function effectiveIsAuthor(c: ContributionInput): boolean {
  if (!c.isAuthor) return false;
  if (c.isFork === true) return false;
  return true;
}

/** Meaningful-contribution gate (blocklist + engagement threshold). */
function isMeaningful(c: ContributionInput): boolean {
  if (LOW_SIGNAL_REPO.test(c.repoFullName)) return false;
  if (effectiveIsAuthor(c)) return c.commits > 0 || c.repoStars >= 5;
  return c.mergedPrs >= 2 && c.commits >= 3;
}

function freshnessMultiplier(pushedAt: number | null | undefined, nowMs: number): number {
  if (!pushedAt) return 1;
  const ageMonths = Math.max(0, (nowMs - pushedAt) / MS_PER_MONTH);
  return Math.pow(0.5, ageMonths / FRESHNESS_HALF_LIFE_MONTHS);
}

// ─────────────────── components ───────────────────

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
    weighted += Math.pow(0.5, agoMonths / DEPTH_HALF_LIFE_MONTHS);
  }
  return logScale(weighted, DEPTH_CAP_MONTHS);
}

function breadthScore(contributions: ContributionInput[]): number {
  return logScale(contributions.filter(isMeaningful).length, BREADTH_CAP_REPOS);
}

function recognitionScore(contributions: ContributionInput[], nowMs: number): number {
  let total = 0;
  for (const c of contributions) {
    if (LOW_SIGNAL_REPO.test(c.repoFullName)) continue;
    if (effectiveIsAuthor(c)) {
      const fresh = freshnessMultiplier(c.pushedAt ?? c.lastCommitAt, nowMs);
      total += c.repoStars * fresh;
    } else if (c.mergedPrs >= 2 && c.commits >= 3 && c.repoStars >= 100) {
      total += Math.min(c.repoStars, 5000) * Math.log1p(c.mergedPrs);
    }
  }
  if (total <= 0) return 0;
  return clamp((Math.log10(total + 1) / RECOGNITION_CAP) * 100);
}

/**
 * Craft — engineering discipline on authored repos. Per-repo score of
 * CI/tests/docs/releases/collaborators, averaged over the top-N (by size)
 * authored repos and freshness-weighted. External repos don't count; you
 * don't get to claim "well-tested code" because React has tests.
 */
function craftScore(contributions: ContributionInput[], nowMs: number): number {
  const authored = contributions.filter(
    (c) => effectiveIsAuthor(c) && isMeaningful(c) && c.craft,
  );
  if (authored.length === 0) return 0;

  // Sort by most substantial first; take top 10.
  const top = authored
    .slice()
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10);

  let total = 0;
  let totalWeight = 0;
  for (const c of top) {
    const s = repoCraftScore(c.craft!);
    const fresh = freshnessMultiplier(c.pushedAt ?? c.lastCommitAt, nowMs);
    // larger repos carry more weight in the average
    const weight = Math.log1p(c.commits) * fresh;
    total += s * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return clamp(Math.round(total / totalWeight));
}

/** 0-100 craft score for a single repo. */
function repoCraftScore(s: CraftSignals): number {
  let pts = 0;
  if (s.hasCi) pts += 18;
  if (s.hasTests) pts += 18;
  if (s.hasReadme && s.readmeSize >= 800) pts += 12;
  else if (s.hasReadme) pts += 6;
  if (s.hasLicense) pts += 6;
  pts += Math.min(14, s.releases * 3);
  pts += Math.min(14, s.collaborators * 5);
  pts += commitQualityPoints(s); // 0..18
  return clamp(pts);
}

/**
 * Up to 18 pts based on recent commit message quality. Long, meaningful
 * messages correlate with engineering discipline; "wip", "update", "asdf"
 * commits drag this down. Sample is the last ~50 commits by this author.
 */
function commitQualityPoints(s: CraftSignals): number {
  const sampled = s.sampledCommits ?? 0;
  if (sampled < 5) return 0; // not enough signal
  const avgLen = s.avgCommitMsgLen ?? 0;
  const meaningful = s.meaningfulMsgRatio ?? 0;
  // avgLen: 20 chars ≈ low, 60+ ≈ high. Map linearly, cap.
  const lenPts = clamp(((Math.min(avgLen, 80) - 15) / 65) * 9, 0, 9);
  const ratioPts = clamp(meaningful * 9, 0, 9);
  return Math.round(lenPts + ratioPts);
}

function specializationScore(languages: ScoreBreakdown["languages"]): number {
  if (languages.length === 0) return 0;
  const top = languages[0]?.share ?? 0;
  if (top < 0.2) return 0;
  return clamp(((top - 0.2) / 0.8) * 100);
}

function aggregateLanguages(contributions: ContributionInput[]) {
  const byLang = new Map<string, number>();
  let total = 0;
  for (const c of contributions) {
    if (!c.primaryLanguage) continue;
    const w = c.commits + c.mergedPrs * 5;
    if (w <= 0) continue;
    byLang.set(c.primaryLanguage, (byLang.get(c.primaryLanguage) ?? 0) + w);
    total += w;
  }
  if (total === 0) return [];
  return Array.from(byLang.entries())
    .map(([language, commits]) => ({ language, commits, share: commits / total }))
    .sort((a, b) => b.share - a.share);
}

function buildEvidence(contributions: ContributionInput[]): EvidenceEntry[] {
  return contributions
    .filter(isMeaningful)
    .map((c) => {
      const commitWeight = Math.log1p(c.commits) * 3;
      const author = effectiveIsAuthor(c);
      let weight: number;
      const craftTags: string[] = [];
      if (c.craft) {
        if (c.craft.hasCi) craftTags.push("CI");
        if (c.craft.hasTests) craftTags.push("tests");
        if (c.craft.hasReadme && c.craft.readmeSize >= 800) craftTags.push("docs");
        if (c.craft.releases >= 3) craftTags.push("releases");
        if (c.craft.collaborators >= 2) craftTags.push("team");
      }
      if (author) {
        const starWeight = Math.log1p(c.repoStars) * 12;
        const craftBonus = c.craft ? repoCraftScore(c.craft) * 0.15 : 0;
        weight = starWeight + commitWeight + craftBonus;
      } else {
        const prWeight = c.mergedPrs * 6;
        const starBonus = Math.log1p(Math.min(c.repoStars, 20_000)) * 2;
        weight = prWeight + commitWeight + starBonus;
      }
      return {
        repoFullName: c.repoFullName,
        stars: c.repoStars,
        commits: c.commits,
        mergedPrs: c.mergedPrs,
        isAuthor: author,
        primaryLanguage: c.primaryLanguage,
        weight,
        craftTags: craftTags.length ? craftTags : undefined,
      };
    })
    .filter((e) => e.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

// ─────────────────── compose ───────────────────

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const now = input.now ?? Date.now();

  const depth = Math.round(depthScore(input.months, now));
  const breadth = Math.round(breadthScore(input.contributions));
  const recognition = Math.round(recognitionScore(input.contributions, now));
  const craft = Math.round(craftScore(input.contributions, now));
  const languages = aggregateLanguages(input.contributions);
  const specialization = Math.round(specializationScore(languages));

  const overall = Math.round(
    depth * W.depth +
      breadth * W.breadth +
      recognition * W.recognition +
      craft * W.craft +
      specialization * W.specialization,
  );

  const totals = {
    commits: input.contributions.reduce((s, c) => s + c.commits, 0),
    stars: input.contributions.reduce(
      (s, c) => (effectiveIsAuthor(c) ? s + c.repoStars : s),
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
    craft,
    specialization,
    totals,
    languages: languages.slice(0, 8),
    evidence: buildEvidence(input.contributions),
  };
}

export { W as SCORING_WEIGHTS, repoCraftScore };
