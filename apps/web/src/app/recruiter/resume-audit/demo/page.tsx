import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  buildResumeClaimAuditReport,
  type ResumeClaimAuditFinding,
  type ResumeClaimStatus,
} from '@truehire/core';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';
import { FIXTURE_CANDIDATES } from '../../shortlist/demo/fixtures';

type SearchParams = {
  resume?: string | string[];
  candidate?: string | string[];
};

const DEFAULT_CANDIDATE = 'ada-the-builder';

const FIXTURE_RESUME = `Senior TypeScript product engineer.
Built React and Next.js dashboards for SaaS teams.
Owned Cloudflare Workers APIs, CI, testing, documentation, and release hygiene.
Contributor to open-source frontend and API projects.
Also claims Rust systems programming and Kubernetes observability experience.`;

export const metadata = {
  title: 'Resume claim audit (demo) · TrueHire',
  description: 'Audit candidate-supplied resume claims against verified public GitHub evidence.',
};

export default async function ResumeAuditDemoPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const candidateHandle = getFirst(searchParams.candidate) || DEFAULT_CANDIDATE;
  const candidate =
    FIXTURE_CANDIDATES.find((item) => item.handle === candidateHandle) ?? FIXTURE_CANDIDATES[0];
  const resumeText = getFirst(searchParams.resume).trim() || FIXTURE_RESUME;
  const report = buildResumeClaimAuditReport({
    resumeText,
    evidence: candidate.evidence,
    score: { languages: candidate.languages },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <FileSearch className="h-4 w-4" />
            Resume claim audit · prototype
          </div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
            Separate resume claims from verified public proof.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Candidate-supplied text is parsed into technical claims, then checked against the
            selected TrueHire fixture profile. The audit labels each claim by evidence coverage, not
            confidence in the person.
          </p>
        </div>
        <Link href="/recruiter/shortlist">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Shortlist
          </Button>
        </Link>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Audit input</CardTitle>
          <Badge tone="outline">fixture evidence</Badge>
        </CardHeader>
        <CardBody>
          <form
            className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr_auto]"
            action="/recruiter/resume-audit/demo"
          >
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">TrueHire fixture</span>
              <select
                name="candidate"
                defaultValue={candidate.handle}
                className="mt-2 h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                {FIXTURE_CANDIDATES.map((item) => (
                  <option key={item.handle} value={item.handle}>
                    @{item.handle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Resume excerpt</span>
              <textarea
                name="resume"
                rows={7}
                minLength={20}
                defaultValue={resumeText}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" leftIcon={<FileSearch className="h-4 w-4" />}>
                Audit
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Coverage" value={`${report.summary.coverageScore}/100`} />
        <Metric label="Claims" value={report.summary.claimCount} />
        <Metric label="Verified" value={report.summary.verifiedCount} />
        <Metric label="Partial" value={report.summary.partialCount} />
        <Metric label="Unverified" value={report.summary.unverifiedCount} />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Claim audit</CardTitle>
            <Badge tone="verified">GitHub evidence only</Badge>
          </CardHeader>
          <CardBody>
            {report.findings.length === 0 ? (
              <EmptyLine label="No technical claims were extracted from the resume text." />
            ) : (
              <div className="space-y-3">
                {report.findings.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up queue</CardTitle>
              <HelpCircle className="h-4 w-4 text-[var(--muted)]" />
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {report.findings.slice(0, 5).map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium">{finding.claim}</span>
                      <Badge tone={toneForStatus(finding.status)}>
                        {labelForStatus(finding.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">
                      {finding.followUpQuestion}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence trail</CardTitle>
              <ShieldCheck className="h-4 w-4 text-[var(--verified)]" />
            </CardHeader>
            <CardBody>
              {report.evidenceLinks.length === 0 ? (
                <EmptyLine label="No public evidence is available for this fixture." />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {report.evidenceLinks.map((link) => (
                    <span
                      key={link.repoFullName}
                      title={link.reason}
                      className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--muted)]"
                    >
                      {link.repoFullName}
                    </span>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Fairness caveats</CardTitle>
          <Badge tone="outline">claim audit</Badge>
        </CardHeader>
        <CardBody className="grid gap-2 text-[13px] text-[var(--muted)]">
          {report.caveats.map((caveat) => (
            <p key={caveat}>{caveat}</p>
          ))}
        </CardBody>
      </Card>
    </main>
  );
}

function FindingRow({ finding }: { finding: ResumeClaimAuditFinding }) {
  const Icon = finding.status === 'verified' ? CheckCircle2 : CircleAlert;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon
              className={
                finding.status === 'verified'
                  ? 'h-4 w-4 text-[var(--verified)]'
                  : 'h-4 w-4 text-[var(--warn)]'
              }
            />
            <span className="text-sm font-medium">{finding.claim}</span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{finding.reason}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="outline">{finding.category}</Badge>
          <Badge tone={toneForStatus(finding.status)}>{labelForStatus(finding.status)}</Badge>
          <Badge tone="neutral">{finding.score}</Badge>
        </div>
      </div>
      {finding.evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {finding.evidence.map((entry) => (
            <span
              key={entry.repoFullName}
              title={`${entry.commits} commits / ${entry.mergedPrs} merged PRs / ${entry.stars} stars`}
              className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--muted)]"
            >
              {entry.repoFullName}
            </span>
          ))}
        </div>
      )}
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

function toneForStatus(status: ResumeClaimStatus) {
  if (status === 'verified') return 'verified';
  if (status === 'partial') return 'outline';
  return 'neutral';
}

function labelForStatus(status: ResumeClaimStatus) {
  if (status === 'verified') return 'verified';
  if (status === 'partial') return 'partial';
  return 'unverified';
}
