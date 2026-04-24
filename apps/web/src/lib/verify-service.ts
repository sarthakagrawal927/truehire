/**
 * Signal 2 — employer verification service.
 *
 * Flow:
 *   1. Candidate adds a work-history row (company + title + dates).
 *   2. createVerificationRequest() generates an HMAC-signed opaque token, stores
 *      its hash + expiry, returns the raw token (caller puts it in an email).
 *   3. HR receives `https://<app>/verify/<token>` link. They click → view claim
 *      → confirm/deny. respondToVerification() validates token, marks status.
 *   4. Profile UI shows a verified chip against the work-history entry.
 *
 * Not wired to a real email sender yet. Stub returns the link for manual copy
 * during bootstrap; swap in Resend/Cloudflare Email when ready.
 */
import { createHmac, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@truehire/db";
import { and, eq } from "drizzle-orm";

const HMAC_SECRET = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required for verify token signing");
  return s;
};

const TOKEN_TTL_DAYS = 14;

export type VerificationLink = {
  verificationId: string;
  url: string;
  expiresAt: Date;
};

export async function createVerificationRequest(params: {
  workHistoryId: string;
  verifierEmail: string;
  method?: "email_hr" | "email_manager" | "peer";
  baseUrl: string;
}): Promise<VerificationLink> {
  const { workHistoryId, verifierEmail } = params;
  const verifierDomain = verifierEmail.split("@")[1]?.toLowerCase();
  if (!verifierDomain) throw new Error("invalid verifier email");

  const verificationId = createId();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHmac("sha256", HMAC_SECRET())
    .update(`${verificationId}:${rawToken}`)
    .digest("hex");

  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 3_600_000);

  await db.insert(schema.employerVerifications).values({
    id: verificationId,
    workHistoryId,
    status: "pending",
    verifierEmail,
    verifierDomain,
    method: params.method ?? "email_hr",
    tokenHash,
    expiresAt,
  });

  const url = `${params.baseUrl.replace(/\/+$/, "")}/verify/${verificationId}.${rawToken}`;
  return { verificationId, url, expiresAt };
}

export async function readVerificationByToken(compoundToken: string) {
  const dot = compoundToken.indexOf(".");
  if (dot <= 0) return null;
  const verificationId = compoundToken.slice(0, dot);
  const raw = compoundToken.slice(dot + 1);
  const expected = createHmac("sha256", HMAC_SECRET())
    .update(`${verificationId}:${raw}`)
    .digest("hex");

  const rows = await db
    .select()
    .from(schema.employerVerifications)
    .where(eq(schema.employerVerifications.id, verificationId))
    .limit(1);
  const v = rows[0];
  if (!v) return null;
  if (!timingSafeEqual(expected, v.tokenHash)) return null;
  if (v.expiresAt.getTime() < Date.now()) {
    await db
      .update(schema.employerVerifications)
      .set({ status: "expired" })
      .where(eq(schema.employerVerifications.id, verificationId));
    return { verification: v, status: "expired" as const };
  }
  return { verification: v, status: v.status };
}

export async function respondToVerification(
  compoundToken: string,
  decision: "confirmed" | "denied" | "disputed",
  notes?: string,
) {
  const loaded = await readVerificationByToken(compoundToken);
  if (!loaded || loaded.status === "expired") {
    return { ok: false as const, reason: "invalid_or_expired" };
  }
  // Signature records the decision for later audit. HMAC over
  // (id | decision | timestamp) with the app secret. Rotating AUTH_SECRET
  // invalidates past signatures — acceptable for a launch product.
  const signedAt = Date.now();
  const signature = createHmac("sha256", HMAC_SECRET())
    .update(`${loaded.verification.id}:${decision}:${signedAt}`)
    .digest("hex");

  await db
    .update(schema.employerVerifications)
    .set({
      status: decision,
      signature,
      notes: notes ?? null,
      respondedAt: new Date(signedAt),
    })
    .where(eq(schema.employerVerifications.id, loaded.verification.id));
  return { ok: true as const, verificationId: loaded.verification.id };
}

export async function addWorkHistory(params: {
  userId: string;
  company: string;
  companyDomain?: string;
  title: string;
  startDate: string; // YYYY-MM
  endDate?: string | null;
}) {
  const id = createId();
  await db.insert(schema.workHistory).values({
    id,
    userId: params.userId,
    company: params.company,
    companyDomain: params.companyDomain ?? null,
    title: params.title,
    startDate: params.startDate,
    endDate: params.endDate ?? null,
  });
  return id;
}

export async function listWorkHistory(userId: string) {
  return db
    .select()
    .from(schema.workHistory)
    .where(eq(schema.workHistory.userId, userId));
}

export async function latestVerificationForWorkHistory(workHistoryId: string) {
  const rows = await db
    .select()
    .from(schema.employerVerifications)
    .where(eq(schema.employerVerifications.workHistoryId, workHistoryId));
  // Prefer confirmed > pending > denied > expired, tie-break on recency.
  const rank: Record<string, number> = {
    confirmed: 0,
    pending: 1,
    disputed: 2,
    denied: 3,
    expired: 4,
  };
  return rows.sort(
    (a, b) => rank[a.status] - rank[b.status] ||
      b.requestedAt.getTime() - a.requestedAt.getTime(),
  )[0] ?? null;
}

export type Signal2Input = {
  workHistory: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
  }>;
  confirmedVerifications: string[]; // workHistory IDs w/ confirmed verif
};

/**
 * Signal 2 — employer verification. 0..100.
 *
 * Per confirmed role: 25 base + up to 20 bonus from tenure (4 pts per year,
 * capped at 5 years). A candidate with 1 confirmed 3y role scores ~37; two
 * 4y roles ≈ 82; three 4y+ roles hit 100.
 *
 * Unverified or pending roles contribute zero — the signal is *cryptographic
 * proof* of tenure, not a candidate self-claim.
 */
export function computeSignal2(input: Signal2Input): number {
  const byId = new Map(input.workHistory.map((w) => [w.id, w]));
  let score = 0;
  for (const whId of input.confirmedVerifications) {
    const wh = byId.get(whId);
    if (!wh) continue;
    const tenureYears = tenureFromDates(wh.startDate, wh.endDate);
    score += 25 + Math.min(20, tenureYears * 4);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function tenureFromDates(startYM: string, endYM: string | null): number {
  const [sy, sm] = startYM.split("-").map(Number);
  if (!sy || !sm) return 0;
  const now = endYM
    ? (() => {
        const [ey, em] = endYM.split("-").map(Number);
        return { y: ey, m: em };
      })()
    : (() => {
        const d = new Date();
        return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
      })();
  const months = (now.y - sy) * 12 + (now.m - sm);
  return Math.max(0, months / 12);
}

/** Bonus applied to overall score from Signal 2. Capped at 15 pts. */
export function signal2OverallBonus(signal2: number): number {
  return Math.round(signal2 * 0.15);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
