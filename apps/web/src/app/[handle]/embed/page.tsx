import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getLatestScore, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

type Params = { handle: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  return {
    title: `${clean} · TrueHire`,
    description: `Embeddable TrueHire score card for @${clean}.`,
    robots: { index: false },
  };
}

const AXES: Array<{
  key: 'depth' | 'breadth' | 'recognition' | 'craft' | 'specialization';
  label: string;
}> = [
  { key: 'recognition', label: 'Recognition' },
  { key: 'depth', label: 'Depth' },
  { key: 'craft', label: 'Craft' },
  { key: 'breadth', label: 'Breadth' },
  { key: 'specialization', label: 'Specialization' },
];

/**
 * /[handle]/embed — chromeless card meant to live inside an iframe on a
 * blog post or landing page. Same data as the public profile page, no nav,
 * no footer, no auth, friendly to any width.
 */
export default async function ProfileEmbed({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) notFound();
  const user = await getUserByUsername(clean);
  if (!user) notFound();
  const score = await getLatestScore(user.id);

  return (
    <main className="min-h-screen bg-transparent p-3">
      <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <header className="flex items-baseline justify-between gap-3">
          <a
            href={`/${clean}`}
            target="_top"
            className="text-base font-semibold text-stone-900 hover:underline"
          >
            @{clean}
          </a>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            TrueHire
          </span>
        </header>
        <div className="mt-3 flex items-baseline gap-3">
          <p className="text-5xl font-semibold tabular-nums text-stone-900">
            {score?.overall ?? '—'}
          </p>
          <p className="text-sm text-stone-500">/ 100 overall</p>
        </div>
        {score ? (
          <dl className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
            {AXES.map((a) => (
              <div key={a.key} className="rounded-md bg-stone-50 p-2">
                <dt className="text-[10px] uppercase tracking-wide text-stone-500">{a.label}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-stone-900">{score[a.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-xs text-stone-500">No score yet.</p>
        )}
        <footer className="mt-4 flex items-center justify-between text-xs">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- target=_top intentional for iframe escape */}
          <a href="/methodology" target="_top" className="text-stone-500 hover:underline">
            methodology
          </a>
          <a href={`/${clean}`} target="_top" className="text-stone-500 hover:underline">
            full profile →
          </a>
        </footer>
      </article>
    </main>
  );
}
