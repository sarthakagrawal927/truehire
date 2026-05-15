import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardBody } from "@/components/atoms/card";
import {
  getLatestScore,
  getRecentlyClaimedUsers,
} from "@/lib/score-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recently claimed — TrueHire",
  description: "Newest verified GitHub profiles on TrueHire, newest first.",
};

export default async function RecentPage() {
  const users = await getRecentlyClaimedUsers(30);
  const enriched = await Promise.all(
    users.map(async (u) => ({
      user: u,
      score: await getLatestScore(u.id),
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← TrueHire
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Recently claimed</h1>
      <p className="mt-2 text-sm text-stone-500">
        Newest verified profiles. Every score below comes from public
        GitHub activity — see{" "}
        <Link href="/methodology" className="underline">/methodology</Link>.
      </p>

      {enriched.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-stone-500">
              No claimed profiles yet. Be the first — sign in with GitHub to
              create yours.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ol className="mt-6 divide-y divide-stone-200">
          {enriched.map(({ user, score }) => (
            <li key={user.id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/${user.githubUsername ?? user.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  @{user.githubUsername ?? user.id}
                </Link>
                {user.name && (
                  <span className="text-xs text-stone-500">{user.name}</span>
                )}
              </div>
              <div className="text-right text-xs tabular-nums">
                <div className="text-lg font-semibold text-stone-900">
                  {score?.overall ?? "—"}
                </div>
                <div className="text-stone-500">
                  joined{" "}
                  {(user.createdAt instanceof Date
                    ? user.createdAt
                    : new Date(user.createdAt)
                  )
                    .toISOString()
                    .slice(0, 10)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
