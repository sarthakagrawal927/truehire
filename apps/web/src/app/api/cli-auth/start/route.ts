import { NextResponse } from 'next/server';
import { startCliAuth } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://truehire.sarthakagrawal927.workers.dev';

/** Begin device pairing (no auth). Returns the device + user codes. */
export async function POST(req: Request) {
  let label: string | undefined;
  try {
    const body = (await req.json()) as { label?: unknown };
    if (typeof body.label === 'string') label = body.label;
  } catch {
    // body optional
  }
  const { deviceCode, userCode, expiresAt } = await startCliAuth(label);
  return NextResponse.json({
    deviceCode,
    userCode,
    verificationUrl: `${APP_URL}/cli-auth?code=${userCode}`,
    expiresAt: expiresAt.toISOString(),
    intervalSeconds: 3,
  });
}
