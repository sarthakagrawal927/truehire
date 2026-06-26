import { redirect } from 'next/navigation';
import { Terminal } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getPendingPairing } from '@/lib/ai-build-service';
import { Card, CardBody } from '@/components/atoms/card';
import { CliApprove } from './cli-approve';

export const dynamic = 'force-dynamic';

type SP = { code?: string };

export default async function CliAuthPage(props: { searchParams: Promise<SP> }) {
  const { code } = await props.searchParams;
  const clean = (code ?? '').toUpperCase().trim();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/cli-auth?code=${clean}`)}`);
  }

  const pairing = clean ? await getPendingPairing(clean) : null;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardBody className="p-8">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
            <Terminal className="h-5 w-5 text-[var(--muted)]" />
          </div>
          <h1 className="mt-4 text-center text-[20px] font-semibold tracking-tight">
            Connect the TrueHire CLI
          </h1>

          {!pairing ? (
            <p className="mt-3 text-center text-[13px] text-[var(--muted)]">
              This pairing code is invalid or has expired. Re-run{' '}
              <span className="num">truehire login</span> in your terminal to get a fresh one.
            </p>
          ) : (
            <>
              <p className="mt-3 text-center text-[13px] text-[var(--muted)]">
                Approve only if this code matches what your terminal is showing.
              </p>
              <div className="num my-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] py-4 text-center text-[26px] font-semibold tracking-[0.2em]">
                {pairing.userCode}
              </div>
              <CliApprove userCode={pairing.userCode} />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
