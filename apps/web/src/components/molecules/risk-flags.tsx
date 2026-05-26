import { Info, ExternalLink } from "lucide-react";
import type { EvidenceEntry } from "@truehire/core";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";

type MonthBucket = { month: string; commits: number };

type RiskFlag = {
  id: string;
  title: string;
  detail: string;
  evidenceUrl?: string;
  evidenceLabel?: string;
};

type Props = {
  depth: number;
  breadth: number;
  craft: number;
  specialization: number;
  recognition: number;
  monthsActive: number;
  totalStars: number;
  totalRepos: number;
  evidence: EvidenceEntry[];
  months: MonthBucket[];
  githubUsername: string;
};

function computeFlags({
  craft,
  specialization,
  monthsActive,
  totalStars,
  totalRepos,
  evidence,
  months,
  githubUsername,
}: Props): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const githubUrl = `https://github.com/${githubUsername}`;
  const topAuthoredRepo = evidence.find((e) => e.isAuthor)?.repoFullName;

  // Check for recent activity (past 6 months)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const hasRecentActivity = months.some((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    return new Date(y, mo - 1, 1) >= sixMonthsAgo && m.commits > 0;
  });

  if (!hasRecentActivity) {
    flags.push({
      id: "no-recent-activity",
      title: "No public commits in the past 6 months",
      detail:
        "Current work likely lives in private repositories or under a different account. Worth verifying recent output directly.",
      evidenceUrl: `${githubUrl}?tab=overview`,
      evidenceLabel: `github.com/${githubUsername}`,
    });
  }

  if (craft < 35) {
    flags.push({
      id: "low-craft",
      title: "Craft signals are sparse in public repos",
      detail:
        "CI pipelines, automated tests, and structured releases are absent or minimal across the top public repos. Ask about their engineering workflow on professional or private codebases.",
      evidenceUrl: topAuthoredRepo
        ? `https://github.com/${topAuthoredRepo}`
        : githubUrl,
      evidenceLabel: topAuthoredRepo ?? `github.com/${githubUsername}`,
    });
  }

  if (monthsActive < 12) {
    flags.push({
      id: "short-window",
      title: "Fewer than 12 months of recorded public activity",
      detail:
        "Consistent output over 2+ years is a stronger predictor of sustained contribution. Explore whether earlier work exists in private repos or predates GitHub.",
      evidenceUrl: `${githubUrl}?tab=overview`,
      evidenceLabel: `github.com/${githubUsername}`,
    });
  }

  const hasAuthoredInEvidence = evidence.some((e) => e.isAuthor);
  if (!hasAuthoredInEvidence && evidence.length > 0) {
    flags.push({
      id: "no-authored-repos",
      title: "No authored public repos in top evidence",
      detail:
        "Top contributions are all to others' codebases — a strong contributor signal, but there's limited public data on their ability to start, own, and ship a project independently.",
      evidenceUrl: `${githubUrl}?tab=repositories`,
      evidenceLabel: `github.com/${githubUsername}/repositories`,
    });
  }

  if (specialization > 85) {
    flags.push({
      id: "single-language",
      title: "Single-language public portfolio",
      detail:
        "Public work is heavily concentrated in one language. Cross-stack experience or adaptability isn't visible from GitHub alone — worth exploring in the interview.",
    });
  }

  if (totalStars < 15 && totalRepos >= 5) {
    flags.push({
      id: "low-traction",
      title: "Multiple repos, limited community traction",
      detail:
        "Several public repos with few accumulated stars often indicate coursework, internal tooling, or work not intended for public use. Ask what the candidate's most impactful professional projects look like.",
      evidenceUrl: `${githubUrl}?tab=repositories`,
      evidenceLabel: `github.com/${githubUsername}/repositories`,
    });
  }

  return flags;
}

export function RiskFlags(props: Props) {
  const flags = computeFlags(props);
  if (flags.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Signals to explore</CardTitle>
        <Badge tone="neutral">for recruiters</Badge>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-[var(--border)]">
          {flags.map((flag) => (
            <div key={flag.id} className="flex gap-3 px-5 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--foreground)]">
                  {flag.title}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {flag.detail}
                </div>
                {flag.evidenceUrl && (
                  <a
                    href={flag.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[var(--muted-2)] hover:text-[var(--foreground)]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {flag.evidenceLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] px-5 py-3">
          <p className="text-[11px] text-[var(--muted-2)]">
            These are data gaps, not disqualifiers — each flags something the
            score cannot verify from public GitHub alone.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
