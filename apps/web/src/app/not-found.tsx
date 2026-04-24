import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { ArrowRight, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <Badge tone="outline" className="mb-6">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" />
        Nothing here yet
      </Badge>
      <div className="num text-[84px] font-semibold leading-none tracking-[-0.02em] text-[var(--foreground)]">
        404
      </div>
      <h1 className="mt-6 text-[24px] font-semibold tracking-tight md:text-[28px]">
        This profile hasn’t claimed their account.
      </h1>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--muted)]">
        TrueHire profiles are derived from verified public work. A handle only
        exists once its owner signs in. If this is you, connect GitHub to claim
        the URL.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login">
          <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Claim a profile
          </Button>
        </Link>
        <Link href="/">
          <Button size="lg" variant="outline" leftIcon={<Search className="h-4 w-4" />}>
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
