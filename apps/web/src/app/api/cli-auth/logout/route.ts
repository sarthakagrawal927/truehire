import { NextResponse } from 'next/server';
import { revokeCliTokenByValue } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearer(req: Request): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '');
  return m?.[1] ? m[1].trim() : null;
}

/** Revoke the caller's own token by value (`truehire logout`). */
export async function POST(req: Request) {
  const token = bearer(req);
  if (token) await revokeCliTokenByValue(token);
  // Always 200 — logout is idempotent and must not leak token validity.
  return NextResponse.json({ ok: true });
}
