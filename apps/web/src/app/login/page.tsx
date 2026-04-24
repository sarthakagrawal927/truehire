import Link from "next/link";
import { Github, ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/atoms/card";
import { SignInButton } from "./sign-in-button";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user?.githubUsername) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-6 py-12">
      <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Claim your profile
          </div>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] md:text-[40px]">
            Sign in with GitHub.
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-[var(--muted)]">
            We read your public work — repos, commits, merged PRs, stars — and
            compute a verifiable profile. We never ask for a resume, a headline,
            or a self-description.
          </p>

          <ul className="mt-8 space-y-3 text-[13px] text-[var(--muted)]">
            <Bullet>OAuth only. No password, no resume.</Bullet>
            <Bullet>Public work only — nothing private is read.</Bullet>
            <Bullet>Profile is derived from sources, never self-edited.</Bullet>
          </ul>
        </div>

        <Card className="self-center">
          <CardBody className="p-8">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--verified)]" /> Secure sign-in
            </div>
            <div className="mt-3 text-[20px] font-semibold">Connect GitHub</div>
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              We request <code className="font-mono">read:user</code>,{" "}
              <code className="font-mono">user:email</code>, and{" "}
              <code className="font-mono">public_repo</code>. Nothing else.
            </p>

            <div className="mt-6">
              <SignInButton callbackUrl={sp.callbackUrl ?? "/dashboard"} />
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted-2)]">
              By continuing you agree to our{" "}
              <Link href="/terms" className="underline hover:text-[var(--foreground)]">terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-[var(--foreground)]">privacy policy</Link>.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[7px] inline-block h-1 w-1 rounded-full bg-[var(--foreground)]" />
      <span>{children}</span>
    </li>
  );
}
