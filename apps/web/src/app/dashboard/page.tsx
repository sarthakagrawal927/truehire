import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, RefreshCw } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getActivityMonths,
  getLatestScore,
  getUserById,
} from "@/lib/score-service";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { ScoreRing } from "@/components/molecules/score-ring";
import { ScoreBreakdown } from "@/components/molecules/score-breakdown";
import { ScoringDetail, buildScoringRows } from "@/components/molecules/scoring-detail";
import { ActivityTimeline } from "@/components/molecules/activity-timeline";
import { RefreshButton } from "./refresh-button";
import { IngestBootstrapper } from "./ingest-bootstrapper";
import { WorkHistorySection } from "./work-history";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const score = await getLatestScore(user.id);
  const months = await getActivityMonths(user.id);

  const isScoring = !score && user.ingestStatus !== "failed";
  const profileUrl = user.githubUsername ? `/${user.githubUsername}` : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Your profile
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Hey {user.name ?? user.githubUsername} 👋
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Your TrueHire profile is {score ? "live" : "being built"}. Share the
            link in applications, or embed it on your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profileUrl && (
            <Link href={profileUrl}>
              <Button variant="secondary" size="sm" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
                View public profile
              </Button>
            </Link>
          )}
          <RefreshButton disabled={user.ingestStatus === "running"} />
        </div>
      </div>

      {isScoring ? (
        <IngestBootstrapper
          hasScore={!!score}
          ingestStatus={user.ingestStatus}
        />
      ) : user.ingestStatus === "failed" ? (
        <Card className="mt-10 border-[color:color-mix(in_srgb,var(--warn)_40%,var(--border))]">
          <CardBody className="p-8">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--warn)]">
              Ingest failed
            </div>
            <div className="mt-1 text-lg font-semibold">Something went wrong</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Your last GitHub ingest didn’t finish. Try refreshing — if it
              persists, check that your token has <code>public_repo</code> scope.
            </p>
            <div className="mt-4">
              <RefreshButton />
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center p-8">
              <ScoreRing score={score!.overall} />
              <div className="mt-5 text-center">
                <Badge tone="outline">
                  Refreshes every 7 days · manual 1×/day
                </Badge>
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
                    { label: "Depth", value: score!.depth, weight: 0.2 },
                    { label: "Breadth", value: score!.breadth, weight: 0.15 },
                    { label: "Recognition", value: score!.recognition, weight: 0.3 },
                    { label: "Craft", value: score!.craft, weight: 0.2 },
                    { label: "Specialization", value: score!.specialization, weight: 0.15 },
                  ]}
                />
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
              <Badge tone="outline">last 60 months</Badge>
            </CardHeader>
            <CardBody>
              <ActivityTimeline
                months={months.map((m) => ({ month: m.month, commits: m.commits }))}
              />
            </CardBody>
          </Card>

          {/* Methodology + actionable next steps */}
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Scoring methodology
                </div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
                  How this was computed, and what moves it.
                </h2>
              </div>
              <Badge tone="outline">tap a row to expand</Badge>
            </div>
            <ScoringDetail
              overall={score!.overall}
              rows={buildScoringRows({
                overall: score!.overall,
                depth: score!.depth,
                breadth: score!.breadth,
                recognition: score!.recognition,
                craft: score!.craft,
                specialization: score!.specialization,
                totalRepos: score!.totalRepos,
                monthsActive: score!.monthsActive,
              })}
            />
          </section>

          <WorkHistorySection />

          {profileUrl && (
            <Card className="mt-6">
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Your profile URL
                  </div>
                  <div className="num mt-1 truncate font-medium">
                    truehire.dev{profileUrl}
                  </div>
                </div>
                <Link href={profileUrl}>
                  <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-4 w-4" />}>
                    Open
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
