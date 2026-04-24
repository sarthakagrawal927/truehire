/**
 * Seed anchor profiles — ingests + scores a curated list of strong public
 * engineers so the site launches with credible anchor cases.
 *
 * Usage:
 *   GITHUB_API_TOKEN=ghp_... DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... \
 *   pnpm --filter web tsx scripts/seed-anchors.ts
 *
 * Idempotent: re-running updates contributions + scores for existing seeds.
 * Creates placeholder user rows flagged `seeded=true, claimed=false`.
 * When an anchor signs in for real, NextAuth DrizzleAdapter links the same
 * githubId → row and flips `claimed=true`.
 */
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@truehire/db";
import { eq } from "drizzle-orm";
import { computeScore, ingestGitHubUser } from "@truehire/core";

// Curated list — OSS maintainers / known strong engineers with large public
// footprints. Any GitHub user works; these were chosen for variety of language
// + domain to showcase score range out of the gate.
const ANCHORS: string[] = [
  "tj",             // Node.js/Go prolific, express, koa
  "sindresorhus",   // indie JS maintainer, huge footprint
  "yyx990803",      // Vue author
  "gaearon",        // React, Redux (Dan Abramov)
  "addyosmani",     // web-perf, Chrome DX
  "mitsuhiko",      // Flask, Rust author
  "sebmarkbage",    // React core
  "rauchg",         // Vercel founder
  "timneutkens",    // Next.js core
  "developit",      // Preact author
  "kentcdodds",     // testing-library, remix
  "shadcn",         // shadcn/ui
  "wycats",         // Ember, Rust
  "jaredpalmer",    // formik, Vercel
  "jashkenas",      // Backbone, Underscore, CoffeeScript
  "torvalds",       // Linux, Git — ceiling test
  "antirez",        // Redis
  "gvanrossum",     // Python creator
  "bellard",        // QEMU, FFmpeg, tcc
  "mitchellh",      // HashiCorp founder
];

async function seed(login: string) {
  const token = process.env.GITHUB_API_TOKEN;
  if (!token) throw new Error("GITHUB_API_TOKEN is required");

  console.log(`→ ingesting @${login}`);
  const result = await ingestGitHubUser({ login, token });

  const existing = (
    await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.githubUsername, result.username))
      .limit(1)
  )[0];

  const userId = existing?.id ?? createId();

  await db.transaction(async (tx) => {
    if (!existing) {
      await tx.insert(schema.users).values({
        id: userId,
        name: result.name ?? result.username,
        email: null,
        image: result.avatarUrl,
        githubUsername: result.username,
        seeded: true,
        claimed: false,
        ingestStatus: "idle",
        lastIngestedAt: new Date(),
        lastScoredAt: new Date(),
      });
    } else {
      await tx
        .update(schema.users)
        .set({
          name: existing.name ?? result.name ?? result.username,
          image: existing.image ?? result.avatarUrl,
          lastIngestedAt: new Date(),
          lastScoredAt: new Date(),
          ingestStatus: "idle",
        })
        .where(eq(schema.users.id, userId));
    }

    await tx.delete(schema.contributions).where(eq(schema.contributions.userId, userId));
    if (result.contributions.length > 0) {
      await tx.insert(schema.contributions).values(
        result.contributions.map((c) => ({
          userId,
          repoFullName: c.repoFullName,
          repoStars: c.repoStars,
          repoUrl: `https://github.com/${c.repoFullName}`,
          repoDescription: null,
          primaryLanguage: c.primaryLanguage,
          firstCommitAt: c.firstCommitAt ? new Date(c.firstCommitAt) : null,
          lastCommitAt: c.lastCommitAt ? new Date(c.lastCommitAt) : null,
          commits: c.commits,
          additions: c.additions,
          deletions: c.deletions,
          mergedPrs: c.mergedPrs,
          isAuthor: c.isAuthor,
          isFork: c.isFork ?? false,
          pushedAt: c.pushedAt ? new Date(c.pushedAt) : null,
          craftJson: c.craft ? JSON.stringify(c.craft) : null,
          weightedScore: 0,
        })),
      );
    }

    await tx.delete(schema.activityMonths).where(eq(schema.activityMonths.userId, userId));
    if (result.months.length > 0) {
      await tx.insert(schema.activityMonths).values(
        result.months.map((m) => ({ userId, month: m.month, commits: m.commits })),
      );
    }

    const breakdown = computeScore({
      contributions: result.contributions,
      months: result.months,
    });

    await tx.insert(schema.scores).values({
      userId,
      computedAt: new Date(),
      overall: breakdown.overall,
      depth: breakdown.depth,
      breadth: breakdown.breadth,
      recognition: breakdown.recognition,
      craft: breakdown.craft,
      specialization: breakdown.specialization,
      languagesJson: JSON.stringify(breakdown.languages),
      evidenceJson: JSON.stringify(breakdown.evidence),
      totalCommits: breakdown.totals.commits,
      totalStars: breakdown.totals.stars,
      totalRepos: breakdown.totals.repos,
      monthsActive: breakdown.totals.monthsActive,
    });

    console.log(`  ✓ ${result.username} · overall ${breakdown.overall} · ${result.contributions.length} repos`);
  });
}

async function main() {
  let ok = 0;
  let fail = 0;
  for (const login of ANCHORS) {
    try {
      await seed(login);
      ok++;
    } catch (e: any) {
      console.error(`  ✗ ${login}: ${e?.message ?? e}`);
      fail++;
    }
    // Polite pacing — GitHub GraphQL is 5k pts/hr, contributions query is cheap
    // but we don't need to hammer.
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`\nDone — ${ok} ok, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
