import Link from 'next/link';
import { Plus, BriefcaseBusiness, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { getHiringRoles } from '@/lib/hiring-service';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const roles = await getHiringRoles();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <BriefcaseBusiness className="h-4 w-4" />
            Recruiter roles
          </div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold tracking-tight">
            Role templates and rubrics.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Define repeatable role requirements and scoring rubrics. Use these templates to launch
            hiring pipelines.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/recruiter/pipelines">
            <Button variant="secondary" size="sm">
              View pipelines
            </Button>
          </Link>
          <Link href="/recruiter/roles/new">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Create role
            </Button>
          </Link>
        </div>
      </section>

      <div className="mt-8 grid gap-4">
        {roles.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <h2 className="mt-4 text-lg font-medium">No role templates yet</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create your first role template to start building repeatable hiring workflows.
              </p>
              <Link href="/recruiter/roles/new" className="mt-6 inline-block">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  New role template
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          roles.map((role) => (
            <Link key={role.id} href={`/recruiter/roles/${role.id}`}>
              <Card className="hover:border-[var(--accent)] transition-colors">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{role.name}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)] line-clamp-1">
                      {role.description}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge tone="outline">
                        {JSON.parse(role.requirementsJson).length} requirements
                      </Badge>
                      <Badge tone="outline">
                        Created {new Date(role.createdAt).toLocaleDateString()}
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
