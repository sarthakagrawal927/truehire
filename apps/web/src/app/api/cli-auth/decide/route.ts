import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { decideCliAuth } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Approve or deny a pairing (authed, from the /cli-auth browser page). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let userCode: string | undefined;
  let approve = false;
  try {
    const body = (await req.json()) as { userCode?: unknown; approve?: unknown };
    if (typeof body.userCode === 'string') userCode = body.userCode;
    approve = body.approve === true;
  } catch {
    // handled below
  }
  if (!userCode) {
    return NextResponse.json({ error: 'missing_user_code' }, { status: 400 });
  }
  const ok = await decideCliAuth(userCode, session.user.id, approve);
  if (!ok) {
    return NextResponse.json(
      { error: 'invalid_code', message: 'This code is invalid or has expired.' },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, approved: approve });
}
