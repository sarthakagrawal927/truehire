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
};

export type MonthBucket = { month: string; commits: number }; // "YYYY-MM"

export type ScoreInput = {
  contributions: ContributionInput[];
  months: MonthBucket[]; // distinct months with any activity
  now?: number; // injectable for tests, ms epoch
};

export type ScoreBreakdown = {
  overall: number; // 0-100 weighted composite
  depth: number; // 0-100
  breadth: number; // 0-100
  recognition: number; // 0-100
  specialization: number; // 0-100
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
  weight: number; // used for sort + UI "weight bar"
};
