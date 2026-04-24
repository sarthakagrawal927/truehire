import { db, schema } from "@truehire/db";
import { and, eq, desc } from "drizzle-orm";
import { computeScore, ingestGitHubUser } from "@truehire/core";
import { computeSignal2, signal2OverallBonus } from "./verify-service";

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

export async function getPublicWorkHistory(userId: string) {
  const history = await db
    .select()
    .from(schema.workHistory)
    .where(eq(schema.workHistory.userId, userId));
  if (history.length === 0) return [];
  const verifications = await db
    .select()
    .from(schema.employerVerifications);
  const latestByWh = new Map<string, typeof verifications[number]>();
  // status priority: confirmed > pending > disputed > denied > expired, then recency
  const rank: Record<string, number> = {
    confirmed: 0, pending: 1, disputed: 2, denied: 3, expired: 4,
  };
  for (const v of verifications) {
    const prev = latestByWh.get(v.workHistoryId);
    if (!prev ||
        rank[v.status] < rank[prev.status] ||
        (rank[v.status] === rank[prev.status] &&
          v.requestedAt.getTime() > prev.requestedAt.getTime())) {
      latestByWh.set(v.workHistoryId, v);
    }
  }
  return history
    .map((h) => {
      const v = latestByWh.get(h.id) ?? null;
      return {
        company: h.company,
        title: h.title,
        startDate: h.startDate,
        endDate: h.endDate,
        status: v?.status ?? null,
        verifierDomain: v?.verifierDomain ?? null,
        respondedAt: v?.respondedAt?.getTime() ?? null,
      };
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
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
    const signal2 = await computeSignal2ForUser(tx, userId);
    const signal1 = breakdown.overall;
    const overall = Math.min(100, signal1 + signal2OverallBonus(signal2));

    await tx.insert(schema.scores).values({
      userId,
      computedAt: new Date(),
      overall,
      signal1,
      signal2,
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function computeSignal2ForUser(tx: Tx | typeof db, userId: string): Promise<number> {
  const history = await tx
    .select({
      id: schema.workHistory.id,
      startDate: schema.workHistory.startDate,
      endDate: schema.workHistory.endDate,
    })
    .from(schema.workHistory)
    .where(eq(schema.workHistory.userId, userId));
  if (history.length === 0) return 0;

  const confirmed = await tx
    .select({ workHistoryId: schema.employerVerifications.workHistoryId })
    .from(schema.employerVerifications)
    .where(eq(schema.employerVerifications.status, "confirmed"));
  const confirmedSet = new Set(confirmed.map((r) => r.workHistoryId));

  return computeSignal2({
    workHistory: history,
    confirmedVerifications: history
      .map((h) => h.id)
      .filter((id) => confirmedSet.has(id)),
  });
}

/**
 * Recompute + persist just the Signal 2 slice of a user's score without
 * re-running the expensive GitHub ingest. Called after a verification is
 * confirmed/denied so the profile reflects the new state immediately.
 */
export async function recomputeSignal2OnVerificationChange(userId: string) {
  const latest = await getLatestScore(userId);
  if (!latest) return; // user hasn't had Signal 1 computed yet; nothing to blend into.
  const signal2 = await computeSignal2ForUser(db, userId);
  const signal1 = latest.signal1 || latest.overall; // fallback for legacy rows
  const overall = Math.min(100, signal1 + signal2OverallBonus(signal2));
  await db.insert(schema.scores).values({
    ...latest,
    computedAt: new Date(),
    overall,
    signal1,
    signal2,
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
