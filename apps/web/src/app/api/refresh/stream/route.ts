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
import {
  canRefresh,
  getGitHubAccessToken,
  getUserById,
  refreshUserScore,
} from "@/lib/score-service";

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
        await db
          .update(schema.users)
          .set({ ingestStatus: "failed" })
          .where(eq(schema.users.id, user.id));
        send("error", { message: e instanceof Error ? e.message : "ingest_failed" });
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
