import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  addWorkHistory,
  latestVerificationsForWorkHistories,
  listWorkHistory,
} from '@/lib/verify-service';
import { trackCoreAction } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const rows = await listWorkHistory(session.user.id);
  // Batch all verifications in one query instead of one per work-history row.
  const latestByWh = await latestVerificationsForWorkHistories(rows.map((r) => r.id));
  const withVerification = rows.map((r) => {
    const v = latestByWh.get(r.id) ?? null;
    return {
      id: r.id,
      company: r.company,
      companyDomain: r.companyDomain,
      title: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      verification: v
        ? {
            id: v.id,
            status: v.status,
            verifierEmail: v.verifierEmail,
            requestedAt: v.requestedAt.getTime(),
            respondedAt: v.respondedAt?.getTime() ?? null,
          }
        : null,
    };
  });
  return NextResponse.json({ rows: withVerification });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (
    typeof body?.company !== 'string' ||
    !body.company.trim() ||
    typeof body?.title !== 'string' ||
    !body.title.trim() ||
    typeof body?.startDate !== 'string'
  ) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  // Dates are stored as "YYYY-MM" strings — tenure math and the public
  // profile sort both depend on this exact shape. Empty end date = ongoing.
  const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
  const endDate = typeof body.endDate === 'string' && body.endDate ? body.endDate : null;
  if (!YM.test(body.startDate) || (endDate !== null && !YM.test(endDate))) {
    return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  }
  const id = await addWorkHistory({
    userId: session.user.id,
    company: body.company,
    companyDomain: body.companyDomain,
    title: body.title,
    startDate: body.startDate,
    endDate,
  });
  // Owner-facing analytics: a verifiable employment entry was added.
  trackCoreAction('work_history_added', session.user.id);
  return NextResponse.json({ id });
}
