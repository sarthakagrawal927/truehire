import { describe, expect, it } from "vitest";
import { computeScore } from "./score";
import type { ContributionInput, MonthBucket } from "./types";

const now = new Date("2026-04-01T00:00:00Z").getTime();

function monthsRange(start: string, end: string, commitsPerMonth = 5): MonthBucket[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const out: MonthBucket[] = [];
  for (let y = sy, m = sm; y * 12 + m <= ey * 12 + em; ) {
    out.push({ month: `${y}-${String(m).padStart(2, "0")}`, commits: commitsPerMonth });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

const emptyContrib: ContributionInput = {
  repoFullName: "x/x",
  repoStars: 0,
  primaryLanguage: null,
  commits: 0,
  additions: 0,
  deletions: 0,
  mergedPrs: 0,
  isAuthor: false,
  firstCommitAt: null,
  lastCommitAt: null,
};

describe("computeScore", () => {
  it("returns 0 for empty input", () => {
    const r = computeScore({ contributions: [], months: [], now });
    expect(r.overall).toBe(0);
    expect(r.depth).toBe(0);
    expect(r.breadth).toBe(0);
    expect(r.recognition).toBe(0);
    expect(r.craft).toBe(0);
    expect(r.specialization).toBe(0);
  });

  it("rewards sustained multi-year activity more than a recent burst", () => {
    const sustained = computeScore({
      contributions: [{ ...emptyContrib, repoFullName: "u/lib", commits: 500, isAuthor: true, primaryLanguage: "TypeScript" }],
      months: monthsRange("2022-01", "2026-03"),
      now,
    });
    const burst = computeScore({
      contributions: [{ ...emptyContrib, repoFullName: "u/lib", commits: 500, isAuthor: true, primaryLanguage: "TypeScript" }],
      months: monthsRange("2026-01", "2026-03"),
      now,
    });
    expect(sustained.depth).toBeGreaterThan(burst.depth);
  });

  it("penalises old-only activity via time decay", () => {
    const stale = computeScore({
      contributions: [{ ...emptyContrib, commits: 100, isAuthor: true, primaryLanguage: "Go" }],
      months: monthsRange("2018-01", "2019-12"),
      now,
    });
    const fresh = computeScore({
      contributions: [{ ...emptyContrib, commits: 100, isAuthor: true, primaryLanguage: "Go" }],
      months: monthsRange("2024-05", "2026-03"),
      now,
    });
    expect(fresh.depth).toBeGreaterThan(stale.depth);
  });

  it("recognition log-scales so a single massive repo doesn't max out", () => {
    const one = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/viral", repoStars: 50_000, commits: 100, isAuthor: true, primaryLanguage: "TypeScript" },
      ],
      months: monthsRange("2020-01", "2026-03"),
      now,
    });
    // Even with 50k stars, recognition shouldn't saturate at 100 on one repo
    expect(one.recognition).toBeGreaterThan(30);
    expect(one.recognition).toBeLessThan(100);
  });

  it("credits merged PRs to high-star repos", () => {
    const r = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "facebook/react", repoStars: 200_000, commits: 4, mergedPrs: 3, isAuthor: false, primaryLanguage: "JavaScript" },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    expect(r.recognition).toBeGreaterThan(10);
  });

  it("ignores PRs to unknown repos for recognition", () => {
    const r = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "random/dead", repoStars: 3, commits: 5, mergedPrs: 2, isAuthor: false, primaryLanguage: "Python" },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    expect(r.recognition).toBe(0);
  });

  it("breadth rewards distinct meaningful repos", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...emptyContrib,
      repoFullName: `u/r${i}`,
      commits: 20,
      isAuthor: true,
      primaryLanguage: "TypeScript",
    }));
    const few = many.slice(0, 2);
    const a = computeScore({ contributions: many, months: monthsRange("2024-01", "2026-03"), now });
    const b = computeScore({ contributions: few, months: monthsRange("2024-01", "2026-03"), now });
    expect(a.breadth).toBeGreaterThan(b.breadth);
  });

  it("ignores low-signal tutorial/meme repos entirely", () => {
    const r = computeScore({
      contributions: [
        // 54k stars, single trivial PR — exactly the "first-contributions" pattern
        { ...emptyContrib, repoFullName: "firstcontributions/first-contributions", repoStars: 54_000, commits: 0, mergedPrs: 1, isAuthor: false, primaryLanguage: "Markdown" },
        { ...emptyContrib, repoFullName: "github-education-resources/GitHubGraduation-2022", repoStars: 1_400, commits: 1, mergedPrs: 1, isAuthor: false, primaryLanguage: null },
        { ...emptyContrib, repoFullName: "Hacktoberfest-Nepal/Your-First-PR", repoStars: 11, commits: 0, mergedPrs: 1, isAuthor: false },
        // Real authored project
        { ...emptyContrib, repoFullName: "u/real-project", repoStars: 20, commits: 103, isAuthor: true, primaryLanguage: "TypeScript" },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    expect(r.evidence.map((e) => e.repoFullName)).not.toContain("firstcontributions/first-contributions");
    expect(r.evidence.map((e) => e.repoFullName)).not.toContain("github-education-resources/GitHubGraduation-2022");
    expect(r.evidence.map((e) => e.repoFullName)).not.toContain("Hacktoberfest-Nepal/Your-First-PR");
    expect(r.evidence[0]?.repoFullName).toBe("u/real-project");
  });

  it("single trivial PR to an external repo adds nothing", () => {
    const r = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "vercel/next.js", repoStars: 120_000, commits: 1, mergedPrs: 1, isAuthor: false, primaryLanguage: "TypeScript" },
      ],
      months: monthsRange("2025-01", "2025-02"),
      now,
    });
    expect(r.recognition).toBe(0);
    expect(r.breadth).toBe(0);
    expect(r.evidence).toHaveLength(0);
  });

  it("specialization rewards concentration", () => {
    const focused = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/a", commits: 100, primaryLanguage: "Rust", isAuthor: true },
        { ...emptyContrib, repoFullName: "u/b", commits: 100, primaryLanguage: "Rust", isAuthor: true },
        { ...emptyContrib, repoFullName: "u/c", commits: 100, primaryLanguage: "Rust", isAuthor: true },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    const scattered = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/a", commits: 100, primaryLanguage: "Rust", isAuthor: true },
        { ...emptyContrib, repoFullName: "u/b", commits: 100, primaryLanguage: "Go", isAuthor: true },
        { ...emptyContrib, repoFullName: "u/c", commits: 100, primaryLanguage: "Python", isAuthor: true },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    expect(focused.specialization).toBeGreaterThan(scattered.specialization);
  });

  it("produces evidence sorted by weight, top 10 max", () => {
    const contribs = Array.from({ length: 20 }, (_, i) => ({
      ...emptyContrib,
      repoFullName: `u/r${i}`,
      commits: i * 5,
      repoStars: i * 100,
      primaryLanguage: "TypeScript",
      isAuthor: i % 2 === 0,
    }));
    const r = computeScore({ contributions: contribs, months: monthsRange("2024-01", "2026-03"), now });
    expect(r.evidence.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < r.evidence.length; i++) {
      expect(r.evidence[i - 1].weight).toBeGreaterThanOrEqual(r.evidence[i].weight);
    }
  });

  it("overall is bounded 0-100", () => {
    const r = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "linus/kernel", repoStars: 1_000_000, commits: 500_000, mergedPrs: 1000, isAuthor: true, primaryLanguage: "C" },
      ],
      months: monthsRange("2010-01", "2026-03", 100),
      now,
    });
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.overall).toBeGreaterThanOrEqual(0);
  });

  it("language share sums to ~1 across aggregated langs", () => {
    const r = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/a", commits: 50, primaryLanguage: "Rust", isAuthor: true },
        { ...emptyContrib, repoFullName: "u/b", commits: 50, primaryLanguage: "Go", isAuthor: true },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    const sum = r.languages.reduce((s, l) => s + l.share, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("forks owned by the user are treated as non-authored", () => {
    const r = computeScore({
      contributions: [
        // User "forked" linux to their namespace but didn't really author it
        { ...emptyContrib, repoFullName: "u/linux", repoStars: 180_000, commits: 1, isAuthor: true, isFork: true, primaryLanguage: "C" },
      ],
      months: monthsRange("2025-01", "2026-03"),
      now,
    });
    // Fork shouldn't count as authored → no recognition, no credit
    expect(r.recognition).toBe(0);
    expect(r.totals.stars).toBe(0);
    expect(r.evidence).toHaveLength(0);
  });

  it("applies freshness decay on authored star recognition", () => {
    const fresh = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/lib", repoStars: 5_000, commits: 200, isAuthor: true, primaryLanguage: "TypeScript", pushedAt: now - 30 * MS_DAY },
      ],
      months: monthsRange("2020-01", "2026-03"),
      now,
    });
    const stale = computeScore({
      contributions: [
        { ...emptyContrib, repoFullName: "u/lib", repoStars: 5_000, commits: 200, isAuthor: true, primaryLanguage: "TypeScript", pushedAt: now - 365 * 5 * MS_DAY },
      ],
      months: monthsRange("2020-01", "2026-03"),
      now,
    });
    expect(fresh.recognition).toBeGreaterThan(stale.recognition);
  });

  it("craft rewards CI + tests + docs on authored repos", () => {
    const disciplined = computeScore({
      contributions: [
        {
          ...emptyContrib,
          repoFullName: "u/app",
          commits: 300,
          isAuthor: true,
          primaryLanguage: "TypeScript",
          pushedAt: now - 15 * MS_DAY,
          craft: {
            hasCi: true, hasTests: true, hasReadme: true, readmeSize: 2000,
            hasLicense: true, releases: 5, collaborators: 3,
          },
        },
      ],
      months: monthsRange("2025-01", "2026-03"),
      now,
    });
    const sloppy = computeScore({
      contributions: [
        {
          ...emptyContrib,
          repoFullName: "u/app",
          commits: 300,
          isAuthor: true,
          primaryLanguage: "TypeScript",
          pushedAt: now - 15 * MS_DAY,
          craft: {
            hasCi: false, hasTests: false, hasReadme: false, readmeSize: 0,
            hasLicense: false, releases: 0, collaborators: 0,
          },
        },
      ],
      months: monthsRange("2025-01", "2026-03"),
      now,
    });
    expect(disciplined.craft).toBeGreaterThan(sloppy.craft);
    expect(disciplined.overall).toBeGreaterThan(sloppy.overall);
  });

  it("external-repo craft data does not affect craft score", () => {
    const r = computeScore({
      contributions: [
        {
          ...emptyContrib,
          repoFullName: "vercel/next.js",
          repoStars: 120_000, commits: 10, mergedPrs: 4, isAuthor: false,
          primaryLanguage: "TypeScript",
          craft: {
            hasCi: true, hasTests: true, hasReadme: true, readmeSize: 8000,
            hasLicense: true, releases: 200, collaborators: 200,
          },
        },
      ],
      months: monthsRange("2024-01", "2026-03"),
      now,
    });
    expect(r.craft).toBe(0); // only authored repos count toward craft
  });

  it("calibrates within target band for a real active engineer profile", () => {
    // Approximates sarthakagrawal927 — 7y active, ~97 authored repos, low stars,
    // mixed craft (3 disciplined recent repos, many bare older ones), mostly
    // internal PRs (invisible from public scoring). Target band: 50-70.
    const recentDisciplined = Array.from({ length: 3 }, (_, i) => ({
      ...emptyContrib,
      repoFullName: `u/polished-${i}`,
      repoStars: 1, commits: 120, isAuthor: true, primaryLanguage: "TypeScript",
      pushedAt: now - 30 * MS_DAY,
      craft: {
        hasCi: true, hasTests: true, hasReadme: true, readmeSize: 2000,
        hasLicense: true, releases: 2, collaborators: 1,
      },
    }));
    const recentBare = Array.from({ length: 12 }, (_, i) => ({
      ...emptyContrib,
      repoFullName: `u/side-${i}`,
      repoStars: 1, commits: 30, isAuthor: true,
      primaryLanguage: i % 2 === 0 ? "TypeScript" : "Go",
      pushedAt: now - 60 * MS_DAY,
      craft: { hasCi: false, hasTests: false, hasReadme: true, readmeSize: 200, hasLicense: false, releases: 0, collaborators: 0 },
    }));
    const older = Array.from({ length: 80 }, (_, i) => ({
      ...emptyContrib,
      repoFullName: `u/old-${i}`,
      repoStars: 1, commits: 10, isAuthor: true,
      primaryLanguage: "JavaScript",
      pushedAt: now - (365 * 2 + i) * MS_DAY,
      craft: { hasCi: false, hasTests: false, hasReadme: true, readmeSize: 100, hasLicense: false, releases: 0, collaborators: 0 },
    }));
    const r = computeScore({
      contributions: [...recentDisciplined, ...recentBare, ...older],
      months: monthsRange("2019-01", "2026-04"),
      now,
    });
    expect(r.overall).toBeGreaterThanOrEqual(45);
    expect(r.overall).toBeLessThanOrEqual(75);
  });
});

const MS_DAY = 24 * 3_600_000;
