import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GitBranch, Save } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody } from '@/components/atoms/card';
import { createHiringPipeline, getHiringRoles } from '@/lib/hiring-service';

export const dynamic = 'force-dynamic';

export default async function NewPipelinePage() {
  const roles = await getHiringRoles();

  async function action(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const roleId = formData.get('roleId') as string;

    await createHiringPipeline({
      name,
      roleId,
    });

    redirect('/recruiter/pipelines');
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <GitBranch className="h-4 w-4" />
        New pipeline
      </div>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Launch a hiring pipeline.</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Give your pipeline a name, such as Senior Frontend - Q4 2024, and select the role template
        to use for scoring.
      </p>

      <Card className="mt-8">
        <CardBody>
          <form action={action} className="grid gap-6">
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Pipeline name</span>
              <input
                name="name"
                type="text"
                required
                placeholder="Senior Backend Engineer - Summer 2026"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-[var(--muted)]">Role template</span>
              <select
                name="roleId"
                required
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <Link href="/recruiter/pipelines">
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="sm" leftIcon={<Save className="h-4 w-4" />}>
                Launch pipeline
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
