import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — TrueHire',
  description:
    'TrueHire converts verified GitHub activity into a transparent 0-100 score. No self-declared skills, no editable bios, no black-box ranking.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← TrueHire
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">About</h1>
      <p className="mt-4 text-sm leading-6 text-stone-700">
        TrueHire is a candidate platform that replaces self-described resumes with derived signal.
        Every number on a profile traces back to public, auditable GitHub activity.
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">Why</h2>
        <p>
          Resumes are self-reported. Job titles inflate. Bullet points get rewritten until they pass
          screening. The signal-to-noise for hiring early-career and mid-level engineers is brutal.
        </p>
        <p>
          The data needed to do better is right there, public, on GitHub — codebases, sustained
          contributions, peer recognition. We score it consistently and surface it transparently.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">How</h2>
        <ul className="list-disc space-y-1 pl-5 marker:text-stone-400">
          <li>
            <Link href="/methodology" className="underline">
              /methodology
            </Link>{' '}
            — the full algorithm with live weight constants.
          </li>
          <li>
            <Link href="/stats" className="underline">
              /stats
            </Link>{' '}
            — aggregate profile distribution.
          </li>
          <li>
            <Link href="/compare" className="underline">
              /compare
            </Link>{' '}
            — side-by-side score comparison.
          </li>
          <li>
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">/@handle/data.json</code> —
            portable JSON snapshot of any public profile.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">
          What we deliberately don&apos;t do
        </h2>
        <ul className="list-disc space-y-1 pl-5 marker:text-stone-400">
          <li>Accept self-declared skills, titles, or bios.</li>
          <li>Hide weights behind a black-box model.</li>
          <li>Score private contributions — only auditable signal counts.</li>
          <li>Maintain leaderboards or social ranking.</li>
        </ul>
      </section>
    </main>
  );
}
