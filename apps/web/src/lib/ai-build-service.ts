import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, schema } from '@truehire/db';
import { createId } from '@paralleldrive/cuid2';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Artifact } from './ai-build-artifact';

/** Device-pairing sessions live 10 minutes. */
const PAIRING_TTL_MS = 10 * 60 * 1000;
/** User-code charset — no ambiguous chars (0/O/1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function hmac(raw: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required to sign CLI tokens');
  return createHmac('sha256', secret).update(raw).digest('hex');
}

function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Human-readable anti-phishing code, e.g. "WXYZ-2K7M". */
function makeUserCode(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    if (i === 3) out += '-';
  }
  return out;
}

// ─────────────────────────────────────────────
// Profile persistence
// ─────────────────────────────────────────────

export async function getAiBuildProfile(userId: string) {
  // Fail-soft: this runs on every public /@handle render. If the table is not
  // yet migrated in an environment, the profile page must still load.
  try {
    const rows = await db
      .select()
      .from(schema.aiBuildProfiles)
      .where(eq(schema.aiBuildProfiles.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error('getAiBuildProfile failed (table missing or DB error)', e);
    return null;
  }
}

/** Insert or replace a user's self-attested AI build profile. */
export async function upsertAiBuildProfile(userId: string, a: Artifact): Promise<void> {
  const values = {
    userId,
    schemaVersion: a.schemaVersion,
    cliVersion: a.cliVersion,
    generatedAt: new Date(a.generatedAt),
    publishedAt: new Date(),
    composite: a.composite,
    dataCompleteness: a.dataCompleteness,
    dimensionsJson: JSON.stringify(a.dimensions),
    signalsJson: JSON.stringify(a.signals),
    toolsDetectedJson: JSON.stringify(a.toolsDetected),
  };
  await db
    .insert(schema.aiBuildProfiles)
    .values(values)
    .onConflictDoUpdate({ target: schema.aiBuildProfiles.userId, set: values });
}

// ─────────────────────────────────────────────
// CLI auth — browser-pairing (device authorization)
// ─────────────────────────────────────────────

/** Step 1 (CLI, no auth): begin a pairing. Returns the raw device + user codes. */
export async function startCliAuth(
  label?: string
): Promise<{ deviceCode: string; userCode: string; expiresAt: Date }> {
  const deviceCode = randomBytes(32).toString('base64url');
  const userCode = makeUserCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);
  await db.insert(schema.cliAuthSessions).values({
    id: createId(),
    deviceCodeHash: hmac(deviceCode),
    userCode,
    status: 'pending',
    label: label?.slice(0, 64),
    expiresAt,
  });
  return { deviceCode, userCode, expiresAt };
}

/** Look up a pending, unexpired pairing by its user code (for the approve page). */
export async function getPendingPairing(userCode: string) {
  const rows = await db
    .select()
    .from(schema.cliAuthSessions)
    .where(eq(schema.cliAuthSessions.userCode, userCode))
    .limit(1);
  const row = rows[0];
  if (!row || row.status !== 'pending') return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Step 2 (browser, authed): approve or deny a pairing by user code. */
export async function decideCliAuth(
  userCode: string,
  userId: string,
  approve: boolean
): Promise<boolean> {
  const row = await getPendingPairing(userCode);
  if (!row) return false;
  await db
    .update(schema.cliAuthSessions)
    .set({ status: approve ? 'approved' : 'denied', userId: approve ? userId : null })
    .where(eq(schema.cliAuthSessions.id, row.id));
  return true;
}

export type PollResult =
  | { status: 'pending' | 'denied' | 'expired' | 'used' }
  | { status: 'granted'; token: string };

/**
 * Step 3 (CLI, no auth): poll with the device code. On the first poll after
 * approval, mint a fresh CLI token, return it once, and mark the session
 * granted. The raw token is never stored — only its hash in `cli_tokens`.
 */
export async function pollCliAuth(deviceCode: string): Promise<PollResult> {
  const wanted = hmac(deviceCode);
  const rows = await db
    .select()
    .from(schema.cliAuthSessions)
    .where(eq(schema.cliAuthSessions.deviceCodeHash, wanted))
    .limit(1);
  const row = rows[0];
  if (!row || !hashesEqual(row.deviceCodeHash, wanted)) return { status: 'denied' };
  if (row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.status === 'pending') return { status: 'pending' };
  if (row.status === 'denied') return { status: 'denied' };
  if (row.status === 'granted') return { status: 'used' };
  // approved → mint token once
  if (!row.userId) return { status: 'denied' };
  const token = randomBytes(32).toString('base64url');
  await db.insert(schema.cliTokens).values({
    id: createId(),
    userId: row.userId,
    tokenHash: hmac(token),
    label: row.label,
  });
  await db
    .update(schema.cliAuthSessions)
    .set({ status: 'granted' })
    .where(eq(schema.cliAuthSessions.id, row.id));
  return { status: 'granted', token };
}

/** Validate a CLI token (publish auth). Returns userId if live, else null. */
export async function validateCliToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const wanted = hmac(raw);
  const rows = await db
    .select()
    .from(schema.cliTokens)
    .where(and(eq(schema.cliTokens.tokenHash, wanted), isNull(schema.cliTokens.revokedAt)))
    .limit(1);
  const row = rows[0];
  if (!row || !hashesEqual(row.tokenHash, wanted)) return null;
  await db
    .update(schema.cliTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.cliTokens.id, row.id));
  return row.userId;
}

/** List a user's connected CLI tokens (for the dashboard), newest first. */
export async function listCliTokens(userId: string) {
  return db
    .select()
    .from(schema.cliTokens)
    .where(and(eq(schema.cliTokens.userId, userId), isNull(schema.cliTokens.revokedAt)))
    .orderBy(desc(schema.cliTokens.createdAt));
}

/** Revoke a specific connected CLI token (dashboard action). */
export async function revokeCliToken(userId: string, tokenId: string): Promise<void> {
  await db
    .update(schema.cliTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.cliTokens.id, tokenId), eq(schema.cliTokens.userId, userId)));
}

/** Revoke the caller's own token by value (CLI `logout`). */
export async function revokeCliTokenByValue(raw: string): Promise<void> {
  if (!raw) return;
  await db
    .update(schema.cliTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.cliTokens.tokenHash, hmac(raw)));
}
