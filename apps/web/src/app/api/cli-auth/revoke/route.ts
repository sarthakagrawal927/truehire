import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { revokeCliToken } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revoke one of the caller's connected CLI tokens (dashboard action). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let tokenId: string | undefined;
  try {
    const body = (await req.json()) as { tokenId?: unknown };
    if (typeof body.tokenId === 'string') tokenId = body.tokenId;
  } catch {
    // handled below
  }
  if (!tokenId) {
    return NextResponse.json({ error: 'missing_token_id' }, { status: 400 });
  }
  await revokeCliToken(session.user.id, tokenId);
  return NextResponse.json({ ok: true });
}
