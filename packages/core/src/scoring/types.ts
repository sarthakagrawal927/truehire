export type ContributionInput = {
  repoFullName: string;
  repoStars: number;
  primaryLanguage: string | null;
  commits: number;
  additions: number;
  deletions: number;
  mergedPrs: number;
  isAuthor: boolean;
  firstCommitAt: number | null; // ms epoch
  lastCommitAt: number | null;

  // Populated only for authored repos (we don't care about craft of external repos).
  isFork?: boolean;
  pushedAt?: number | null; // ms epoch, freshness
  craft?: CraftSignals | null;
};

export type CraftSignals = {
  hasCi: boolean;           // .github/workflows
  hasTests: boolean;        // tests dir OR test file OR vitest/jest/playwright config
  hasReadme: boolean;       // README.md present and non-trivial
  hasLicense: boolean;
  readmeSize: number;       // bytes
  releases: number;         // tag / release count
  collaborators: number;    // non-owner contributors

  // Commit-message quality sampled from the most recent ~50 commits by the
  // author. Both unitless 0..1 quantities — the scorer converts.
  avgCommitMsgLen?: number;       // chars
  meaningfulMsgRatio?: number;    // 0..1 (fraction of commits that look non-trivial)
  sampledCommits?: number;        // how many commits actually sampled
};

export type MonthBucket = { month: string; commits: number }; // "YYYY-MM"

export type ScoreInput = {
  contributions: ContributionInput[];
  months: MonthBucket[];
  now?: number;
};

export type ScoreBreakdown = {
  overall: number;
  depth: number;
  breadth: number;
  recognition: number;
  craft: number;
  specialization: number;
  totals: {
    commits: number;
    stars: number;
    repos: number;
    monthsActive: number;
  };
  languages: { language: string; share: number; commits: number }[];
  evidence: EvidenceEntry[];
};

export type EvidenceEntry = {
  repoFullName: string;
  stars: number;
  commits: number;
  mergedPrs: number;
  isAuthor: boolean;
  primaryLanguage: string | null;
  weight: number;
  craftTags?: string[]; // e.g. ["CI","tests","docs"] — for UI
};
