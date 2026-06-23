'use client';

import { BriefcaseBusiness } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';

export function RoleFitForm({ username }: { username: string }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Role-fit report</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          action={`/${encodeURIComponent(username)}/role-fit`}
          method="get"
          className="space-y-4"
        >
          <textarea
            name="jd"
            required
            minLength={40}
            rows={6}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Paste a job description..."
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-[12px] text-[var(--muted)]">
              The report uses public score evidence only, so the shared link is safe to send with
              applications.
            </p>
            <Button type="submit" size="sm" leftIcon={<BriefcaseBusiness className="h-4 w-4" />}>
              Generate report
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
