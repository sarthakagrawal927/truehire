import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, CircleAlert } from "lucide-react";
import {
  buildRoleFitReport,
  serializePublicRoleFitReport,
  type RoleFitReport,
} from "@truehire/core";
import { Badge } from "@/components/atoms/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { getLatestScore, getUserByUsername } from "@/lib/score-service";
import { trackCoreAction } from "@/lib/analytics";
import type { EvidenceEntry, ScoreBreakdown } from "@truehire/core";

type Params = { handle: string };
type SearchParams = { jd?: string | string[] };

export default async function RoleFitPage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ handle }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) notFound();

  const user = await getUserByUsername(clean);
  if (!user) notFound();
  const score = await getLatestScore(user.id);
  if (!score) notFound();

  const rawDescription = Array.isArray(searchParams.jd) ? searchParams.jd[0] : searchParams.jd;
  const jobDescription = (rawDescription ?? "").trim();
  const evidence: EvidenceEntry[] = JSON.parse(score.evidenceJson);
  const languages: ScoreBreakdown["languages"] = JSON.parse(score.languagesJson);
  const report = jobDescription
    ? serializePublicRoleFitReport(
        buildRoleFitReport({
          jobDescription,
          evidence,
          score: { languages },
        }),
      )
    : null;

  // Owner-facing analytics: a role-fit report was generated against a profile.
  if (report) trackCoreAction("role_fit_run", user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link
        href={`/${encodeURIComponent(clean)}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        @{clean}
      </Link>

      <section className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <BriefcaseBusiness className="h-4 w-4" />
            Role-fit report
          </div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight">
            {user.name ?? user.githubUsername} for this role
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Requirements are matched against public GitHub-derived evidence from the TrueHire
            profile.
          </p>
        </div>
        {report && <ScoreBadge report={report} />}
      </section>

      {!report ? (
        <Card className="mt-8">
          <CardBody>
            <p className="text-sm text-[var(--muted)]">
              Add a <code>jd</code> query parameter with a job description to generate a report.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric label="Requirements" value={report.summary.totalRequirements} />
            <Metric label="Verified" value={report.summary.verifiedRequirements} />
            <Metric label="Gaps" value={report.summary.gapCount} />
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Verified strengths</CardTitle>
                <Badge tone="verified">{report.verifiedStrengths.length} matched</Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                {report.verifiedStrengths.length === 0 ? (
                  <EmptyState label="No verified strengths matched this job description yet." />
                ) : (
                  report.verifiedStrengths.map((result) => (
                    <RequirementResult key={result.requirement.id} result={result} />
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gaps</CardTitle>
                <Badge tone="outline">{report.gaps.length} open</Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                {report.gaps.length === 0 ? (
                  <EmptyState label="No major gaps found for the parsed requirements." />
                ) : (
                  report.gaps.map((result) => (
                    <RequirementResult key={result.requirement.id} result={result} compact />
                  ))
                )}
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

function ScoreBadge({ report }: { report: RoleFitReport }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-right">
      <div className="num text-4xl font-semibold">{report.fitScore}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        fit score
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
        <div className="num mt-1 text-3xl font-semibold">{value}</div>
      </CardBody>
    </Card>
  );
}

function RequirementResult({
  result,
  compact = false,
}: {
  result: RoleFitReport["requirements"][number];
  compact?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-medium">
            {result.gap ? (
              <CircleAlert className="h-4 w-4 text-[var(--warn)]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[var(--verified)]" />
            )}
            {result.requirement.label}
          </div>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{result.remediation}</p>
        </div>
        <Badge tone={result.gap ? "outline" : "verified"}>{result.score}/100</Badge>
      </div>

      {!compact && result.strengths.length > 0 && (
        <div className="mt-4 space-y-2">
          {result.strengths.map((strength) => (
            <div
              key={`${result.requirement.id}-${strength.repoFullName}`}
              className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-2 text-[12px]"
            >
              <div className="font-medium">{strength.repoFullName}</div>
              <div className="mt-1 text-[var(--muted)]">
                {strength.primaryLanguage ?? "Unknown"} · {strength.commits} commits ·{" "}
                {strength.mergedPrs} merged PRs · {strength.stars} stars
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">{label}</div>;
}
