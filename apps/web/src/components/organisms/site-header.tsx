'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/atoms/button';
import { GithubIcon as Github } from '@/components/atoms/github-icon';

const NAV_LINKS = [
  { href: '/#signals', label: 'Signals' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/recruiter/shortlist', label: 'Recruiters' },
  { href: '/#faq', label: 'FAQ' },
];

export function SiteHeader() {
  const { data: session } = useSession();
  const username = session?.user?.githubUsername;
  const [menuOpen, setMenuOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
          <span>TrueHire</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[var(--foreground)]">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {username ? (
            <>
              <Link href={`/${username}`} className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  My profile
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" leftIcon={<Github className="h-4 w-4" />}>
                Sign in
              </Button>
            </Link>
          )}

          {/* Hamburger — mobile only. */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer. */}
      {menuOpen && (
        <nav
          key={pathname}
          className="border-t border-[var(--border)] bg-[var(--background)] md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-6xl flex-col px-2 py-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {username && (
              <li>
                <Link
                  href={`/${username}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                >
                  My profile
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
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
        <path
          d="M5 13l4 4 10-10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
