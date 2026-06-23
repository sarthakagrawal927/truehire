import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { getScoreHistory, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

type Params = { handle: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  return {
    title: `${clean} · score history · TrueHire`,
    description: `Per-recompute TrueHire score history for @${clean}.`,
  };
}

interface HistoryRow {
  computedAt: Date;
  overall: number;
  signal1: number;
  signal2: number;
  depth: number;
  breadth: number;
  recognition: number;
  craft: number;
  specialization: number;
}

export default async function HistoryPage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) notFound();
  const user = await getUserByUsername(clean);
  if (!user) notFound();
  const raw = (await getScoreHistory(user.id, 60)) as unknown as HistoryRow[];
  const rows = [...raw].reverse(); // oldest → newest for the chart

  if (rows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link href={`/${clean}`} className="text-xs text-stone-500 hover:underline">
          ← @{clean}
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Score history</h1>
        <p className="mt-3 text-sm text-stone-600">
          No score snapshots yet for @{clean}. Scores are written each time the profile is
          refreshed.
        </p>
      </main>
    );
  }

  const max = Math.max(...rows.map((r) => r.overall), 100);
  const min = Math.min(...rows.map((r) => r.overall), 0);

  // SVG sparkline geometry.
  const W = 720;
  const H = 200;
  const pad = 24;
  const stepX = rows.length > 1 ? (W - pad * 2) / (rows.length - 1) : 0;
  const yOf = (v: number) => H - pad - ((v - min) / Math.max(1, max - min)) * (H - pad * 2);
  const path = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * stepX} ${yOf(r.overall)}`)
    .join(' ');

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${clean}`} className="text-xs text-stone-500 hover:underline">
        ← @{clean}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Score history</h1>
      <p className="mt-2 text-sm text-stone-500">
        {rows.length} snapshot{rows.length === 1 ? '' : 's'} — most recent on the right.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Overall</CardTitle>
        </CardHeader>
        <CardBody>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Overall score over time"
          >
            <rect x={0} y={0} width={W} height={H} fill="transparent" />
            <line
              x1={pad}
              y1={H - pad}
              x2={W - pad}
              y2={H - pad}
              stroke="#e7e5e4"
              strokeWidth={1}
            />
            <path d={path} fill="none" stroke="#059669" strokeWidth={2} />
            {rows.map((r, i) => (
              <circle
                key={
                  r.computedAt instanceof Date ? r.computedAt.toISOString() : String(r.computedAt)
                }
                cx={pad + i * stepX}
                cy={yOf(r.overall)}
                r={3}
                fill="#059669"
              />
            ))}
          </svg>
          <p className="mt-3 text-xs text-stone-500 tabular-nums">
            min {min} · max {max} · latest {rows[rows.length - 1]?.overall}
          </p>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
        </CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2">Computed</th>
                <th className="py-2 text-right">Overall</th>
                <th className="py-2 text-right">Recognition</th>
                <th className="py-2 text-right">Depth</th>
                <th className="py-2 text-right">Craft</th>
                <th className="py-2 text-right">Breadth</th>
                <th className="py-2 text-right">Spec</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => {
                const d = r.computedAt instanceof Date ? r.computedAt : new Date(r.computedAt);
                return (
                  <tr key={d.toISOString()} className="border-b border-stone-100">
                    <td className="py-1.5 text-stone-600">{d.toISOString().slice(0, 10)}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{r.overall}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.recognition}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.depth}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.craft}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.breadth}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.specialization}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </main>
  );
}
