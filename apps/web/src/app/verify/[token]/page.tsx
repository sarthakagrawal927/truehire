import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { Card, CardBody } from "@/components/atoms/card";
import { db, schema } from "@truehire/db";
import { eq } from "drizzle-orm";
import { readVerificationByToken } from "@/lib/verify-service";
import { VerifyDecisionForm } from "./decision-form";

export const dynamic = "force-dynamic";

export default async function VerifyPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const loaded = await readVerificationByToken(token);
  if (!loaded) notFound();

  const wh = (
    await db
      .select()
      .from(schema.workHistory)
      .where(eq(schema.workHistory.id, loaded.verification.workHistoryId))
      .limit(1)
  )[0];
  const user = wh
    ? (
        await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, wh.userId))
          .limit(1)
      )[0]
    : null;

  const status = loaded.status;
  const readOnly = status !== "pending";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        Employment verification · TrueHire
      </div>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight md:text-[32px]">
        Please confirm this claim.
      </h1>
      <p className="mt-3 text-[14px] text-[var(--muted)]">
        Someone has listed this role on their TrueHire profile and asked{" "}
        <span className="font-mono text-[var(--foreground)]">
          {loaded.verification.verifierEmail}
        </span>{" "}
        to confirm it. Confirming ties a cryptographic signature to this entry;
        denying flags it as disputed. Neither action reveals your identity to
        the public profile.
      </p>

      <Card className="mt-8">
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">Candidate</div>
              <div className="mt-1 font-medium">
                {user?.name ?? user?.githubUsername ?? "Unknown"}
              </div>
              {user?.githubUsername && (
                <div className="num text-[12px] text-[var(--muted)]">
                  @{user.githubUsername}
                </div>
              )}
            </div>
            <Badge
              tone={
                status === "confirmed"
                  ? "verified"
                  : status === "pending"
                  ? "outline"
                  : "neutral"
              }
            >
              {status}
            </Badge>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
            <Field label="Company">{wh?.company ?? "—"}</Field>
            <Field label="Title">{wh?.title ?? "—"}</Field>
            <Field label="Start">{wh?.startDate ?? "—"}</Field>
            <Field label="End">{wh?.endDate ?? "Current"}</Field>
          </dl>
        </CardBody>
      </Card>

      {readOnly ? (
        <div className="mt-8 text-center text-[13px] text-[var(--muted)]">
          This request has already been responded to ({status}).
        </div>
      ) : (
        <VerifyDecisionForm token={token} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium">{children}</dd>
    </div>
  );
}
