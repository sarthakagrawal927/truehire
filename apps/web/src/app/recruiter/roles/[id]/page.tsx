import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, ListTodo } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { getHiringRole } from '@/lib/hiring-service';
import type { RoleRequirement } from '@truehire/core';

export const dynamic = 'force-dynamic';

export default async function RoleDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const role = await getHiringRole(id);

  if (!role) notFound();

  const requirements = JSON.parse(role.requirementsJson) as RoleRequirement[];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center gap-4">
        <Link href="/recruiter/roles">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to roles
          </Button>
        </Link>
      </div>

      <section className="mt-6">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <BriefcaseBusiness className="h-4 w-4" />
          Role template
        </div>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight">{role.name}</h1>
        <p className="mt-4 text-sm text-[var(--muted)] whitespace-pre-wrap leading-relaxed">
          {role.description}
        </p>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <ListTodo className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-xl font-semibold">Evaluation Rubric</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {requirements.map((req) => (
            <Card key={req.id}>
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{req.label}</h3>
                  <Badge tone="outline">{req.category}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {req.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
