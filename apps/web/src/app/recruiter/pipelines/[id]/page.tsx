import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import {
  getHiringPipeline,
  getPipelineCandidates,
  addCandidateToPipeline,
  updateCandidateStage,
} from '@/lib/hiring-service';
import { getUserByUsername } from '@/lib/score-service';
import { revalidatePath } from 'next/cache';

const STAGES = [
  'shortlist',
  'screening',
  'technical',
  'interview',
  'decision',
  'hired',
  'rejected',
] as const;

type PipelineStage = (typeof STAGES)[number];

function nextStage(stage: PipelineStage): PipelineStage | null {
  const next = STAGES[STAGES.indexOf(stage) + 1];
  return next ?? null;
}

export const dynamic = 'force-dynamic';

export default async function PipelineDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await getHiringPipeline(id);

  if (!data) notFound();

  const { pipeline, role } = data;
  const candidates = await getPipelineCandidates(id);

  async function addCandidateAction(formData: FormData) {
    'use server';
    const handle = formData.get('handle') as string;
    const user = await getUserByUsername(handle.replace(/^@/, ''));

    if (!user) {
      // In a real app, we'd handle this better (e.g., show an error)
      return;
    }

    await addCandidateToPipeline({
      pipelineId: id,
      userId: user.id,
    });

    revalidatePath(`/recruiter/pipelines/${id}`);
  }

  async function moveStageAction(candidateId: string, stage: PipelineStage) {
    'use server';
    await updateCandidateStage({ candidateId, stage });
    revalidatePath(`/recruiter/pipelines/${id}`);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <Link href="/recruiter/pipelines" className="hover:text-[var(--foreground)]">
              Pipelines
            </Link>
            <ArrowRight className="h-3 w-3" />
            {pipeline.name}
          </div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight">{pipeline.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Role:{' '}
            <Link
              href={`/recruiter/roles/${role.id}`}
              className="font-medium text-[var(--foreground)] hover:underline"
            >
              {role.name}
            </Link>
          </p>
        </div>
        <div>
          <form action={addCandidateAction} className="flex gap-2">
            <input
              name="handle"
              type="text"
              required
              placeholder="@username"
              className="w-40 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <Button type="submit" size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
              Add candidate
            </Button>
          </form>
        </div>
      </section>

      <div className="mt-10 grid gap-8 overflow-x-auto pb-6 lg:grid-cols-7 lg:min-w-[1200px]">
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.candidate.stage === stage);
          return (
            <div key={stage} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                  {stage}
                </h3>
                <Badge tone="outline">{stageCandidates.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {stageCandidates.map(({ candidate, user }) => {
                  const next = nextStage(stage);
                  return (
                    <Card key={candidate.id} className="group relative">
                      <CardBody className="p-3">
                        <div className="font-semibold text-sm">
                          {user.name || user.githubUsername}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          @{user.githubUsername}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex gap-2 items-center">
                            <Link
                              href={`/${user.githubUsername}`}
                              className="text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
                            >
                              Profile
                            </Link>
                            <Link
                              href={`/recruiter/pipelines/${pipeline.id}/evaluate/${candidate.id}`}
                              className="text-[10px] font-medium text-[var(--accent)] hover:underline"
                            >
                              Evaluate
                            </Link>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {next && (
                              <form action={moveStageAction.bind(null, candidate.id, next)}>
                                <button
                                  type="submit"
                                  className="p-1 hover:bg-[var(--surface-2)] rounded"
                                >
                                  <ArrowRight className="h-3 w-3 text-[var(--muted)]" />
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
                {stageCandidates.length === 0 && (
                  <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-4 text-center">
                    <span className="text-[10px] text-[var(--muted)] italic">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
