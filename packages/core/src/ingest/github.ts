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

/** Error thrown when GitHub ingestion exhausts retries or hits a fatal state. */
export class GitHubIngestError extends Error {
  constructor(
    message: string,
    public readonly reason:
      | "rate_limited"
      | "not_found"
      | "auth"
      | "network"
      | "unknown",
  ) {
    super(message);
    this.name = "GitHubIngestError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Classify an Octokit / GraphQL error into a stable failure reason. */
function classifyGitHubError(err: unknown): GitHubIngestError["reason"] {
  const status =
    (err as { status?: number })?.status ??
    (err as { response?: { status?: number } })?.response?.status;
  const message =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (status === 403) {
    return "rate_limited"; // GitHub uses 403 for primary + secondary rate limits
  }
  if (status === 401) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (message.includes("rate limit") || message.includes("secondary rate")) {
    return "rate_limited";
  }
  if (message.includes("not found")) return "not_found";
  if (message.includes("bad credentials") || message.includes("unauthorized")) {
    return "auth";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return "network";
  }
  return "unknown";
}

/**
 * Run a GitHub call with exponential backoff. Retries rate-limit and transient
 * network failures; fails fast on auth / not-found errors. Honors GitHub's
 * `retry-after` / `x-ratelimit-reset` headers when present.
 */
async function withGitHubRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 1000;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const reason = classifyGitHubError(err);

      // Auth + not-found are not retryable — fail immediately with clear copy.
      if (reason === "auth" || reason === "not_found") {
        throw new GitHubIngestError(
          reason === "auth"
            ? "GitHub rejected the access token. Reconnect GitHub and try again."
            : `GitHub returned not-found for ${label}.`,
          reason,
        );
      }

      if (attempt === maxAttempts) break;

      // Prefer GitHub's own backoff hint when present.
      const headers =
        (err as { response?: { headers?: Record<string, string> } })?.response
          ?.headers ?? {};
      const retryAfter = Number(headers["retry-after"]);
      const reset = Number(headers["x-ratelimit-reset"]);
      let delayMs = baseDelayMs * 2 ** (attempt - 1);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        delayMs = Math.min(retryAfter * 1000, 60_000);
      } else if (Number.isFinite(reset) && reset > 0) {
        delayMs = Math.min(Math.max(reset * 1000 - Date.now(), 0), 60_000);
      }
      // Jitter so concurrent ingests don't thunder.
      delayMs += Math.floor(Math.random() * 500);
      await sleep(delayMs);
    }
  }

  const reason = classifyGitHubError(lastErr);
  throw new GitHubIngestError(
    reason === "rate_limited"
      ? "GitHub's rate limit was hit while reading this profile. Try again in a few minutes."
      : `Failed to read GitHub data for ${label} after ${maxAttempts} attempts.`,
    reason,
  );
}

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

    const res: any = await withGitHubRetry(`@${login} contributions ${label}`, () =>
      gql(CONTRIB_QUERY, {
        login,
        from: from.toISOString(),
        to: to.toISOString(),
      }),
    );
    const u = res.user;
    if (!u) {
      throw new GitHubIngestError(
        `GitHub user @${login} not found`,
        "not_found",
      );
    }

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
    const authored = await withGitHubRetry(`@${login} authored repos`, () =>
      rest.paginate(rest.repos.listForUser, {
        username: login,
        type: "owner",
        per_page: 100,
      }),
    );
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

  // Fetch craft signals for (a) authored non-fork repos with real engagement
  // and (b) top external "core-contributor" repos where the user has sunk
  // serious work. Both contribute to the Craft score (the latter scaled by
  // commit share so the user inherits proportional credit).
  const craftCandidates = Array.from(repoAgg.values()).filter((c) => {
    if (c.isAuthor && !c.isFork) return c.commits >= 3 || c.repoStars >= 5;
    // core contributor: treat like authored for craft-fetch purposes
    if (!c.isAuthor && (c.commits >= 50 || c.mergedPrs >= 5)) return true;
    return false;
  });
  // Cap at 25 to keep ingest under ~90s for large accounts.
  craftCandidates.sort((a, b) => b.commits - a.commits);
  const batch = craftCandidates.slice(0, 25);

  await Promise.all(
    batch.map(async (c) => {
      try {
        // Craft signals are non-fatal but worth a couple of retries — a single
        // rate-limit burst shouldn't zero out the Craft score for everyone.
        c.craft = await withGitHubRetry(
          `craft signals for ${c.repoFullName}`,
          () => fetchCraftSignals(rest, c.repoFullName, login),
          { maxAttempts: 2 },
        );
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

  if (!profile) {
    throw new GitHubIngestError("Empty GitHub response", "unknown");
  }
  profile.contributions = contributions;
  profile.months = months;
  progress({
    type: "done",
    pct: 100,
    stats: { repos: contributions.length, months: months.length },
  });
  return profile;
}

const TEST_DIR = /^(?:tests?|__tests__|spec|e2e|t)$/i;
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx|js|jsx|py|go|rb|rs|c|cpp|java|kt)$|^(?:vitest|jest|playwright|cypress|karma|mocha|pytest)\.config\./i;
const PACKAGE_MANIFEST = /^(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod|Gemfile|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|Makefile|CMakeLists\.txt|configure\.ac|meson\.build|mix\.exs|deno\.json)$/i;
// Non-GitHub-Actions CI file names
const CI_FILE = /^(?:\.travis\.yml|\.circleci|\.drone\.yml|\.woodpecker(?:\.yml|\.yaml)?|Jenkinsfile|azure-pipelines\.yml|appveyor\.yml|bitbucket-pipelines\.yml|\.gitlab-ci\.yml|\.buildkite)$/i;

async function fetchCraftSignals(
  rest: Octokit,
  fullName: string,
  login: string,
): Promise<CraftSignals> {
  const [owner, repo] = fullName.split("/");

  // Run file listing + releases count + contributors count + commit sample in parallel.
  const [contentsRes, releasesRes, contributorsRes, commitsRes] = await Promise.all([
    rest.repos.getContent({ owner, repo, path: "" }).catch(() => null),
    rest.repos
      .listReleases({ owner, repo, per_page: 1 })
      .then((r) => extractTotalCountFromLinkHeader(r.headers.link) ?? r.data.length)
      .catch(() => 0),
    rest.repos
      .listContributors({ owner, repo, per_page: 1, anon: "false" })
      .then((r) => extractTotalCountFromLinkHeader(r.headers.link) ??
        (Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => 0),
    rest.repos
      .listCommits({ owner, repo, author: login, per_page: 50 })
      .then((r) => r.data)
      .catch(() => []),
  ]);

  let hasCi = false;
  let hasTests = false;
  let hasReadme = false;
  let readmeSize = 0;
  let hasLicense = false;
  let hasManifest = false;

  let sawGithubDir = false;
  if (Array.isArray(contentsRes?.data)) {
    for (const entry of contentsRes.data) {
      const name = entry.name;
      if (name === ".github" && entry.type === "dir") sawGithubDir = true;
      if (CI_FILE.test(name)) hasCi = true;
      if (/^README(\.|$)/i.test(name)) {
        hasReadme = true;
        readmeSize = Math.max(readmeSize, entry.size ?? 0);
      }
      if (/^LICENSE(\.|$)|^COPYING$/i.test(name)) hasLicense = true;
      if (PACKAGE_MANIFEST.test(name)) hasManifest = true;
      if (TEST_FILE.test(name) || TEST_DIR.test(name)) hasTests = true;
    }
  }

  // If a `.github` dir exists, verify it contains workflows (GH Actions).
  if (sawGithubDir && !hasCi) {
    const wf = await rest.repos
      .getContent({ owner, repo, path: ".github/workflows" })
      .catch(() => null);
    if (Array.isArray(wf?.data) && wf.data.length > 0) hasCi = true;
  }

  // Contributors count excludes the owner → "collaborators" per type.
  const collaborators = Math.max(0, contributorsRes - 1);

  // A repo with no manifest is usually throwaway — dampen tests signal if no code
  if (!hasManifest && !hasTests) hasTests = false;

  const commitQuality = computeCommitQuality(commitsRes);

  return {
    hasCi,
    hasTests,
    hasReadme,
    hasLicense,
    readmeSize,
    releases: releasesRes,
    collaborators,
    avgCommitMsgLen: commitQuality.avgLen,
    meaningfulMsgRatio: commitQuality.meaningful,
    sampledCommits: commitQuality.sampled,
  };
}

const TRIVIAL_MSG =
  /^(?:wip|tmp|temp|asdf|test|fix|update|updates?|minor(?:\s+update)?|typo|fix(?:ed)?\s+typo|stuff|things|merge\s+branch|initial\s+commit|init|commit|save|progress|work|y|\.{2,}|[a-z]{1,3}|updated?\s+readme)\s*$/i;
const MEANINGFUL_VERB =
  /^(?:feat|fix|refactor|docs?|test|perf|chore|style|ci|build|revert|add(?:s|ed)?|remove[sd]?|implement|introduce|handle|prevent|enable|disable|migrate|rename|move|extract|inline|bump|upgrade|downgrade|close|resolve)[\s(:\-]/i;

function computeCommitQuality(commits: Array<{ commit?: { message?: string } }>) {
  const msgs = commits
    .map((c) => (c.commit?.message ?? "").split("\n")[0].trim())
    .filter((m) => m.length > 0);
  const sampled = msgs.length;
  if (sampled === 0) {
    return { avgLen: 0, meaningful: 0, sampled: 0 };
  }
  const totalLen = msgs.reduce((s, m) => s + m.length, 0);
  const avgLen = Math.round(totalLen / sampled);
  const meaningfulCount = msgs.filter(
    (m) =>
      !TRIVIAL_MSG.test(m) &&
      (MEANINGFUL_VERB.test(m) || m.length >= 30),
  ).length;
  return { avgLen, meaningful: meaningfulCount / sampled, sampled };
}

function extractTotalCountFromLinkHeader(
  link: string | undefined,
): number | null {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>; rel="last"/);
  return m ? Number(m[1]) : null;
}
