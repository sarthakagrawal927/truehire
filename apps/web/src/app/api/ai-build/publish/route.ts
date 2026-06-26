import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/score-service';
import { upsertAiBuildProfile, validateCliToken } from '@/lib/ai-build-service';
import { parseArtifact } from '@/lib/ai-build-artifact';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generous ceiling — a valid artifact is a few KB of counts.
const MAX_BODY_BYTES = 64 * 1024;

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ? m[1].trim() : null;
}

/**
 * Publish a self-attested AI build profile. Auth is a single-use token issued
 * from the dashboard, so the upload is bound to a GitHub-verified identity
 * without the CLI ever holding OAuth secrets.
 */
export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const artifact = parseArtifact(body);
  if (!artifact) {
    return NextResponse.json(
      { error: 'invalid_artifact', message: 'Run a newer `truehire assess` and try again.' },
      { status: 400 }
    );
  }

  const userId = await validateCliToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: 'invalid_token', message: 'Not logged in. Run `truehire login` and try again.' },
      { status: 401 }
    );
  }

  await upsertAiBuildProfile(userId, artifact);

  const user = await getUserById(userId);
  return NextResponse.json({ ok: true, handle: user?.githubUsername ?? null });
}
