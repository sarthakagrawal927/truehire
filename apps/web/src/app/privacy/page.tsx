import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — TrueHire",
  description: "What TrueHire stores, where it stores it, and what we never collect.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-stone-700">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← TrueHire
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
        Privacy
      </h1>
      <p className="mt-4 text-xs text-stone-500">Last updated: 2026-05-15.</p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>GitHub OAuth identity when you sign in (id, username, name, avatar).</li>
        <li>Your public GitHub contribution data — fetched via the GitHub API using your OAuth token.</li>
        <li>Optional employment claims you add to your work history.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold text-stone-900">What we never collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Private repository contents or contributions you haven&apos;t made public on GitHub.</li>
        <li>Browser fingerprints, third-party tracking pixels, or remarketing data.</li>
        <li>Self-declared bios, skills, or titles — by design.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold text-stone-900">Where data lives</h2>
      <p className="mt-2">
        Profile data is stored in a Turso (libSQL) database. Scores are recomputed
        on demand and on a refresh interval. Auth secrets live as Cloudflare
        Workers secrets, never in code.
      </p>

      <h2 className="mt-8 text-base font-semibold text-stone-900">Your controls</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Disconnect your GitHub OAuth grant in GitHub settings to revoke access.</li>
        <li>Email the maintainer to delete your profile and all derived data.</li>
        <li>Pull a portable snapshot at any time via <code>/@handle/data.json</code>.</li>
      </ul>
    </main>
  );
}
