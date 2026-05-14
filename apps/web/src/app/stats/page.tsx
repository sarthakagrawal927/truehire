import type { Metadata } from "next";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { getFleetStats } from "@/lib/stats-service";

export const metadata: Metadata = {
  title: "Stats — TrueHire",
  description:
    "Aggregate stats across TrueHire profiles. Score distribution, top languages, transparent benchmarks.",
};

// Recompute on each request — cheap query, and stats should reflect new
// claims/refreshes promptly.
export const dynamic = "force-dynamic";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function StatsPage() {
  const stats = await getFleetStats();

  if (stats.totalProfiles === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Stats</h1>
        <p className="mt-4 text-sm text-stone-500">
          No profiles have been scored yet. Once a few users sign in,
          aggregate stats will appear here.
        </p>
      </main>
    );
  }

  const maxBucketCount = Math.max(...stats.scoreBuckets.map((b) => b.count), 1);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Stats</h1>
        <p className="mt-2 text-sm text-stone-500">
          Aggregate view across all TrueHire profiles. Scores are derived from
          public GitHub activity using the same algorithm documented in the README.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Profiles scored" value={formatNumber(stats.totalProfiles)} />
        <StatCard label="Mean score" value={String(stats.meanScore)} />
        <StatCard label="Median score" value={String(stats.medianScore)} />
        <StatCard label="Max score" value={String(stats.maxScore)} />
      </section>

      <section className="mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {stats.scoreBuckets.map((b) => (
                <div key={b.bucket} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-right tabular-nums text-stone-500">
                    {b.bucket}
                  </span>
                  <div
                    className="h-3 rounded-sm bg-emerald-500"
                    style={{ width: `${Math.max(2, (b.count / maxBucketCount) * 100)}%` }}
                    aria-label={`${b.count} profiles in ${b.bucket}`}
                  />
                  <span className="w-12 tabular-nums text-stone-600">{b.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500 tabular-nums">
              p25: {stats.p25Score} · p75: {stats.p75Score}
            </p>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Top languages by profile count</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.topLanguages.length === 0 ? (
              <p className="text-sm text-stone-500">No language data yet.</p>
            ) : (
              <ol className="divide-y divide-stone-200">
                {stats.topLanguages.map((l, i) => (
                  <li
                    key={l.language}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 text-right tabular-nums text-stone-400">
                        {i + 1}
                      </span>
                      <span className="font-medium text-stone-800">{l.language}</span>
                    </span>
                    <span className="tabular-nums text-stone-500">
                      {l.profiles} profile{l.profiles === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
    </div>
  );
}
