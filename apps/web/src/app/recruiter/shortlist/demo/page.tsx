import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  buildShortlistComparisonReport,
  buildRecruiterCandidateIntelligenceReport,
  extractRoleRequirements,
  type RoleFitRequirementResult,
  type ShortlistCandidateComparison,
} from '@truehire/core';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { FIXTURE_CANDIDATES, FIXTURE_GENERATED_AT, FIXTURE_JD } from './fixtures';

type SearchParams = {
  jd?: string | string[];
};

export const metadata = {
  title: 'JD ↔ candidate proof board (demo) · TrueHire',
  description:
    'Fixture-backed prototype: compare verified-public-work proof for one job description against several sample candidates.',
};

const FRESH_DAYS = 90;
const STALE_DAYS = 180;

export default async function ShortlistDemoPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const rawJd = getFirst(searchParams.jd).trim();
  const jobDescription = rawJd || FIXTURE_JD;
  const isCustomJd = rawJd.length > 0 && rawJd !== FIXTURE_JD;

  const referenceNow = new Date(FIXTURE_GENERATED_AT).getTime();
  const requirements = extractRoleRequirements(jobDescription);
  const comparison = buildShortlistComparisonReport({
    jobDescription,
    candidates: FIXTURE_CANDIDATES,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <Sparkles className="h-4 w-4" />
            JD ↔ candidate proof board · prototype
          </div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
            One job description, side-by-side proof from each candidate.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Local fixtures only — no GitHub, OAuth, or database calls. Every match reason, missing
            proof item, risk flag, and recruiter next action below is derived from the JD and each
            candidate&rsquo;s verified public-work evidence.
          </p>
        </div>
        <Link href="/recruiter/shortlist">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Live shortlist tool
          </Button>
        </Link>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Job description</CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone="outline">
              {requirements.length} requirement{requirements.length === 1 ? '' : 's'} extracted
            </Badge>
            {isCustomJd ? (
              <Link
                href="/recruiter/shortlist/demo"
                className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                reset to fixture
              </Link>
            ) : (
              <Badge tone="verified">fixture</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <form className="grid gap-4 lg:grid-cols-[1fr_auto]" action="/recruiter/shortlist/demo">
            <textarea
              name="jd"
              rows={5}
              required
              minLength={20}
              defaultValue={jobDescription}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="flex items-end">
              <Button type="submit" leftIcon={<ClipboardList className="h-4 w-4" />}>
                Re-score board
              </Button>
            </div>
          </form>

          {requirements.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {requirements.map((req) => (
                <span
                  key={req.id}
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                >
                  {req.label}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Candidates" value={comparison.summary.candidateCount} />
        <Metric label="Avg fit" value={`${comparison.summary.averageFitScore}/100`} />
        <Metric label="Shared strength" value={comparison.summary.strongestRequirement ?? '-'} />
        <Metric label="Common gap" value={comparison.summary.commonGap ?? '-'} />
      </section>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Ranked board</CardTitle>
          <Badge tone="verified">verified public work only</Badge>
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
                <th className="px-5 py-3 font-medium">Freshness</th>
                <th className="px-5 py-3 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {comparison.candidates.map((candidate) => {
                const action = deriveNextAction(candidate, referenceNow);
                return (
                  <tr key={candidate.handle}>
                    <td className="num px-5 py-4 text-lg font-semibold">#{candidate.rank}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{candidate.name ?? candidate.handle}</div>
                      <div className="num mt-1 text-[12px] text-[var(--muted)]">
                        @{candidate.handle}
                      </div>
                    </td>
                    <td className="num px-5 py-4 text-lg font-semibold">
                      {candidate.report.fitScore}
                    </td>
                    <td className="num px-5 py-4">
                      {candidate.report.summary.verifiedRequirements}
                    </td>
                    <td className="num px-5 py-4">{candidate.report.summary.gapCount}</td>
                    <td className="px-5 py-4 text-[12px] text-[var(--muted)]">
                      {formatFreshness(candidate.computedAt, referenceNow)}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      <Badge tone={action.tone}>{action.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        {comparison.candidates.map((candidate) => {
          const intelligence = buildRecruiterCandidateIntelligenceReport({
            jobDescription,
            evidence: FIXTURE_CANDIDATES.find((c) => c.handle === candidate.handle)?.evidence ?? [],
            score: {
              languages:
                FIXTURE_CANDIDATES.find((c) => c.handle === candidate.handle)?.languages ?? [],
            },
          });
          const riskFlags = deriveRiskFlags(candidate, referenceNow);
          const action = deriveNextAction(candidate, referenceNow);
          return (
            <Card key={candidate.handle}>
              <CardHeader>
                <CardTitle>
                  #{candidate.rank} · {candidate.name ?? candidate.handle}
                </CardTitle>
                <Badge tone={candidate.rank === 1 ? 'verified' : 'outline'}>
                  {candidate.report.fitScore}/100 fit
                </Badge>
              </CardHeader>
              <CardBody className="grid gap-5">
                <p className="text-[13px] text-[var(--muted)]">{intelligence.fit.summary}</p>

                <div>
                  <SectionLabel icon={<CheckCircle2 className="h-4 w-4 text-[var(--verified)]" />}>
                    Match reasons (evidence)
                  </SectionLabel>
                  {candidate.topStrengths.length === 0 ? (
                    <EmptyLine label="No JD-aligned strengths matched the verified evidence." />
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {candidate.topStrengths.map((strength) => (
                        <li
                          key={strength.requirement.id}
                          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-medium">
                              {strength.requirement.label}
                            </span>
                            <Badge tone="verified">{strength.score}</Badge>
                          </div>
                          {strength.strengths.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
                              {strength.strengths.slice(0, 3).map((repo) => (
                                <span
                                  key={repo.repoFullName}
                                  className="rounded-full bg-[var(--surface-2)] px-2 py-0.5"
                                  title={`${repo.commits} commits · ${repo.mergedPrs} PRs · ${repo.stars} stars`}
                                >
                                  {repo.repoFullName}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <SectionLabel icon={<CircleAlert className="h-4 w-4 text-[var(--warn)]" />}>
                    Missing proof (gaps)
                  </SectionLabel>
                  {candidate.report.gaps.length === 0 ? (
                    <EmptyLine label="No requirements were flagged as missing." />
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {candidate.report.gaps.slice(0, 3).map((gap) => (
                        <li
                          key={gap.requirement.id}
                          className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-medium">{gap.requirement.label}</span>
                            <Badge tone="outline">{gap.score}</Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--muted)]">{gap.remediation}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <SectionLabel icon={<ShieldCheck className="h-4 w-4 text-[var(--muted)]" />}>
                    Risk flags
                  </SectionLabel>
                  {riskFlags.length === 0 ? (
                    <EmptyLine label="No data-coverage risks detected." />
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {riskFlags.map((flag) => (
                        <li
                          key={flag.id}
                          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[12px]"
                        >
                          <div className="text-[13px] font-medium text-[var(--foreground)]">
                            {flag.title}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{flag.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Recruiter next action
                    </div>
                    <Badge tone={action.tone}>{action.label}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">{action.rationale}</p>
                </div>

                {intelligence.evidenceLinks.length > 0 && (
                  <div>
                    <SectionLabel icon={<ExternalLink className="h-4 w-4 text-[var(--muted)]" />}>
                      Evidence trail
                    </SectionLabel>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {intelligence.evidenceLinks.map((link) => (
                        <span
                          key={link.repoFullName}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--muted)]"
                          title={link.reason}
                        >
                          {link.repoFullName}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted-2)]">
                      Prototype links shown as labels — fixture handles are not live GitHub
                      accounts.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Fairness caveats</CardTitle>
          <Badge tone="outline">read before you decide</Badge>
        </CardHeader>
        <CardBody className="grid gap-2 text-[13px] text-[var(--muted)]">
          <p>
            Every fit number above is derived from <strong>verified public GitHub artefacts</strong>{' '}
            (repos, commits, merged PRs, stars, language share). Nothing on this page comes from a
            self-written bio, claimed seniority, or third-party assessment.
          </p>
          <p>
            TrueHire does not collect, infer, or display protected attributes — age, gender, race,
            ethnicity, disability, nationality, religion, sexual orientation, family status. Do not
            use absent public work as a proxy for any of those traits: it most often reflects
            employer NDAs, private repos, or non-GitHub ecosystems.
          </p>
          <p>
            &ldquo;Missing proof&rdquo; means &ldquo;we could not verify this from public GitHub
            alone&rdquo; — not &ldquo;the candidate lacks the skill.&rdquo; Treat each flag as a
            prompt for an interview question, not a disqualifier.
          </p>
          <p className="text-[12px] text-[var(--muted-2)]">
            Fixture prototype generated {new Date(FIXTURE_GENERATED_AT).toLocaleDateString()}.
            Candidate names are illustrative.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}

type RecruiterAction = {
  label: string;
  tone: 'verified' | 'outline' | 'neutral';
  rationale: string;
};

function deriveNextAction(
  candidate: ShortlistCandidateComparison,
  referenceNow: number
): RecruiterAction {
  const { fitScore } = candidate.report;
  const { verifiedRequirements, gapCount, totalRequirements } = candidate.report.summary;
  const ageDays = daysSince(candidate.computedAt, referenceNow);
  const topGap = topGapLabel(candidate.report.gaps);
  const topStrength = candidate.topStrengths[0]?.requirement.label;

  if (fitScore >= 65 && verifiedRequirements >= Math.max(1, totalRequirements - 2)) {
    return {
      label: 'Advance to technical screen',
      tone: 'verified',
      rationale: `Verified strength in ${
        topStrength ?? "the JD's top requirements"
      } with ${verifiedRequirements} of ${totalRequirements} requirements supported by public work.`,
    };
  }

  if (fitScore >= 45) {
    return {
      label: 'Scope call — verify top gap',
      tone: 'outline',
      rationale: topGap
        ? `Partial match; use a 30-min call to probe ${topGap} before booking a technical round.`
        : 'Partial match; use a 30-min call to confirm the missing requirements before a technical round.',
    };
  }

  if (ageDays > STALE_DAYS) {
    return {
      label: 'Refresh profile — re-score',
      tone: 'neutral',
      rationale: `Last public signal is ${Math.round(ageDays)} days old. Request a fresh public artefact (PR, repo, write-up) before advancing.`,
    };
  }

  if (verifiedRequirements === 0) {
    return {
      label: 'Pass — adjacent stack',
      tone: 'neutral',
      rationale: topStrength
        ? `Public work centres on ${topStrength}; no JD requirements verified.`
        : 'No JD requirements are supported by public evidence.',
    };
  }

  return {
    label: 'Hold — request proof',
    tone: 'outline',
    rationale: topGap
      ? `Limited overlap; ask for a public link that demonstrates ${topGap} before re-evaluating.`
      : 'Limited overlap; ask for a public link that maps to the JD before re-evaluating.',
  };
}

type RiskFlag = {
  id: string;
  title: string;
  detail: string;
};

function deriveRiskFlags(
  candidate: ShortlistCandidateComparison,
  referenceNow: number
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const ageDays = daysSince(candidate.computedAt, referenceNow);

  if (ageDays > STALE_DAYS) {
    flags.push({
      id: 'stale',
      title: `Score is ${Math.round(ageDays)} days old`,
      detail:
        "Public signals haven't refreshed recently. Current work may live in private repos or non-GitHub tooling — confirm in interview rather than penalising.",
    });
  } else if (ageDays > FRESH_DAYS) {
    flags.push({
      id: 'aging',
      title: `Score is ${Math.round(ageDays)} days old`,
      detail: 'Within tolerance but worth a quick refresh before final stages.',
    });
  }

  if (candidate.monthsActive < 12) {
    flags.push({
      id: 'short-history',
      title: 'Under 12 months of recorded public activity',
      detail:
        "Less public history than peers. Earlier work may be in private repos or pre-date this GitHub account — ask, don't assume.",
    });
  }

  if (candidate.report.summary.totalRequirements === 0) {
    flags.push({
      id: 'no-requirements',
      title: 'JD did not produce structured requirements',
      detail:
        'Score reflects raw public-work evidence only. Re-write the JD with concrete skills/tools to enable side-by-side matching.',
    });
  } else if (candidate.report.summary.gapCount >= candidate.report.summary.totalRequirements - 1) {
    flags.push({
      id: 'majority-gaps',
      title: 'Most JD requirements are unverified',
      detail:
        'Public evidence does not cover this JD. This is a data-coverage gap, not a skill claim — likely a stack mismatch rather than a quality signal.',
    });
  }

  return flags.slice(0, 3);
}

function topGapLabel(gaps: RoleFitRequirementResult[]) {
  if (gaps.length === 0) return null;
  return gaps.slice().sort((a, b) => a.score - b.score)[0]?.requirement.label ?? null;
}

function daysSince(value: string | Date | number, referenceNow: number) {
  const ts = typeof value === 'number' ? value : new Date(value).getTime();
  return (referenceNow - ts) / 86_400_000;
}

function formatFreshness(value: string | Date | number, referenceNow: number) {
  const days = daysSince(value, referenceNow);
  if (days < 1) return 'today';
  if (days < 2) return '1d ago';
  if (days < 30) return `${Math.round(days)}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
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

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--muted)]">
      {icon}
      {children}
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--muted)]">
      {label}
    </div>
  );
}
