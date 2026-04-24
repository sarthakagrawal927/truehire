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
      primaryLanguage: "TypeScript",
    }));
    const few = many.slice(0, 2);
    const a = computeScore({ contributions: many, months: monthsRange("2024-01", "2026-03"), now });
    const b = computeScore({ contributions: few, months: monthsRange("2024-01", "2026-03"), now });
    expect(a.breadth).toBeGreaterThan(b.breadth);
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
});
