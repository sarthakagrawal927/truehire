import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addWorkHistory, listWorkHistory } from "@/lib/verify-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await listWorkHistory(session.user.id);
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.company || !body?.title || !body?.startDate) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const id = await addWorkHistory({
    userId: session.user.id,
    company: body.company,
    companyDomain: body.companyDomain,
    title: body.title,
    startDate: body.startDate,
    endDate: body.endDate,
  });
  return NextResponse.json({ id });
}
