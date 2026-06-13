/**
 * Streaming ingest endpoint — Server-Sent Events.
 *
 * Emits one SSE message per phase the ingest pipeline completes, so the UI
 * can render a live progress rail. Closes with `event: done` once everything
 * (GitHub pull + scoring + persistence) is saved.
 *
 * We use SSE instead of WebSockets because:
 *   - No additional infrastructure.
 *   - Vercel Node runtime supports response streaming out of the box.
 *   - It's strictly one-way, which is all we need here.
 */
import { auth } from "@/lib/auth";
import { db, schema } from "@truehire/db";
import { eq } from "drizzle-orm";
import { GitHubIngestError } from "@truehire/core";
import {
  beginRefresh,
  canRefresh,
  getGitHubAccessToken,
  getUserById,
  refreshUserScore,
} from "@/lib/score-service";

/** User-safe message + reason for an SSE `error` event. */
function ingestFailurePayload(e: unknown) {
  if (e instanceof GitHubIngestError) {
    if (e.reason === "rate_limited") {
      return {
        reason: "rate_limited",
        message:
          "GitHub's rate limit was hit while reading your profile. Try again in a few minutes.",
      };
    }
    if (e.reason === "auth") {
      return {
        reason: "auth",
        message: "GitHub rejected the connection. Reconnect GitHub and try again.",
      };
    }
    if (e.reason === "not_found") {
      return { reason: "not_found", message: "We couldn't find that GitHub profile." };
    }
    return {
      reason: "unavailable",
      message:
        "GitHub didn't respond in time. Your saved score is unchanged — try again shortly.",
    };
  }
  return {
    reason: "ingest_failed",
    message: "Something went wrong while refreshing your score. Try again shortly.",
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const user = await getUserById(session.user.id);
  if (!user?.githubUsername) {
    return new Response("no_profile", { status: 400 });
  }
  if (!canRefresh(user)) {
    return new Response("rate_limited", { status: 429 });
  }
  const token = (await getGitHubAccessToken(user.id)) ?? process.env.GITHUB_API_TOKEN;
  if (!token) return new Response("no_token", { status: 400 });

  if (!(await beginRefresh(user))) {
    return new Response("refresh_in_progress", { status: 409 });
  }

  await db
    .update(schema.users)
    .set({ ingestStatus: "running", lastIngestedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("phase", { type: "starting", message: "Starting", pct: 2 });

      try {
        await refreshUserScore({
          userId: user.id,
          login: user.githubUsername!,
          token,
          onProgress: (phase) => send("phase", phase),
        });
        send("phase", { type: "scoring", message: "Computing score", pct: 98 });
        send("done", { ok: true });
      } catch (e: unknown) {
        console.error("refreshUserScore (stream) failed", e);
        await db
          .update(schema.users)
          .set({ ingestStatus: "failed" })
          .where(eq(schema.users.id, user.id));
        send("error", ingestFailurePayload(e));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
