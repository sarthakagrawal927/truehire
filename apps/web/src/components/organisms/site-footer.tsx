import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-3">
        <div className="text-sm text-[var(--muted)]">
          <div className="mb-2 text-[var(--foreground)] font-medium">TrueHire</div>
          The verified-candidate layer. Costly signals, not tailored resumes.
        </div>
        <div className="text-sm">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[var(--muted-2)]">Product</div>
          <ul className="space-y-1 text-[var(--muted)]">
            <li><Link href="/#signals" className="hover:text-[var(--foreground)]">Signal stack</Link></li>
            <li><Link href="/#how" className="hover:text-[var(--foreground)]">Scoring methodology</Link></li>
            <li><Link href="/#faq" className="hover:text-[var(--foreground)]">FAQ</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[var(--muted-2)]">Legal</div>
          <ul className="space-y-1 text-[var(--muted)]">
            <li><Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-[11px] text-[var(--muted-2)]">
          © {new Date().getFullYear()} TrueHire — derived, not declared.
        </div>
      </div>
    </footer>
  );
}
