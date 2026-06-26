import { NextResponse } from 'next/server';
import { pollCliAuth } from '@/lib/ai-build-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Poll a pairing with the device code (no auth). Returns the token once granted. */
export async function POST(req: Request) {
  let deviceCode: string | undefined;
  try {
    const body = (await req.json()) as { deviceCode?: unknown };
    if (typeof body.deviceCode === 'string') deviceCode = body.deviceCode;
  } catch {
    // handled below
  }
  if (!deviceCode) {
    return NextResponse.json({ error: 'missing_device_code' }, { status: 400 });
  }
  const result = await pollCliAuth(deviceCode);
  return NextResponse.json(result);
}
