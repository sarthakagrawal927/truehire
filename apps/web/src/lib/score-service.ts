import { db, schema } from "@truehire/db";
import { eq, desc } from "drizzle-orm";
import { computeScore, ingestGitHubUser } from "@truehire/core";

const INGEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function getLatestScore(userId: string) {
  const rows = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.userId, userId))
    .orderBy(desc(schema.scores.computedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserByUsername(username: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.githubUsername, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getGitHubAccessToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: schema.accounts.access_token })
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);
  return rows[0]?.token ?? null;
}

export async function getActivityMonths(userId: string) {
  return db
    .select()
    .from(schema.activityMonths)
    .where(eq(schema.activityMonths.userId, userId));
}

export async function getContributions(userId: string) {
  return db
    .select()
    .from(schema.contributions)
    .where(eq(schema.contributions.userId, userId));
}

/**
 * Orchestrates: ingest GitHub, persist raw data, recompute score, persist score.
 * Idempotent — safe to call on sign-in or on manual refresh.
 *
 * Throws on fatal errors. Caller updates ingest_status around this call.
 */
export async function refreshUserScore(params: {
  userId: string;
  login: string;
  token: string;
  onProgress?: import("@truehire/core").IngestProgress;
}) {
  const { userId, login, token, onProgress } = params;

  const result = await ingestGitHubUser({ login, token, onProgress });

  await db.transaction(async (tx) => {
    // replace contributions
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

    // replace month buckets
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

    await tx
      .update(schema.users)
      .set({
        githubUsername: result.username,
        lastIngestedAt: new Date(),
        lastScoredAt: new Date(),
        ingestStatus: "idle",
        // If this is a real user-triggered refresh (path calls this), they're
        // authenticated by definition — mark claimed so seeded rows convert.
        claimed: true,
      })
      .where(eq(schema.users.id, userId));
  });
}

export function canRefresh(user: {
  lastIngestedAt: Date | null;
  ingestStatus: "idle" | "queued" | "running" | "failed";
}): boolean {
  if (!user.lastIngestedAt) return true;
  // Zombie recovery: if status has been stuck "running" for >3 min, prior run
  // was killed by lambda timeout. Let the caller retry.
  if (user.ingestStatus === "running" &&
      Date.now() - user.lastIngestedAt.getTime() >= 3 * 60_000) {
    return true;
  }
  if (user.ingestStatus === "failed") return true;
  return Date.now() - user.lastIngestedAt.getTime() >= INGEST_COOLDOWN_MS;
}
