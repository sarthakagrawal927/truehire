import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import type {
  ContributionInput,
  CraftSignals,
  MonthBucket,
} from "../scoring/types";

export type IngestResult = {
  contributions: ContributionInput[];
  months: MonthBucket[];
  username: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  accountCreatedAt: string;
};

type ContribCalendarDay = { date: string; contributionCount: number };

const CONTRIB_QUERY = /* GraphQL */ `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      login
      name
      bio
      company
      location
      avatarUrl
      createdAt
      followers { totalCount }
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays { date contributionCount }
          }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            nameWithOwner
            url
            description
            stargazerCount
            isFork
            primaryLanguage { name }
            owner { login }
          }
          contributions { totalCount }
          url
        }
        pullRequestContributionsByRepository(maxRepositories: 100) {
          repository {
            nameWithOwner
            stargazerCount
            primaryLanguage { name }
          }
          contributions(first: 100) {
            nodes {
              pullRequest { merged mergedAt }
            }
          }
        }
      }
    }
  }
`;

/**
 * Pull contribution signal for a GitHub user. Uses GraphQL contributions
 * collection (cheaper + includes private-contrib counts when authed as self)
 * plus a few REST calls for authored-repo stats.
 *
 * Strategy: query year-by-year back up to 6 years (GitHub limit is ~1yr per call).
 */
export type IngestPhase =
  | { type: "profile"; message: string }
  | { type: "year"; year: number; total: number; message: string; pct: number }
  | { type: "authored"; message: string; pct: number }
  | { type: "done"; pct: 100; stats: { repos: number; months: number } };

export type IngestProgress = (phase: IngestPhase) => void;

export async function ingestGitHubUser(params: {
  login: string;
  token: string; // OAuth access token or PAT
  yearsBack?: number;
  onProgress?: IngestProgress;
}): Promise<IngestResult> {
  const { login, token, onProgress } = params;
  const yearsBack = params.yearsBack ?? 6;
  const progress: IngestProgress = onProgress ?? (() => {});

  const gql = graphql.defaults({ headers: { authorization: `bearer ${token}` } });
  const rest = new Octokit({ auth: token });

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const repoAgg = new Map<string, ContributionInput & { _starSync: boolean }>();
  const monthBuckets = new Map<string, number>();

  let profile: IngestResult | null = null;

  progress({ type: "profile", message: `Fetching @${login} profile` });

  for (let y = 0; y < yearsBack; y++) {
    const to = new Date(now.getTime() - y * 365 * 24 * 3600 * 1000);
    const from = new Date(to.getTime() - 365 * 24 * 3600 * 1000);

    const label = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")} → ${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}`;
    // 10% reserved for authored-repo top-up, so years share 85%.
    const pct = 5 + Math.round(((y + 1) / yearsBack) * 85);
    progress({
      type: "year",
      year: yearsBack - y,
      total: yearsBack,
      message: `Scanning contributions ${label}`,
      pct,
    });

    const res: any = await gql(CONTRIB_QUERY, {
      login,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const u = res.user;
    if (!u) throw new Error(`GitHub user @${login} not found`);

    if (!profile) {
      profile = {
        username: u.login,
        name: u.name,
        bio: u.bio,
        company: u.company,
        location: u.location,
        avatarUrl: u.avatarUrl,
        followers: u.followers?.totalCount ?? 0,
        accountCreatedAt: u.createdAt,
        contributions: [],
        months: [],
      };
    }

    // month buckets
    const weeks = u.contributionsCollection.contributionCalendar.weeks;
    for (const wk of weeks) {
      for (const d of wk.contributionDays as ContribCalendarDay[]) {
        if (d.contributionCount <= 0) continue;
        const month = d.date.slice(0, 7); // YYYY-MM
        monthBuckets.set(month, (monthBuckets.get(month) ?? 0) + d.contributionCount);
      }
    }

    // commits per repo
    for (const cc of u.contributionsCollection.commitContributionsByRepository) {
      const repo = cc.repository;
      const key = repo.nameWithOwner;
      const existing = repoAgg.get(key);
      const isAuthor = repo.owner.login.toLowerCase() === login.toLowerCase();
      const add: ContributionInput & { _starSync: boolean } = existing ?? {
        repoFullName: key,
        repoStars: repo.stargazerCount,
        primaryLanguage: repo.primaryLanguage?.name ?? null,
        commits: 0,
        additions: 0,
        deletions: 0,
        mergedPrs: 0,
        isAuthor,
        firstCommitAt: null,
        lastCommitAt: null,
        _starSync: true,
      };
      add.commits += cc.contributions.totalCount;
      // take freshest star count
      add.repoStars = Math.max(add.repoStars, repo.stargazerCount);
      repoAgg.set(key, add);
    }

    // merged PRs per repo
    for (const pr of u.contributionsCollection.pullRequestContributionsByRepository) {
      const repo = pr.repository;
      const merged = pr.contributions.nodes.filter(
        (n: any) => n.pullRequest.merged,
      ).length;
      if (merged === 0) continue;
      const key = repo.nameWithOwner;
      const existing = repoAgg.get(key);
      const isAuthor = key.split("/")[0]?.toLowerCase() === login.toLowerCase();
      const add: ContributionInput & { _starSync: boolean } = existing ?? {
        repoFullName: key,
        repoStars: repo.stargazerCount,
        primaryLanguage: repo.primaryLanguage?.name ?? null,
        commits: 0,
        additions: 0,
        deletions: 0,
        mergedPrs: 0,
        isAuthor,
        firstCommitAt: null,
        lastCommitAt: null,
        _starSync: true,
      };
      add.mergedPrs += merged;
      add.repoStars = Math.max(add.repoStars, repo.stargazerCount);
      repoAgg.set(key, add);
    }
  }

  progress({ type: "authored", message: "Topping up authored repos", pct: 88 });

  // Top up authored-repo metadata + mark isFork.
  try {
    const authored = await rest.paginate(rest.repos.listForUser, {
      username: login,
      type: "owner",
      per_page: 100,
    });
    for (const r of authored) {
      const key = r.full_name;
      const pushedAt = r.pushed_at ? new Date(r.pushed_at).getTime() : null;
      const existing = repoAgg.get(key);
      if (existing) {
        existing.repoStars = Math.max(existing.repoStars, r.stargazers_count ?? 0);
        existing.isAuthor = true;
        existing.isFork = !!r.fork;
        existing.pushedAt = pushedAt;
        existing.primaryLanguage = existing.primaryLanguage ?? r.language ?? null;
      } else if (!r.fork && (r.stargazers_count ?? 0) >= 5) {
        // Surface authored repos with traction even without commits in window
        repoAgg.set(key, {
          repoFullName: key,
          repoStars: r.stargazers_count ?? 0,
          primaryLanguage: r.language ?? null,
          commits: 0,
          additions: 0,
          deletions: 0,
          mergedPrs: 0,
          isAuthor: true,
          isFork: false,
          pushedAt,
          firstCommitAt: null,
          lastCommitAt: null,
          _starSync: true,
        });
      }
    }
  } catch {
    /* non-fatal */
  }

  progress({ type: "authored", message: "Reading repo craft signals", pct: 94 });

  // Fetch craft signals for authored non-fork repos that have real engagement.
  // Skip forks + trivial-commit repos to stay inside rate limits on big accounts.
  const craftCandidates = Array.from(repoAgg.values()).filter(
    (c) => c.isAuthor && !c.isFork && (c.commits >= 3 || c.repoStars >= 5),
  );
  // Cap at 25 to keep ingest under ~90s for large accounts; we only score from
  // the top 10 anyway, so taking the most-commits 25 covers the signal.
  craftCandidates.sort((a, b) => b.commits - a.commits);
  const batch = craftCandidates.slice(0, 25);

  await Promise.all(
    batch.map(async (c) => {
      try {
        c.craft = await fetchCraftSignals(rest, c.repoFullName);
      } catch {
        c.craft = null;
      }
    }),
  );

  const months: MonthBucket[] = Array.from(monthBuckets.entries())
    .map(([month, commits]) => ({ month, commits }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const contributions: ContributionInput[] = Array.from(repoAgg.values()).map(
    ({ _starSync: _s, ...c }) => c,
  );

  if (!profile) throw new Error("empty GitHub response");
  profile.contributions = contributions;
  profile.months = months;
  progress({
    type: "done",
    pct: 100,
    stats: { repos: contributions.length, months: months.length },
  });
  return profile;
}

const TEST_FILE = /(?:^|\/)(?:tests?|__tests__|spec|e2e)(?:\/|$)|\.(?:test|spec)\.(?:ts|tsx|js|jsx|py|go|rb|rs)$|^(?:vitest|jest|playwright|cypress)\.config\./i;
const PACKAGE_MANIFEST = /^(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod|Gemfile|composer\.json|pom\.xml|build\.gradle)$/i;

async function fetchCraftSignals(
  rest: Octokit,
  fullName: string,
): Promise<CraftSignals> {
  const [owner, repo] = fullName.split("/");

  // Run file listing + releases count + contributors count in parallel.
  const [contentsRes, releasesRes, contributorsRes] = await Promise.all([
    rest.repos.getContent({ owner, repo, path: "" }).catch(() => null),
    rest.repos
      .listReleases({ owner, repo, per_page: 1 })
      .then((r) => extractTotalCountFromLinkHeader(r.headers.link) ?? r.data.length)
      .catch(() => 0),
    rest.repos
      .listContributors({ owner, repo, per_page: 10, anon: "false" })
      .then((r) => Array.isArray(r.data) ? r.data.length : 0)
      .catch(() => 0),
  ]);

  let hasCi = false;
  let hasTests = false;
  let hasReadme = false;
  let readmeSize = 0;
  let hasLicense = false;
  let hasManifest = false;

  if (Array.isArray(contentsRes?.data)) {
    for (const entry of contentsRes.data) {
      const name = entry.name;
      if (name === ".github" && entry.type === "dir") hasCi = true;
      if (/^README(\.|$)/i.test(name)) {
        hasReadme = true;
        readmeSize = Math.max(readmeSize, entry.size ?? 0);
      }
      if (/^LICENSE(\.|$)|^COPYING$/i.test(name)) hasLicense = true;
      if (PACKAGE_MANIFEST.test(name)) hasManifest = true;
      if (TEST_FILE.test(name) || /^(?:tests?|__tests__|spec|e2e)$/i.test(name)) hasTests = true;
    }
  }

  // Double-check for .github/workflows (CI config specifically)
  if (hasCi) {
    const wf = await rest.repos
      .getContent({ owner, repo, path: ".github/workflows" })
      .catch(() => null);
    if (!Array.isArray(wf?.data) || wf.data.length === 0) hasCi = false;
  }

  // Contributors count excludes the owner → "collaborators" per type.
  const collaborators = Math.max(0, contributorsRes - 1);

  // A repo with no manifest is usually throwaway — dampen tests signal if no code
  if (!hasManifest && !hasTests) hasTests = false;

  return {
    hasCi,
    hasTests,
    hasReadme,
    hasLicense,
    readmeSize,
    releases: releasesRes,
    collaborators,
  };
}

function extractTotalCountFromLinkHeader(
  link: string | undefined,
): number | null {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>; rel="last"/);
  return m ? Number(m[1]) : null;
}
