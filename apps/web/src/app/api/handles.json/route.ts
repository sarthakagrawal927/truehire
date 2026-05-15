import { db, schema } from "@truehire/db";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getLatestScore } from "@/lib/score-service";

export const dynamic = "force-dynamic";

/**
 * Public JSON dump of every claimed handle on TrueHire with its current
 * overall score. Powers third-party crawlers, recruiter dashboards, and
 * status boards.
 */
export async function GET() {
  const users = await db
    .select({
      id: schema.users.id,
      githubUsername: schema.users.githubUsername,
      claimed: schema.users.claimed,
      lastScoredAt: schema.users.lastScoredAt,
    })
    .from(schema.users)
    .where(eq(schema.users.claimed, true))
    .orderBy(desc(schema.users.createdAt))
    .limit(500);

  const handles = await Promise.all(
    users
      .filter((u) => u.githubUsername)
      .map(async (u) => {
        const score = await getLatestScore(u.id);
        return {
          handle: u.githubUsername,
          overall: score?.overall ?? null,
          lastScoredAt: u.lastScoredAt,
        };
      }),
  );

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      total: handles.length,
      handles,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    },
  );
}
