import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, schema } from '@truehire/db';
import { eq } from 'drizzle-orm';
import { GitHubIngestError } from '@truehire/core';
import {
  beginRefresh,
  canRefresh,
  getGitHubAccessToken,
  getUserById,
  refreshUserScore,
} from '@/lib/score-service';

/** Maps an ingest failure to a user-safe message + HTTP status. */
function ingestFailureResponse(e: unknown) {
  if (e instanceof GitHubIngestError) {
    if (e.reason === 'rate_limited') {
      return {
        status: 429,
        body: {
          error: 'github_rate_limited',
          message:
            "GitHub's rate limit was hit while reading your profile. Please try again in a few minutes.",
        },
      };
    }
    if (e.reason === 'auth') {
      return {
        status: 401,
        body: {
          error: 'github_auth',
          message: 'GitHub rejected the connection. Sign out and reconnect GitHub, then try again.',
        },
      };
    }
    if (e.reason === 'not_found') {
      return {
        status: 404,
        body: {
          error: 'github_not_found',
          message: "We couldn't find that GitHub profile.",
        },
      };
    }
    return {
      status: 502,
      body: {
        error: 'github_unavailable',
        message:
          "GitHub didn't respond in time. Your saved score is unchanged — try again shortly.",
      },
    };
  }
  return {
    status: 500,
    body: {
      error: 'ingest_failed',
      message: 'Something went wrong while refreshing your score. Try again shortly.',
    },
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Ingest can take up to ~90s on heavy GitHub profiles; keep this route explicit
// so the dashboard does not get stuck mid-refresh.
export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: 'no user' }, { status: 404 });
  if (!user.githubUsername) {
    return NextResponse.json({ error: 'no github username on profile' }, { status: 400 });
  }
  if (!canRefresh(user)) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Refreshes are limited to once per 24h.',
        retryAfter: user.lastIngestedAt,
      },
      { status: 429 }
    );
  }

  const token = (await getGitHubAccessToken(user.id)) ?? process.env.GITHUB_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'no_github_token' }, { status: 400 });
  }

  if (!(await beginRefresh(user))) {
    return NextResponse.json(
      {
        error: 'ingest_in_progress',
        message: 'A refresh already started for this profile. Try again shortly.',
      },
      { status: 409 }
    );
  }

  // `lastIngestedAt` marks run start — `canRefresh` relies on it for the
  // 3-minute zombie-recovery window, so a concurrent second request can't
  // kick off a duplicate ingest while this one is still running.
  await db
    .update(schema.users)
    .set({ ingestStatus: 'running', lastIngestedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  try {
    await refreshUserScore({
      userId: user.id,
      login: user.githubUsername,
      token,
    });
  } catch (e: unknown) {
    console.error('refreshUserScore failed', e);
    await db
      .update(schema.users)
      .set({ ingestStatus: 'failed' })
      .where(eq(schema.users.id, user.id));
    const { status, body } = ingestFailureResponse(e);
    return NextResponse.json(body, { status });
  }

  return NextResponse.json({ ok: true });
}
