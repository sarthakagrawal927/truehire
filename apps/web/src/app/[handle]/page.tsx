import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import { GithubIcon as Github } from "@/components/atoms/github-icon";
import { Badge } from "@/components/atoms/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { ScoreRing } from "@/components/molecules/score-ring";
import { ScoreBreakdown } from "@/components/molecules/score-breakdown";
import { ScoringDetail, buildScoringRows } from "@/components/molecules/scoring-detail";
import { EvidenceRow } from "@/components/molecules/evidence-row";
import { LanguageBar } from "@/components/molecules/language-bar";
import { ActivityTimeline } from "@/components/molecules/activity-timeline";
import { Stat } from "@/components/molecules/stat";
import {
  getActivityMonths,
  getLatestScore,
  getUserByUsername,
} from "@/lib/score-service";
import type { EvidenceEntry } from "@truehire/core";
import { CopyProfileLink } from "./copy-profile-link";

type Params = { handle: string };

async function loadProfile(handleRaw: string) {
  const handle = handleRaw.startsWith("@") ? handleRaw.slice(1) : handleRaw;
  const user = await getUserByUsername(handle);
  if (!user) return null;
  const score = await getLatestScore(user.id);
  const months = await getActivityMonths(user.id);
  return { user, score, months };
}

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await props.params;
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  const data = await loadProfile(clean);
  const score = data?.score?.overall;
  const title = score != null
    ? `${clean} · TrueHire ${score}`
    : `${clean} · TrueHire`;
  const description = score != null
    ? `TrueHire profile — verified public-work score ${score}/100.`
    : `TrueHire profile for @${clean}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og/${encodeURIComponent(clean)}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/${encodeURIComponent(clean)}`],
    },
  };
}

export default async function ProfilePage(props: { params: Promise<Params> }) {
  const { handle } = await props.params;
  // Accept both /@username (canonical) and /username. Next.js on some
  // runtimes strips the leading `@` from the dynamic segment; rather than
  // fight that, we normalise both forms.
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) notFound();

  const data = await loadProfile(clean);
  if (!data) notFound();
  const { user, score, months } = data;

  const hasScore = !!score;
  const evidence: EvidenceEntry[] = hasScore ? JSON.parse(score.evidenceJson) : [];
  const languages: { language: string; share: number }[] = hasScore
    ? JSON.parse(score.languagesJson)
    : [];
  const maxWeight = evidence.reduce((m, e) => Math.max(m, e.weight), 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative h-20 w-20 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
            {user.image ? (
              <Image src={user.image} alt="" fill sizes="80px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-semibold tracking-tight">
                {user.name ?? user.githubUsername}
              </h1>
              {hasScore && (
                <Badge tone="verified" className="ml-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--muted)]">
              <span className="num">@{user.githubUsername}</span>
              <a
                href={`https://github.com/${user.githubUsername}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
              >
                <Github className="h-3.5 w-3.5" /> github <ArrowUpRight className="h-3 w-3" />
              </a>
              {hasScore && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  last verified{" "}
                  <time dateTime={new Date(score.computedAt).toISOString()}>
                    {formatRelative(new Date(score.computedAt))}
                  </time>
                </span>
              )}
            </div>
          </div>
        </div>

        {hasScore && (
          <div className="flex items-center gap-3">
            <CopyProfileLink username={user.githubUsername!} />
          </div>
        )}
      </div>

      {!hasScore ? (
        <Card className="mt-10">
          <CardBody className="p-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
              <Activity className="h-5 w-5 text-[var(--muted)]" />
            </div>
            <div className="mt-4 text-lg font-semibold">Scoring…</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              We’re reading this account’s public work. This takes up to 5 minutes
              on first sign-in. Check back shortly.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* hero score */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center p-8">
              <ScoreRing score={score.overall} />
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
                    { label: "Depth", value: score.depth, weight: 0.25 },
                    { label: "Breadth", value: score.breadth, weight: 0.15 },
                    { label: "Recognition", value: score.recognition, weight: 0.2 },
                    { label: "Craft", value: score.craft, weight: 0.25 },
                    { label: "Specialization", value: score.specialization, weight: 0.15 },
                  ]}
                />
                <div className="mt-6 grid grid-cols-2 gap-6 border-t border-[var(--border)] pt-6 sm:grid-cols-4">
                  <Stat label="Commits" value={formatNumber(score.totalCommits)} />
                  <Stat label="Repos" value={score.totalRepos} />
                  <Stat label="Stars (authored)" value={formatNumber(score.totalStars)} />
                  <Stat label="Months active" value={score.monthsActive} />
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
                <ActivityTimeline months={months.map((m) => ({ month: m.month, commits: m.commits }))} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <Badge tone="outline">{languages.length} tracked</Badge>
              </CardHeader>
              <CardBody>
                <LanguageBar languages={languages.slice(0, 8)} />
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
              {evidence.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-[var(--muted)]">
                  No evidence entries yet.
                </div>
              ) : (
                evidence.map((e, i) => (
                  <EvidenceRow key={e.repoFullName} entry={e} maxWeight={maxWeight} rank={i + 1} />
                ))
              )}
            </div>
          </Card>

          {/* Methodology — every number's formula, openable */}
          <section className="mt-10">
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Scoring methodology
              </div>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
                Exactly how each number was computed.
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] text-[var(--muted)]">
                No ML, no black box. Each component is a transparent formula on
                verifiable GitHub data. Tap any row to see the math.
              </p>
            </div>
            <ScoringDetail
              overall={score.overall}
              rows={buildScoringRows({
                overall: score.overall,
                depth: score.depth,
                breadth: score.breadth,
                recognition: score.recognition,
                craft: score.craft,
                specialization: score.specialization,
                totalRepos: score.totalRepos,
                monthsActive: score.monthsActive,
              })}
            />
          </section>

          <div className="mt-10 flex items-center justify-between text-[12px] text-[var(--muted-2)]">
            <span>
              Every number is derived from verifiable GitHub data. Nothing is
              self-written.
            </span>
            <Link href="/#how" className="hover:text-[var(--foreground)]">
              Full methodology →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

