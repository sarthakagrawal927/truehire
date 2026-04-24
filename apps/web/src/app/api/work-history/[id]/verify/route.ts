import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@truehire/db";
import { and, eq } from "drizzle-orm";
import { createVerificationRequest } from "@/lib/verify-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.verifierEmail || !body.verifierEmail.includes("@")) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  // Confirm ownership of the work-history row.
  const row = (
    await db
      .select()
      .from(schema.workHistory)
      .where(
        and(
          eq(schema.workHistory.id, id),
          eq(schema.workHistory.userId, session.user.id),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";

  const link = await createVerificationRequest({
    workHistoryId: id,
    verifierEmail: body.verifierEmail,
    baseUrl,
  });

  // Email sender is not wired yet — return the raw link so the owner can
  // manually forward it to HR. Real send (Resend / Cloudflare Email) comes
  // with the Signal 2 email infra in a follow-up.
  return NextResponse.json({
    url: link.url,
    verificationId: link.verificationId,
    expiresAt: link.expiresAt.toISOString(),
  });
}
