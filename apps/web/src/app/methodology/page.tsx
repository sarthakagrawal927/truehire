import type { Metadata } from 'next';
import Link from 'next/link';

import { SCORING_CAPS, SCORING_HALF_LIVES, SCORING_WEIGHTS } from '@truehire/core';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';

export const metadata: Metadata = {
  title: 'Methodology — TrueHire',
  description:
    "How the TrueHire score is computed: weights, caps, half-lives, and the philosophy behind each axis. All numbers below are imported live from packages/core so the docs can't drift.",
};

const AXIS_DETAIL: Record<
  keyof typeof SCORING_WEIGHTS,
  { label: string; tagline: string; details: string[] }
> = {
  depth: {
    label: 'Depth',
    tagline: "How sustained is the contributor's GitHub work?",
    details: [
      `Counts months with at least one accepted contribution, capped at ${SCORING_CAPS.depthMonths} months.`,
      `Recent months weigh more — exponential decay with a ${SCORING_HALF_LIVES.depthMonths}-month half-life.`,
      'A contributor active for 5 years recently outscores someone with the same total but who stopped 4 years ago.',
    ],
  },
  breadth: {
    label: 'Breadth',
    tagline: 'How many distinct codebases?',
    details: [
      `Counts repos with ≥ 3 commits or ≥ 1 merged PR. Log-scaled and capped at ${SCORING_CAPS.breadthRepos} repos.`,
      "Drive-by single-commit contributions don't count — the floor exists to filter out noise.",
      'Polyglots and platform engineers benefit; single-project specialists are scored elsewhere on Specialization.',
    ],
  },
  recognition: {
    label: 'Recognition',
    tagline: 'Costly, externally verifiable signal.',
    details: [
      'log10(stars on authored repos) + log10(merged-PR credit to repos with ≥ 100★).',
      `Stars decay if a repo is no longer maintained — ${SCORING_HALF_LIVES.recognitionFreshnessMonths}-month freshness half-life. A 4-year-dead repo retains ~50% of its credit; an 8-year-dead one ~25%.`,
      "Carries the highest single weight because it's the hardest signal to fake or accidentally inflate.",
    ],
  },
  craft: {
    label: 'Craft',
    tagline: 'How does the work itself look?',
    details: [
      "Aggregated from PR review velocity, merged-vs-opened ratio, and signal-to-noise across the contributor's repos.",
      'Designed to complement Recognition, not replace it: someone with thoughtful PRs in obscure projects still earns Craft credit.',
    ],
  },
  specialization: {
    label: 'Specialization',
    tagline: 'Concentration in a primary language.',
    details: [
      'Piecewise on the dominant-language share of weighted contributions:',
      'Below 20% share → 0. Above 20% share → linear ramp to 100 at 100% share.',
      'Polyglots score low here on purpose — Breadth already rewards that profile.',
    ],
  },
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

type Axis = keyof typeof SCORING_WEIGHTS;

export default function MethodologyPage() {
  const weights = SCORING_WEIGHTS as Record<Axis, number>;
  const weightSum = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0);
  const sortedAxes = (Object.keys(weights) as Axis[]).sort((a, b) => weights[b] - weights[a]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
        <p className="mt-3 text-sm text-stone-600">
          The TrueHire score is derived from verified GitHub activity. There are no user-editable
          fields. Every number below is imported live from{' '}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">
            packages/core/src/scoring/score.ts
          </code>{' '}
          so this page can&apos;t disagree with the code.
        </p>
      </header>

      <section className="mb-10">
        <Card>
          <CardHeader>
            <CardTitle>The composite</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-stone-600">
              Each axis is computed independently on a 0–100 scale, then weighted into the overall
              score. Weights sum to{' '}
              <span className="font-medium tabular-nums">{weightSum.toFixed(2)}</span>.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2">Axis</th>
                  <th className="py-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {sortedAxes.map((axis) => (
                  <tr key={axis} className="border-b border-stone-100">
                    <td className="py-2 font-medium text-stone-800">{AXIS_DETAIL[axis].label}</td>
                    <td className="py-2 text-right tabular-nums text-stone-600">
                      {pct(weights[axis])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-6">
        {sortedAxes.map((axis) => {
          const detail = AXIS_DETAIL[axis];
          return (
            <Card key={axis}>
              <CardHeader>
                <CardTitle>
                  <span className="text-stone-900">{detail.label}</span>
                  <span className="ml-3 text-sm font-normal tabular-nums text-stone-500">
                    {pct(weights[axis])} weight
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm italic text-stone-600">{detail.tagline}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
                  {detail.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </section>

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Bonus: verified employment (Signal 2)</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-stone-600">
              Independent of the GitHub composite. Recruiters and former employers can confirm work
              history via a verification link (see{' '}
              <Link className="underline" href="/verify">
                /verify
              </Link>
              ); confirmed entries add a small bonus to the overall score. Unconfirmed entries are
              shown on the profile but contribute nothing.
            </p>
          </CardBody>
        </Card>
      </section>

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>What we deliberately don&apos;t measure</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc space-y-2 pl-5 text-sm text-stone-700">
              <li>
                <span className="font-medium">Self-declared skills, titles, or bios.</span> Profiles
                aren&apos;t user-editable. If a number isn&apos;t traceable to public GitHub data,
                it doesn&apos;t appear.
              </li>
              <li>
                <span className="font-medium">Generic boilerplate repos.</span> Common
                interview-prep / awesome-X / 100-days-of-X clones are downweighted heavily — their
                stars usually reflect topical interest, not the maintainer&apos;s craft.
              </li>
              <li>
                <span className="font-medium">Private contributions.</span> A core principle: the
                score is reproducible from public data. Anything you can&apos;t independently audit
                is excluded.
              </li>
            </ul>
          </CardBody>
        </Card>
      </section>

      <p className="mt-10 text-xs text-stone-500">
        Disagree with a weight or the framing? The full implementation is in{' '}
        <Link className="underline" href="https://github.com/sarthak-fleet/truehire">
          the repo
        </Link>{' '}
        — open a PR. Changes to any weight require a corresponding test update.
      </p>
    </main>
  );
}
