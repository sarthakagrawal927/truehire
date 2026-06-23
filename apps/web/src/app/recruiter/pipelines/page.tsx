import Link from 'next/link';
import { Plus, GitBranch, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { getHiringPipelines, getHiringRoles } from '@/lib/hiring-service';

export const dynamic = 'force-dynamic';

export default async function PipelinesPage() {
  const pipelines = await getHiringPipelines();
  const roles = await getHiringRoles();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <GitBranch className="h-4 w-4" />
            Hiring pipelines
          </div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
            Active hiring workflows.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Track candidates through stages, record decision notes, and maintain a repeatable
            evaluation process.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/recruiter/roles">
            <Button variant="secondary" size="sm">
              Manage roles
            </Button>
          </Link>
          {roles.length > 0 && (
            <Link href="/recruiter/pipelines/new">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Start pipeline
              </Button>
            </Link>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-4">
        {roles.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Activity className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <h2 className="mt-4 text-lg font-medium">No roles defined</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                You need at least one role template before you can start a pipeline.
              </p>
              <Link href="/recruiter/roles/new" className="mt-6 inline-block">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create role template
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : pipelines.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <GitBranch className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <h2 className="mt-4 text-lg font-medium">No active pipelines</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Launch a pipeline from one of your role templates to start evaluating candidates.
              </p>
              <Link href="/recruiter/pipelines/new" className="mt-6 inline-block">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Launch pipeline
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          pipelines.map(({ pipeline, role }) => (
            <Link key={pipeline.id} href={`/recruiter/pipelines/${pipeline.id}`}>
              <Card className="hover:border-[var(--accent)] transition-colors">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{pipeline.name}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Based on:{' '}
                      <span className="font-medium text-[var(--foreground)]">{role.name}</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge tone={pipeline.status === 'active' ? 'verified' : 'outline'}>
                        {pipeline.status}
                      </Badge>
                      <Badge tone="outline">
                        Started {new Date(pipeline.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                </CardBody>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
