import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { getLatestScore, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare profiles — TrueHire',
  description:
    'Side-by-side TrueHire score comparison. Verified GitHub activity, no self-declared inputs.',
};

interface Stripped {
  handle: string;
  overall: number;
  signal1: number;
  signal2: number;
  depth: number;
  breadth: number;
  recognition: number;
  craft: number;
  specialization: number;
}

async function load(
  rawHandle: string
): Promise<Stripped | { error: 'handle' | 'not_found' | 'no_score' }> {
  const clean = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) return { error: 'handle' };
  const user = await getUserByUsername(clean);
  if (!user) return { error: 'not_found' };
  const score = await getLatestScore(user.id);
  if (!score) return { error: 'no_score' };
  return {
    handle: clean,
    overall: score.overall,
    signal1: score.signal1,
    signal2: score.signal2,
    depth: score.depth,
    breadth: score.breadth,
    recognition: score.recognition,
    craft: score.craft,
    specialization: score.specialization,
  };
}

function isErr(
  x: Awaited<ReturnType<typeof load>>
): x is { error: 'handle' | 'not_found' | 'no_score' } {
  return 'error' in x;
}

type SearchParams = { a?: string | string[]; b?: string | string[] };

function first(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const a = first(sp.a);
  const b = first(sp.b);

  if (!a || !b) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Compare profiles</h1>
        <p className="mt-3 text-sm text-stone-600">
          Pass two GitHub handles in the query string to render a side-by-side score comparison.
        </p>
        <pre className="mt-6 rounded-md bg-stone-100 p-4 font-mono text-xs">
          /compare?a=alice&amp;b=bob
        </pre>
      </main>
    );
  }

  const [pa, pb] = await Promise.all([load(a), load(b)]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
        <p className="mt-2 text-sm text-stone-500">
          Scores are derived from public GitHub activity only. See{' '}
          <Link href="/methodology" className="underline">
            /methodology
          </Link>{' '}
          for the algorithm.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {[pa, pb].map((p, i) => (
          <ProfileColumn key={i} handle={i === 0 ? a : b} data={p} />
        ))}
      </div>
    </main>
  );
}

function ProfileColumn({
  handle,
  data,
}: {
  handle: string;
  data: Stripped | { error: 'handle' | 'not_found' | 'no_score' };
}) {
  if (isErr(data)) {
    const msg =
      data.error === 'handle'
        ? 'Invalid handle format.'
        : data.error === 'not_found'
          ? 'No TrueHire profile for this handle yet.'
          : "Profile exists but hasn't been scored yet.";
    return (
      <Card>
        <CardHeader>
          <CardTitle>@{handle}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-stone-500">{msg}</p>
        </CardBody>
      </Card>
    );
  }
  const rows: Array<{ label: string; key: keyof Stripped }> = [
    { label: 'Overall', key: 'overall' },
    { label: 'GitHub composite', key: 'signal1' },
    { label: 'Verified employment', key: 'signal2' },
    { label: 'Recognition', key: 'recognition' },
    { label: 'Depth', key: 'depth' },
    { label: 'Craft', key: 'craft' },
    { label: 'Breadth', key: 'breadth' },
    { label: 'Specialization', key: 'specialization' },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={`/${handle}`} className="hover:underline">
            @{handle}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-stone-100">
                <td className="py-2 text-stone-600">{r.label}</td>
                <td className="py-2 text-right font-medium tabular-nums">{data[r.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
