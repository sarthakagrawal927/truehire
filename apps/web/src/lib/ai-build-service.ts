import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, schema } from '@truehire/db';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import type { Artifact } from './ai-build-artifact';

/** Publish tokens are valid for 15 minutes and single-use. */
const TOKEN_TTL_MS = 15 * 60 * 1000;

function hmac(raw: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required to sign publish tokens');
  return createHmac('sha256', secret).update(raw).digest('hex');
}

function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function getAiBuildProfile(userId: string) {
  const rows = await db
    .select()
    .from(schema.aiBuildProfiles)
    .where(eq(schema.aiBuildProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Issue a single-use publish token for an authenticated user. Only the HMAC is
 * stored; the raw token is returned once. Any prior tokens for the user are
 * cleared so exactly one is live at a time.
 */
export async function issuePublishToken(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  const raw = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.delete(schema.cliPublishTokens).where(eq(schema.cliPublishTokens.userId, userId));
  await db.insert(schema.cliPublishTokens).values({
    id: createId(),
    userId,
    tokenHash: hmac(raw),
    expiresAt,
  });
  return { token: raw, expiresAt };
}

/**
 * Redeem a raw token: returns the bound userId if it's valid, unexpired and
 * unused, marking it used. Returns null otherwise.
 */
export async function redeemPublishToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const wanted = hmac(raw);
  const rows = await db
    .select()
    .from(schema.cliPublishTokens)
    .where(
      and(eq(schema.cliPublishTokens.tokenHash, wanted), isNull(schema.cliPublishTokens.usedAt))
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (!hashesEqual(row.tokenHash, wanted)) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  await db
    .update(schema.cliPublishTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.cliPublishTokens.id, row.id));
  return row.userId;
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
