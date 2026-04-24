import { NextResponse } from "next/server";
import { db, schema } from "@truehire/db";
import { eq } from "drizzle-orm";
import { respondToVerification } from "@/lib/verify-service";
import { recomputeSignal2OnVerificationChange } from "@/lib/score-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.decision) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const decision = body.decision as "confirmed" | "denied" | "disputed";
  if (!["confirmed", "denied", "disputed"].includes(decision)) {
    return NextResponse.json({ error: "bad_decision" }, { status: 400 });
  }
  const r = await respondToVerification(body.token, decision, body.notes);
  if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 410 });

  // Find the owning user and refresh their Signal 2 score immediately.
  try {
    const wh = (
      await db
        .select({ userId: schema.workHistory.userId })
        .from(schema.employerVerifications)
        .innerJoin(
          schema.workHistory,
          eq(schema.workHistory.id, schema.employerVerifications.workHistoryId),
        )
        .where(eq(schema.employerVerifications.id, r.verificationId))
        .limit(1)
    )[0];
    if (wh?.userId) await recomputeSignal2OnVerificationChange(wh.userId);
  } catch (e) {
    // non-fatal — score will catch up on the next weekly recompute.
    console.error("signal2 recompute failed", e);
  }

  return NextResponse.json({ ok: true });
}
