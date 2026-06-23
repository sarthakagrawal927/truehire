import Link from 'next/link';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  GitCompareArrows,
  Search,
  UsersRound,
} from 'lucide-react';
import {
  buildShortlistComparisonReport,
  type ShortlistCandidateComparison,
  type ShortlistCandidateInput,
} from '@truehire/core';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { getLatestScore, getUserByUsername } from '@/lib/score-service';
import type { EvidenceEntry, ScoreBreakdown } from '@truehire/core';
import { ExportReportButton } from './export-report-button';
import { JdEvaluator } from '@/components/molecules/jd-evaluator';

type SearchParams = {
  handles?: string | string[];
  jd?: string | string[];
};

type MissingCandidate = {
  handle: string;
  reason: 'not_found' | 'no_score';
};

export const dynamic = 'force-dynamic';

export default async function RecruiterShortlistPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const rawHandles = getFirst(searchParams.handles);
  const jobDescription = getFirst(searchParams.jd).trim();
  const handles = parseHandles(rawHandles);
  const loaded = jobDescription ? await loadCandidates(handles) : { candidates: [], missing: [] };
  const comparison =
    jobDescription && loaded.candidates.length > 0
      ? buildShortlistComparisonReport({
          jobDescription,
          candidates: loaded.candidates,
        })
      : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <GitCompareArrows className="h-4 w-4" />
            Recruiter shortlist
          </div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
            Compare verified candidates against one role.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Paste a shortlist of TrueHire handles and a job description. The dashboard ranks
            candidates by role fit, evidence coverage, gaps, and their verified public-work score.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/recruiter/resume-audit/demo">
            <Button variant="secondary" size="sm" leftIcon={<FileSearch className="h-4 w-4" />}>
              Resume audit demo
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<BriefcaseBusiness className="h-4 w-4" />}
            >
              Candidate dashboard
            </Button>
          </Link>
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Build comparison</CardTitle>
          <Badge tone="outline">2-8 handles</Badge>
        </CardHeader>
        <CardBody>
          <form
            className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_auto]"
            action="/recruiter/shortlist"
          >
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Candidate handles</span>
              <textarea
                name="handles"
                rows={5}
                required
                defaultValue={rawHandles}
                placeholder="@octocat, torvalds, gaearon"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Job description</span>
              <textarea
                name="jd"
                rows={5}
                required
                minLength={40}
                defaultValue={jobDescription}
                placeholder="Senior TypeScript product engineer with React, API ownership, testing, CI, and documentation..."
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" leftIcon={<Search className="h-4 w-4" />}>
                Compare
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {!jobDescription ? (
        <EmptyShortlist />
      ) : comparison ? (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-[var(--muted)]">
              Share this dashboard from the current URL, or export it as a PDF from the print
              dialog.
            </div>
            <ExportReportButton />
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Candidates" value={comparison.summary.candidateCount} />
            <Metric label="Avg fit" value={`${comparison.summary.averageFitScore}/100`} />
            <Metric label="Best fit" value={comparison.summary.topCandidateHandle ?? '-'} />
            <Metric
              label="Shared strength"
              value={comparison.summary.strongestRequirement ?? '-'}
            />
            <Metric label="Common gap" value={comparison.summary.commonGap ?? '-'} />
          </section>

          {loaded.missing.length > 0 && <MissingCandidates candidates={loaded.missing} />}

          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle>Ranked comparison</CardTitle>
              <Badge tone="verified">verified evidence only</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Rank</th>
                    <th className="px-5 py-3 font-medium">Candidate</th>
                    <th className="px-5 py-3 font-medium">Fit</th>
                    <th className="px-5 py-3 font-medium">Verified</th>
                    <th className="px-5 py-3 font-medium">Gaps</th>
                    <th className="px-5 py-3 font-medium">TrueHire</th>
                    <th className="px-5 py-3 font-medium">Freshness</th>
                    <th className="px-5 py-3 font-medium">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {comparison.candidates.map((candidate) => (
                    <CandidateRow key={candidate.handle} candidate={candidate} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {comparison.candidates.map((candidate) => (
              <CandidateCard key={candidate.handle} candidate={candidate} />
            ))}
          </section>
        </>
      ) : (
        <Card className="mt-8">
          <CardBody className="p-8 text-center">
            <UsersRound className="mx-auto h-6 w-6 text-[var(--muted)]" />
            <div className="mt-3 text-lg font-semibold">No scored profiles found</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Enter public TrueHire handles that have completed GitHub scoring.
            </p>
            {loaded.missing.length > 0 && <MissingCandidates candidates={loaded.missing} />}
          </CardBody>
        </Card>
      )}
    </main>
  );
}

async function loadCandidates(handles: string[]) {
  const candidates: ShortlistCandidateInput[] = [];
  const missing: MissingCandidate[] = [];

  for (const handle of handles) {
    const user = await getUserByUsername(handle);
    if (!user) {
      missing.push({ handle, reason: 'not_found' });
      continue;
    }

    const score = await getLatestScore(user.id);
    if (!score) {
      missing.push({ handle, reason: 'no_score' });
      continue;
    }

    candidates.push({
      handle: user.githubUsername ?? handle,
      name: user.name,
      profileUrl: `/${encodeURIComponent(user.githubUsername ?? handle)}`,
      overallScore: score.overall,
      signal1: score.signal1 || score.overall,
      signal2: score.signal2,
      totalRepos: score.totalRepos,
      monthsActive: score.monthsActive,
      computedAt: score.computedAt,
      evidence: JSON.parse(score.evidenceJson) as EvidenceEntry[],
      languages: JSON.parse(score.languagesJson) as ScoreBreakdown['languages'],
    });
  }

  return { candidates, missing };
}

function CandidateRow({ candidate }: { candidate: ShortlistCandidateComparison }) {
  return (
    <tr>
      <td className="num px-5 py-4 text-lg font-semibold">#{candidate.rank}</td>
      <td className="px-5 py-4">
        <div className="font-medium">{candidate.name ?? candidate.handle}</div>
        <div className="num mt-1 text-[12px] text-[var(--muted)]">@{candidate.handle}</div>
      </td>
      <td className="num px-5 py-4 text-lg font-semibold">{candidate.report.fitScore}</td>
      <td className="num px-5 py-4">{candidate.report.summary.verifiedRequirements}</td>
      <td className="num px-5 py-4">{candidate.report.summary.gapCount}</td>
      <td className="num px-5 py-4">{candidate.overallScore}</td>
      <td className="px-5 py-4 text-[12px] text-[var(--muted)]">
        {formatRelative(new Date(candidate.computedAt))}
      </td>
      <td className="px-5 py-4">
        <Link
          href={candidate.profileUrl}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function CandidateCard({ candidate }: { candidate: ShortlistCandidateComparison }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          #{candidate.rank} · @{candidate.handle}
        </CardTitle>
        <Badge tone={candidate.rank === 1 ? 'verified' : 'outline'}>
          {candidate.report.fitScore}/100 fit
        </Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Score" value={candidate.overallScore} />
          <MiniStat label="Repos" value={candidate.totalRepos} />
          <MiniStat label="Months" value={candidate.monthsActive} />
          <MiniStat label="Updated" value={formatRelative(new Date(candidate.computedAt))} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--muted)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--verified)]" />
              Top strengths
            </div>
            <div className="space-y-2">
              {candidate.topStrengths.length === 0 ? (
                <EmptyLine label="No role-specific strengths matched." />
              ) : (
                candidate.topStrengths.map((strength) => {
                  const topEvidence = strength.strengths[0];
                  return (
                    <EvidencePill
                      key={strength.requirement.id}
                      label={strength.requirement.label}
                      detail={topEvidence ? strongestEvidenceLabel(topEvidence) : undefined}
                      score={strength.score}
                      tone="verified"
                    />
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--muted)]">
              <CircleAlert className="h-4 w-4 text-[var(--warn)]" />
              Watch areas
            </div>
            <div className="space-y-2">
              {candidate.topGaps.length === 0 ? (
                <EmptyLine label="No major gaps found." />
              ) : (
                candidate.topGaps.map((gap) => (
                  <EvidencePill
                    key={gap.requirement.id}
                    label={gap.requirement.label}
                    score={gap.score}
                    tone="outline"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function MissingCandidates({ candidates }: { candidates: MissingCandidate[] }) {
  return (
    <Card className="mt-6 border-[color:color-mix(in_srgb,var(--warn)_30%,var(--border))]">
      <CardBody>
        <div className="text-[12px] font-medium text-[var(--warn)]">
          Skipped {candidates.length} handle{candidates.length === 1 ? '' : 's'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {candidates.map((candidate) => (
            <Badge key={candidate.handle} tone="outline">
              @{candidate.handle}: {candidate.reason === 'not_found' ? 'not found' : 'no score'}
            </Badge>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyShortlist() {
  return (
    <div className="mt-8">
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Try the evaluation loop
        </div>
        <p className="mt-1 max-w-2xl text-[14px] text-[var(--muted)]">
          Paste a job description to see which verified GitHub signals TrueHire will evaluate —
          before you add any candidates.
        </p>
      </div>
      <JdEvaluator />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
        <div className="num mt-1 truncate text-2xl font-semibold">{value}</div>
      </CardBody>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
      <div className="num mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function EvidencePill({
  label,
  detail,
  score,
  tone,
}: {
  label: string;
  detail?: string;
  score: number;
  tone: 'verified' | 'outline';
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-[13px]">{label}</span>
        {detail && <span className="block truncate text-[11px] text-[var(--muted)]">{detail}</span>}
      </span>
      <Badge tone={tone}>{score}</Badge>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--muted)]">
      {label}
    </div>
  );
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function parseHandles(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((handle) => handle.trim().replace(/^@/, ''))
        .filter((handle) => /^[a-zA-Z0-9-]{1,39}$/.test(handle))
    )
  ).slice(0, 8);
}

function strongestEvidenceLabel(
  evidence: ShortlistCandidateComparison['topStrengths'][number]['strengths'][number]
) {
  return `${evidence.repoFullName} · ${evidence.commits} commits`;
}

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
