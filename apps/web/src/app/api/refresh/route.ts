import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@truehire/db";
import { eq } from "drizzle-orm";
import {
  canRefresh,
  getGitHubAccessToken,
  getUserById,
  refreshUserScore,
} from "@/lib/score-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Ingest can take up to ~90s on heavy GitHub profiles. Default 10s Vercel
// timeout kills the promise before it finishes → dashboard stuck on "scoring…".
export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "no user" }, { status: 404 });
  if (!user.githubUsername) {
    return NextResponse.json({ error: "no github username on profile" }, { status: 400 });
  }
  if (!canRefresh(user)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Refreshes are limited to once per 24h.",
        retryAfter: user.lastIngestedAt,
      },
      { status: 429 },
    );
  }

  const token = (await getGitHubAccessToken(user.id)) ?? process.env.GITHUB_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "no_github_token" }, { status: 400 });
  }

  await db
    .update(schema.users)
    .set({ ingestStatus: "running" })
    .where(eq(schema.users.id, user.id));

  try {
    await refreshUserScore({
      userId: user.id,
      login: user.githubUsername,
      token,
    });
  } catch (e: any) {
    await db
      .update(schema.users)
      .set({ ingestStatus: "failed" })
      .where(eq(schema.users.id, user.id));
    return NextResponse.json(
      { error: "ingest_failed", message: e?.message ?? "unknown" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
