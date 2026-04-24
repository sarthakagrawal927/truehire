import { NextResponse } from "next/server";
import { respondToVerification } from "@/lib/verify-service";

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
  return NextResponse.json({ ok: true });
}
