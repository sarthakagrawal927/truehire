import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/atoms/button";
import { Github } from "lucide-react";

export async function SiteHeader() {
  const session = await auth();
  const username = session?.user?.githubUsername;
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
          <span>TrueHire</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          <Link href="/#how" className="hover:text-[var(--foreground)]">How it works</Link>
          <Link href="/#signals" className="hover:text-[var(--foreground)]">Signals</Link>
          <Link href="/#faq" className="hover:text-[var(--foreground)]">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          {username ? (
            <>
              <Link href={`/${username}`}>
                <Button variant="ghost" size="sm">My profile</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" leftIcon={<Github className="h-4 w-4" />}>
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <span
      className="relative inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--foreground)] text-[var(--background)]"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
        <path d="M5 13l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
