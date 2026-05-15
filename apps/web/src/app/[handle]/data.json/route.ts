import { NextResponse } from "next/server";

import {
  getActivityMonths,
  getLatestScore,
  getPublicWorkHistory,
  getUserByUsername,
} from "@/lib/score-service";

export const dynamic = "force-dynamic";

/**
 * Public JSON export of a profile. Returns the same shape used by the
 * /@handle page so anyone (recruiters, the candidate themselves) can
 * pull a portable snapshot without scraping HTML.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle: raw } = await ctx.params;
  const handle = raw.startsWith("@") ? raw.slice(1) : raw;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(handle)) {
    return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
  }

  const user = await getUserByUsername(handle);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [score, months, work] = await Promise.all([
    getLatestScore(user.id),
    getActivityMonths(user.id),
    getPublicWorkHistory(user.id),
  ]);

  return NextResponse.json(
    {
      handle,
      githubId: user.githubId,
      lastScoredAt: user.lastScoredAt,
      lastIngestedAt: user.lastIngestedAt,
      claimed: user.claimed,
      score,
      activityMonths: months,
      workHistory: work,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
