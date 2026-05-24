import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  ExternalLink,
  GitPullRequest,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { ScoreRing } from "@/components/molecules/score-ring";
import { LanguageBar } from "@/components/molecules/language-bar";
import {
  getHiringPipeline,
  getPipelineCandidates,
  createEvaluation,
  getCandidateEvaluations,
  updateCandidateStage,
  updateCandidateNotes,
} from "@/lib/hiring-service";
import { getLatestScore } from "@/lib/score-service";
import { auth } from "@/lib/auth";
import type { EvidenceEntry, RoleRequirement } from "@truehire/core";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const STAGE_ORDER = [
  "shortlist",
  "screening",
  "technical",
  "interview",
  "decision",
  "hired",
  "rejected",
] as const;
type Stage = (typeof STAGE_ORDER)[number];

const RECOMMENDATIONS = [
  { value: "strong_hire", label: "Strong Hire" },
  { value: "hire", label: "Hire" },
  { value: "neutral", label: "Neutral" },
  { value: "reject", label: "Reject" },
  { value: "strong_reject", label: "Strong Reject" },
] as const;

export default async function EvaluationPage(props: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const { id: pipelineId, candidateId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const pipelineData = await getHiringPipeline(pipelineId);
  if (!pipelineData) notFound();

  const { pipeline, role } = pipelineData;
  const candidates = await getPipelineCandidates(pipelineId);
  const candidate = candidates.find((c) => c.candidate.id === candidateId);
  if (!candidate) notFound();

  let requirements: RoleRequirement[] = [];
  try {
    requirements = JSON.parse(role.requirementsJson) as RoleRequirement[];
  } catch {
    requirements = [];
  }
  const existingEvaluations = await getCandidateEvaluations(candidateId);
  const score = await getLatestScore(candidate.user.id);

  const evidence: EvidenceEntry[] = score
    ? safeParseArray<EvidenceEntry>(score.evidenceJson)
    : [];
  const languages = score
    ? safeParseArray<{ language: string; share: number }>(score.languagesJson)
    : [];

  const currentStage = candidate.candidate.stage as Stage;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const nextStage =
    currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 2
      ? STAGE_ORDER[currentIdx + 1]
      : null;

  async function action(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id || !candidate) return;

    const scores: Record<string, { score: number; feedback: string }> = {};
    for (const req of requirements) {
      const raw = formData.get(`score_${req.id}`);
      const score = raw ? parseInt(raw.toString(), 10) : 0;
      const feedback = (formData.get(`feedback_${req.id}`) as string) ?? "";
      scores[req.id] = { score, feedback };
    }

    const overallRecommendation = formData.get(
      "recommendation",
    ) as (typeof RECOMMENDATIONS)[number]["value"];
    const notes = ((formData.get("notes") as string) ?? "").trim();
    const nextAction = (formData.get("next_action") as string) || "stay";

    await createEvaluation({
      pipelineCandidateId: candidateId,
      stage: candidate.candidate.stage,
      scoresJson: JSON.stringify({
        ...scores,
        __notes: { score: 0, feedback: notes },
      }),
      overallRecommendation,
      evaluatorId: session.user.id,
    });

    if (nextAction === "advance" && nextStage) {
      await updateCandidateStage({
        candidateId,
        stage: nextStage,
        notes: notes || undefined,
      });
    } else if (nextAction === "reject") {
      await updateCandidateStage({
        candidateId,
        stage: "rejected",
        notes: notes || undefined,
      });
    } else if (notes) {
      await updateCandidateNotes({ candidateId, notes });
    }

    revalidatePath(`/recruiter/pipelines/${pipelineId}`);
    redirect(`/recruiter/pipelines/${pipelineId}`);
  }

  const displayName = candidate.user.name || candidate.user.githubUsername || "Candidate";
  const handle = candidate.user.githubUsername;
  const noteHistory = candidate.candidate.notes ?? "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center gap-4">
        <Link href={`/recruiter/pipelines/${pipelineId}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to pipeline
          </Button>
        </Link>
      </div>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {pipeline.name} · {role.name}
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight sm:text-[30px]">
            Review {displayName}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Current stage:{" "}
            <Badge tone="outline" className="uppercase tracking-wider">
              {currentStage}
            </Badge>
          </p>
        </div>
        {handle && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/${handle}`} target="_blank">
              <Button
                size="sm"
                variant="outline"
                rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Full profile
              </Button>
            </Link>
            <a
              href={`https://github.com/${handle}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
              >
                GitHub
              </Button>
            </a>
          </div>
        )}
      </header>

      <form
        action={action}
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start"
      >
        {/* Evidence column — pinned on desktop so the reviewer never loses context */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-col items-center gap-4 p-5 text-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                {candidate.user.image ? (
                  <Image
                    src={candidate.user.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{displayName}</div>
                {handle && (
                  <div className="num text-[12px] text-[var(--muted)]">@{handle}</div>
                )}
              </div>

              {score ? (
                <>
                  <ScoreRing score={score.overall} size={120} label="TRUEHIRE" />
                  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-left text-[12px]">
                    <Stat label="Depth" value={score.depth} />
                    <Stat label="Breadth" value={score.breadth} />
                    <Stat label="Recognition" value={score.recognition} />
                    <Stat label="Craft" value={score.craft} />
                    <Stat label="Specialization" value={score.specialization} />
                    <Stat label="Months" value={score.monthsActive} />
                  </div>
                  {score.signal2 > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--verified)]">
                      <ShieldCheck className="h-3 w-3" /> employer verified
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-4 text-[12px] text-[var(--muted)]">
                  No TrueHire score yet — candidate hasn’t been ingested.
                </div>
              )}
            </CardBody>
          </Card>

          {languages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardBody>
                <LanguageBar languages={languages.slice(0, 5)} />
              </CardBody>
            </Card>
          )}

          {evidence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top evidence</CardTitle>
                <Badge tone="outline">{Math.min(5, evidence.length)}</Badge>
              </CardHeader>
              <ul className="divide-y divide-[var(--border)]">
                {evidence.slice(0, 5).map((e) => (
                  <li key={e.repoFullName}>
                    <a
                      href={`https://github.com/${e.repoFullName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {e.repoFullName}
                        </div>
                        {e.isAuthor && (
                          <Badge tone="outline" className="shrink-0">
                            author
                          </Badge>
                        )}
                      </div>
                      <div className="num mt-1 flex items-center gap-3 text-[11px] text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {formatNumber(e.stars)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GitPullRequest className="h-3 w-3" />
                          {e.mergedPrs}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Code2 className="h-3 w-3" />
                          {formatNumber(e.commits)}
                        </span>
                        {e.primaryLanguage && (
                          <span className="text-[var(--muted-2)]">
                            · {e.primaryLanguage}
                          </span>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {handle && role.description && (
            <Link
              href={`/${handle}/role-fit?jd=${encodeURIComponent(role.description)}`}
              className="text-center text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
            >
              See role-fit report for {role.name} →
            </Link>
          )}
        </aside>

        {/* Decision column */}
        <div className="grid gap-6">
          {noteHistory && (
            <Card>
              <CardHeader>
                <CardTitle>Existing notes</CardTitle>
              </CardHeader>
              <CardBody className="text-sm whitespace-pre-wrap text-[var(--muted)]">
                {noteHistory}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rubric</CardTitle>
              {requirements.length > 0 && (
                <Badge tone="outline">{requirements.length} criteria</Badge>
              )}
            </CardHeader>
            <CardBody className="grid gap-5">
              {requirements.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  This role has no rubric criteria yet. Add some on the role page to
                  structure scoring — for now, capture your read in the notes below.
                </p>
              ) : (
                requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{req.label}</h3>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {req.category}
                          {req.keywords.length > 0 &&
                            ` · ${req.keywords.join(", ")}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <label
                            key={val}
                            className="flex cursor-pointer flex-col items-center"
                          >
                            <input
                              type="radio"
                              name={`score_${req.id}`}
                              value={val}
                              required
                              className="peer sr-only"
                            />
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] text-sm transition-colors hover:border-[var(--accent)] peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--accent-contrast)]">
                              {val}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea
                      name={`feedback_${req.id}`}
                      rows={2}
                      placeholder="What in their work supports this score?"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <textarea
                name="notes"
                rows={4}
                defaultValue={noteHistory}
                placeholder="Overall read on this candidate — context, concerns, what to dig into next."
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <p className="mt-2 text-[11px] text-[var(--muted-2)]">
                Saved on the candidate and snapshotted into this evaluation.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendation</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {RECOMMENDATIONS.map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="recommendation"
                      value={opt.value}
                      required
                      className="peer sr-only"
                    />
                    <div className="flex h-12 items-center justify-center rounded border border-[var(--border)] px-2 text-center text-[10px] font-bold uppercase tracking-wider transition-colors hover:border-[var(--accent)] peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--accent-contrast)]">
                      {opt.label}
                    </div>
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next action</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-3">
                <NextAction
                  value="stay"
                  label="Stay on stage"
                  hint={currentStage}
                  defaultChecked
                />
                <NextAction
                  value="advance"
                  label={nextStage ? `Advance to ${nextStage}` : "No next stage"}
                  hint="move forward"
                  disabled={!nextStage}
                />
                <NextAction
                  value="reject"
                  label="Move to rejected"
                  hint="close out"
                />
              </div>
            </CardBody>
          </Card>

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:-mx-0 sm:flex-row sm:justify-end sm:rounded-[var(--radius-md)] sm:border sm:px-5">
            <Link href={`/recruiter/pipelines/${pipelineId}`} className="sm:order-1">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              leftIcon={<Save className="h-4 w-4" />}
              className="sm:order-2"
            >
              Save evaluation
            </Button>
          </div>

          {existingEvaluations.length > 0 && (
            <section className="mt-2">
              <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Past evaluations · {existingEvaluations.length}
              </h2>
              <div className="grid gap-3">
                {existingEvaluations.map((evalItem) => {
                  const parsed = safeParseObject<Record<string, { score: number; feedback: string }>>(
                    evalItem.scoresJson,
                  );
                  const evalNotes = parsed?.__notes?.feedback ?? "";
                  return (
                    <Card key={evalItem.id}>
                      <CardBody className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge tone="outline">{evalItem.stage}</Badge>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                              {evalItem.overallRecommendation?.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {new Date(evalItem.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {parsed && Object.keys(parsed).filter((k) => k !== "__notes").length > 0 && (
                          <div className="mt-2 grid gap-1 text-[12px] text-[var(--muted)] sm:grid-cols-2">
                            {Object.entries(parsed)
                              .filter(([k]) => k !== "__notes")
                              .map(([reqId, data]) => (
                                <div key={reqId} className="flex justify-between">
                                  <span className="truncate pr-2">
                                    {requirements.find((r) => r.id === reqId)?.label || reqId}
                                  </span>
                                  <span className="num font-semibold">{data.score}/5</span>
                                </div>
                              ))}
                          </div>
                        )}
                        {evalNotes && (
                          <p className="mt-3 whitespace-pre-wrap text-[12px] text-[var(--muted)]">
                            {evalNotes}
                          </p>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </form>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
        {label}
      </div>
      <div className="num text-sm font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function NextAction({
  value,
  label,
  hint,
  defaultChecked = false,
  disabled = false,
}: {
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40" : "cursor-pointer"}`}>
      <input
        type="radio"
        name="next_action"
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <div className="flex h-full flex-col gap-1 rounded border border-[var(--border)] px-3 py-3 transition-colors peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--accent-contrast)]">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-80">{hint}</span>
      </div>
    </label>
  );
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function safeParseArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function safeParseObject<T>(json: string): T | null {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}
