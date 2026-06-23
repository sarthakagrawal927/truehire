import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BriefcaseBusiness, Save } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { createHiringRole } from '@/lib/hiring-service';
import { extractRoleRequirements } from '@truehire/core';

export const dynamic = 'force-dynamic';

export default function NewRolePage() {
  async function action(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const requirements = extractRoleRequirements(description);

    await createHiringRole({
      name,
      description,
      requirementsJson: JSON.stringify(requirements),
    });

    redirect('/recruiter/roles');
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <BriefcaseBusiness className="h-4 w-4" />
        New role template
      </div>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Define a new role.</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Provide a title and job description. We will automatically extract a rubric from the
        description, which you can refine later.
      </p>

      <Card className="mt-8">
        <CardBody>
          <form action={action} className="grid gap-6">
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Role title</span>
              <input
                name="name"
                type="text"
                required
                placeholder="Senior Fullstack Engineer"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">
                Job description / Rubric source
              </span>
              <textarea
                name="description"
                rows={10}
                required
                placeholder="We are looking for a TypeScript expert with experience in Next.js, PostgreSQL, and AWS..."
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="flex justify-end gap-3">
              <Link href="/recruiter/roles">
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="sm" leftIcon={<Save className="h-4 w-4" />}>
                Save template
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
