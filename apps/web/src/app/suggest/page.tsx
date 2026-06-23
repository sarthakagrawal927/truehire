import type { Metadata } from 'next';
import Link from 'next/link';

import { SCORING_CAPS, SCORING_HALF_LIVES, SCORING_WEIGHTS } from '@truehire/core';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { getLatestScore, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Suggestions — TrueHire',
  description:
    'Where you stand on each scoring axis and which axis would push your overall up the most.',
};

interface Axis {
  key: 'depth' | 'breadth' | 'recognition' | 'craft' | 'specialization';
  label: string;
  value: number;
  weight: number;
  marginalLift: number;
  hint: string;
}

const HINTS: Record<Axis['key'], string> = {
  depth:
    'Keep contributing this month — recency is weighted with a 30-month half-life. Streaks of small commits in real projects beat one-off bursts.',
  breadth:
    'Push to a wider set of repos that you reach the 3-commit threshold on. A few merged PRs across different projects also count.',
  recognition:
    'This axis is the slowest to move. Best path is to ship something other people star — quality public output, not stars-for-stars.',
  craft:
    'Tighter PRs (smaller, faster turnaround, more merged than opened) lift this. Sustained review activity counts too.',
  specialization:
    'Lean into your dominant language. Specialization rewards focus above the 20% share floor; polyglots score lower here on purpose — Breadth picks them up.',
};

function first(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string | string[] }>;
}) {
  const sp = await searchParams;
  const handleRaw = first(sp.handle);

  if (!handleRaw) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Score suggestions</h1>
        <p className="mt-3 text-sm text-stone-600">
          Pass your GitHub handle in the query string to see which axis would push your overall
          score up the most.
        </p>
        <pre className="mt-6 rounded-md bg-stone-100 p-4 font-mono text-xs">
          /suggest?handle=torvalds
        </pre>
        <p className="mt-6 text-xs text-stone-500">
          See{' '}
          <Link href="/methodology" className="underline">
            /methodology
          </Link>{' '}
          for the algorithm being used.
        </p>
      </main>
    );
  }

  const handle = handleRaw.startsWith('@') ? handleRaw.slice(1) : handleRaw;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(handle)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm text-stone-600">Invalid handle.</p>
      </main>
    );
  }

  const user = await getUserByUsername(handle);
  const score = user ? await getLatestScore(user.id) : null;

  if (!score) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">@{handle}</h1>
        <p className="mt-3 text-sm text-stone-600">
          No score yet for that handle. Sign in to claim and score the profile, or open{' '}
          <Link href={`/${handle}`} className="underline">
            /{handle}
          </Link>{' '}
          to seed the ingest.
        </p>
      </main>
    );
  }

  const axes: Axis[] = (
    [
      ['recognition', 'Recognition'],
      ['depth', 'Depth'],
      ['craft', 'Craft'],
      ['breadth', 'Breadth'],
      ['specialization', 'Specialization'],
    ] as Array<[Axis['key'], string]>
  ).map(([key, label]) => {
    const value = score[key];
    const weight = SCORING_WEIGHTS[key];
    // Marginal lift = how much (100 - current) * weight is left on this axis.
    // Highest = the axis with most weighted headroom.
    const marginalLift = (100 - value) * weight;
    return { key, label, value, weight, marginalLift, hint: HINTS[key] };
  });

  const ranked = [...axes].sort((a, b) => b.marginalLift - a.marginalLift);
  const top = ranked[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${handle}`} className="text-xs text-stone-500 hover:underline">
        ← @{handle}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Where your score has the most headroom
      </h1>
      <p className="mt-3 text-sm text-stone-600">
        Current overall: <span className="font-medium tabular-nums">{score.overall}</span>. The
        biggest weighted gap is on <strong>{top.label}</strong> — pushing it up has the most
        leverage on your overall.
      </p>

      <section className="mt-8 space-y-3">
        {ranked.map((a, i) => (
          <Card key={a.key}>
            <CardHeader>
              <CardTitle>
                <span className="mr-2 inline-block w-5 text-right tabular-nums text-stone-400">
                  {i + 1}.
                </span>
                {a.label}
                <span className="ml-2 text-xs font-normal text-stone-500 tabular-nums">
                  {a.value} / 100 · weight {Math.round(a.weight * 100)}% · weighted gap{' '}
                  {a.marginalLift.toFixed(1)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-stone-700">{a.hint}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <p className="mt-8 text-xs text-stone-500">
        Caps live at depth ≤ {SCORING_CAPS.depthMonths} months, breadth ≤{' '}
        {SCORING_CAPS.breadthRepos} repos, recognition ≤ {SCORING_CAPS.recognition} (log scale).
        Recognition freshness half-life: {SCORING_HALF_LIVES.recognitionFreshnessMonths} months.
      </p>
    </main>
  );
}
