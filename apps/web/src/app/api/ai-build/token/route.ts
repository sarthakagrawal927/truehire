import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { issuePublishToken } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Issue a single-use CLI publish token for the signed-in user. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { token, expiresAt } = await issuePublishToken(session.user.id);
  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() });
}
