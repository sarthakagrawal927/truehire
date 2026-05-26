import Link from "next/link";
import type { Metadata } from "next";
import { Clock, ShieldCheck } from "lucide-react";
import { GithubIcon as Github } from "@/components/atoms/github-icon";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { ScoreRing } from "@/components/molecules/score-ring";
import { ScoreBreakdown } from "@/components/molecules/score-breakdown";
import { ScoringDetail, buildScoringRows } from "@/components/molecules/scoring-detail";
import { EvidenceRow } from "@/components/molecules/evidence-row";
import { LanguageBar } from "@/components/molecules/language-bar";
import { ActivityTimeline } from "@/components/molecules/activity-timeline";
import { Stat } from "@/components/molecules/stat";
import type { EvidenceEntry } from "@truehire/core";

export const metadata: Metadata = {
  title: "Sample profile · TrueHire",
  description:
    "See what a TrueHire verified score profile looks like — a transparent 0–100 score derived entirely from public GitHub data.",
};

const SCORE = {
  overall: 82,
  depth: 88,
  breadth: 71,
  recognition: 84,
  craft: 79,
  specialization: 76,
  totalRepos: 23,
  monthsActive: 41,
};

const EVIDENCE: EvidenceEntry[] = [
  {
    repoFullName: "kubernetes/kubernetes",
    stars: 112000,
    commits: 28,
    mergedPrs: 14,
    isAuthor: false,
    primaryLanguage: "Go",
    weight: 96,
    craftTags: ["CI", "tests", "docs"],
  },
  {
    repoFullName: "sample-dev/warp-cache",
    stars: 3200,
    commits: 612,
    mergedPrs: 0,
    isAuthor: true,
    primaryLanguage: "Rust",
    weight: 72,
    craftTags: ["CI", "tests", "releases"],
  },
  {
    repoFullName: "grafana/loki",
    stars: 24000,
    commits: 11,
    mergedPrs: 6,
    isAuthor: false,
    primaryLanguage: "Go",
    weight: 61,
    craftTags: ["CI", "docs"],
  },
  {
    repoFullName: "sample-dev/orbit-rpc",
    stars: 910,
    commits: 388,
    mergedPrs: 0,
    isAuthor: true,
    primaryLanguage: "TypeScript",
    weight: 48,
    craftTags: ["CI", "tests"],
  },
  {
    repoFullName: "tokio-rs/tokio",
    stars: 26000,
    commits: 7,
    mergedPrs: 4,
    isAuthor: false,
    primaryLanguage: "Rust",
    weight: 44,
    craftTags: ["CI"],
  },
  {
    repoFullName: "sample-dev/cfg-gen",
    stars: 210,
    commits: 94,
    mergedPrs: 0,
    isAuthor: true,
    primaryLanguage: "Go",
    weight: 31,
    craftTags: [],
  },
  {
    repoFullName: "prometheus/prometheus",
    stars: 55000,
    commits: 4,
    mergedPrs: 2,
    isAuthor: false,
    primaryLanguage: "Go",
    weight: 28,
    craftTags: ["CI"],
  },
];

const LANGUAGES = [
  { language: "Go", share: 0.38 },
  { language: "Rust", share: 0.27 },
  { language: "TypeScript", share: 0.18 },
  { language: "Python", share: 0.09 },
  { language: "Shell", share: 0.05 },
  { language: "Dockerfile", share: 0.03 },
];

function makeMonths(): { month: string; commits: number }[] {
  const out: { month: string; commits: number }[] = [];
  const now = new Date();
  // Realistic 5-year activity pattern with gaps
  const gapMonths = new Set([3, 11, 19, 31, 47]);
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const base = i < 36 ? 45 : 22;
    const noise = Math.round(base * Math.abs(Math.sin(i * 1.3 + 0.5)));
    out.push({ month: key, commits: gapMonths.has(i) ? 0 : Math.max(3, noise) });
  }
  return out;
}

export default function DemoPage() {
  const months = makeMonths();
  const maxWeight = EVIDENCE.reduce((m, e) => Math.max(m, e.weight), 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* demo banner */}
      <div className="mb-8 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Sample profile · Demo
          </div>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            This is what your TrueHire profile looks like — derived entirely from GitHub data.
            Every number is real math on real public signals.
          </p>
        </div>
        <Link href="/login" className="shrink-0">
          <Button leftIcon={<Github className="h-4 w-4" />}>Claim your profile</Button>
        </Link>
      </div>

      {/* header */}
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
          <span className="text-[22px] font-semibold text-[var(--muted)]">sd</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight">Sam Devlin</h1>
            <Badge tone="verified" className="ml-1">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--muted)]">
            <span className="num">@sample-dev</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> last verified 2h ago
            </span>
          </div>
        </div>
      </div>

      {/* hero score */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center p-8">
          <ScoreRing score={SCORE.overall} />
          <div className="mt-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              TrueHire signal 1 · public work
            </div>
            <div className="mt-1 text-[13px] text-[var(--muted)]">
              Derived weekly. Evidence below.
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score breakdown</CardTitle>
            <Badge tone="outline">0 – 100</Badge>
          </CardHeader>
          <CardBody>
            <ScoreBreakdown
              rows={[
                { label: "Depth", value: SCORE.depth, weight: 0.2, hint: "consistency" },
                { label: "Breadth", value: SCORE.breadth, weight: 0.15, hint: "public GitHub" },
                { label: "Recognition", value: SCORE.recognition, weight: 0.3, hint: "portfolio" },
                { label: "Craft", value: SCORE.craft, weight: 0.2, hint: "portfolio" },
                { label: "Specialization", value: SCORE.specialization, weight: 0.15, hint: "activity" },
              ]}
            />
            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-[var(--border)] pt-6 sm:grid-cols-4">
              <Stat label="Commits" value="4.3k" />
              <Stat label="Repos" value={SCORE.totalRepos} />
              <Stat label="Stars (authored)" value="4.1k" />
              <Stat label="Months active" value={SCORE.monthsActive} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* timeline + languages */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activity — last 60 months</CardTitle>
            <Badge tone="outline">recency weighted</Badge>
          </CardHeader>
          <CardBody>
            <ActivityTimeline months={months} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <Badge tone="outline">{LANGUAGES.length} tracked</Badge>
          </CardHeader>
          <CardBody>
            <LanguageBar languages={LANGUAGES} />
          </CardBody>
        </Card>
      </div>

      {/* evidence rail */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top evidence</CardTitle>
          <Badge tone="outline">sorted by weight</Badge>
        </CardHeader>
        <div className="divide-y divide-[var(--border)]">
          {EVIDENCE.map((e, i) => (
            <EvidenceRow key={e.repoFullName} entry={e} maxWeight={maxWeight} rank={i + 1} />
          ))}
        </div>
      </Card>

      {/* Methodology */}
      <section className="mt-10">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Scoring methodology
          </div>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
            Exactly how each number was computed.
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] text-[var(--muted)]">
            No ML, no black box. Each component is a transparent formula on verifiable GitHub
            data. Tap any row to see the math.
          </p>
        </div>
        <ScoringDetail
          overall={SCORE.overall}
          rows={buildScoringRows({
            overall: SCORE.overall,
            depth: SCORE.depth,
            breadth: SCORE.breadth,
            recognition: SCORE.recognition,
            craft: SCORE.craft,
            specialization: SCORE.specialization,
            totalRepos: SCORE.totalRepos,
            monthsActive: SCORE.monthsActive,
          })}
        />
      </section>

      {/* bottom CTA */}
      <div className="mt-10 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[15px] font-semibold">Your profile is waiting.</div>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Connect GitHub and your verified score goes live in &lt;5 minutes.
          </p>
        </div>
        <Link href="/login" className="shrink-0">
          <Button size="lg" leftIcon={<Github className="h-4 w-4" />}>
            Claim your profile
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-[12px] text-[var(--muted-2)]">
        Sample profile with illustrative data. Real profiles are computed from your actual GitHub
        activity — nothing is self-written.
      </p>
    </div>
  );
}
