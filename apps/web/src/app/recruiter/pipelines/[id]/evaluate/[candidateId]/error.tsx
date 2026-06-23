'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { captureError } from '@/lib/foundry-monitoring';

export default function EvaluationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    captureError(error, { scope: 'recruiter', digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold">Couldn&apos;t load this review</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Something went wrong while loading the candidate workspace. Your saved evaluations are
            safe — try again or return to the pipeline.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
            >
              Try again
            </button>
            <Link
              href="/recruiter/pipelines"
              className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
            >
              Back to pipelines
            </Link>
          </div>
          {error.digest ? (
            <p className="mt-6 text-xs text-[var(--muted-2)]">Reference: {error.digest}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
