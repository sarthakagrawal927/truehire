import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms — TrueHire',
  description: 'Use of TrueHire is provided as-is; scoring is derived from public GitHub data.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-stone-700">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← TrueHire
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">Terms</h1>
      <p className="mt-4 text-xs text-stone-500">Last updated: 2026-05-15.</p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">The service</h2>
      <p className="mt-2">
        TrueHire derives a 0&ndash;100 score from public GitHub activity. The algorithm, weights,
        and caps are documented at{' '}
        <Link href="/methodology" className="underline">
          /methodology
        </Link>
        . The score is a signal — not a hiring decision.
      </p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">Use of the API</h2>
      <p className="mt-2">
        Public JSON endpoints (<code>/@handle/data.json</code>, the sitemap, and friends) are free
        to use for personal and commercial purposes. Be polite about rate — heavy automated traffic
        without coordination may be throttled.
      </p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">No warranty</h2>
      <p className="mt-2">
        TrueHire is provided as-is. We don&apos;t guarantee scores are free of bugs, the algorithm
        is &ldquo;fair&rdquo; for any specific candidate, or that the data is fully fresh.
      </p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">Changes</h2>
      <p className="mt-2">
        We may change weights, caps, or the underlying algorithm. Any change is reflected
        immediately on{' '}
        <Link href="/methodology" className="underline">
          /methodology
        </Link>{' '}
        because the page renders live constants from the code.
      </p>
    </main>
  );
}
