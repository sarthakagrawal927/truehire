import Image from "next/image";
import {
  ShieldCheck,
  Star,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { ScoreRing } from "@/components/molecules/score-ring";
import { getUserByUsername, getLatestScore } from "@/lib/score-service";
import type { EvidenceEntry } from "@truehire/core";

const SAMPLE_EVIDENCE: EvidenceEntry[] = [
  {
    repoFullName: "kubernetes/kubernetes",
    stars: 112000,
    commits: 28,
    mergedPrs: 14,
    isAuthor: false,
    primaryLanguage: "Go",
    weight: 96,
    craftTags: ["CI", "tests", "docs"],
  },
  {
    repoFullName: "sample-dev/warp-cache",
    stars: 3200,
    commits: 612,
    mergedPrs: 0,
    isAuthor: true,
    primaryLanguage: "Rust",
    weight: 72,
    craftTags: ["CI", "tests", "releases"],
  },
  {
    repoFullName: "grafana/loki",
    stars: 24000,
    commits: 11,
    mergedPrs: 6,
    isAuthor: false,
    primaryLanguage: "Go",
    weight: 61,
    craftTags: ["CI", "docs"],
  },
];

const SAMPLE_PROFILE = {
  user: {
    id: "sample",
    githubUsername: "sample-dev",
    name: "Sam Devlin",
    image: null,
  },
  score: {
    overall: 82,
    depth: 88,
    breadth: 71,
    recognition: 84,
    specialization: 76,
    evidenceJson: JSON.stringify(SAMPLE_EVIDENCE),
    computedAt: new Date(),
  },
};

async function loadProfile(handle: string) {
  try {
    const user = await getUserByUsername(handle);
    if (!user) return SAMPLE_PROFILE;
    const score = await getLatestScore(user.id);
    return score ? { user, score } : SAMPLE_PROFILE;
  } catch {
    return SAMPLE_PROFILE;
  }
}

export async function LiveHeroProfileDemo() {
  const data = await loadProfile("torvalds");

  if (!data || !data.score) {
    return (
      <div className="relative mx-auto w-full max-w-[460px]">
        <Card className="relative overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45),0_0_0_1px_var(--border)]">
          <div className="p-6 text-center text-sm text-[var(--muted)]">
            Could not load live profile data.
          </div>
        </Card>
      </div>
    );
  }

  const { user, score } = data;
  const evidence: EvidenceEntry[] = JSON.parse(score.evidenceJson);

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* glow */}
      <div
        className="absolute -inset-10 rounded-[28px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_12%,transparent),transparent)] blur-[2px]"
        aria-hidden
      />
      {/* window chrome */}
      <Card className="relative overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45),0_0_0_1px_var(--border)]">
        {/* chrome strip */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="num flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] text-[var(--muted)]">
            <span className="h-1 w-1 rounded-full bg-[var(--verified)]" />
            truehire.dev/{user.githubUsername}
          </div>
          <div className="w-10" />
        </div>

        {/* content */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[var(--score-track)]">
              {user.image ? (
                <Image src={user.image} alt="" fill sizes="40px" className="object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-[var(--muted)]">
                  {user.githubUsername?.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{user.name}</div>
              <div className="truncate text-[12px] text-[var(--muted)]">@{user.githubUsername}</div>
            </div>
            <Badge tone="verified" className="ml-auto">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
            <ScoreRing score={score.overall} size={136} />
            <div className="flex flex-col gap-3">
              <MiniBar label="Depth" value={score.depth} />
              <MiniBar label="Breadth" value={score.breadth} />
              <MiniBar label="Recognition" value={score.recognition} />
              <MiniBar label="Specialization" value={score.specialization} />
            </div>
          </div>

          <div className="mt-7 border-t border-[var(--border)] pt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
              <span>Top evidence</span>
              <span>weight</span>
            </div>
            <ul className="space-y-2.5">
              {evidence.slice(0, 3).map((r) => (
                <li key={r.repoFullName} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{r.repoFullName}</div>
                    <div className="num mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                      <Star className="h-3 w-3" /> {r.stars}
                      <span className="text-[var(--muted-2)]">·</span>
                      <GitPullRequest className="h-3 w-3" /> {r.mergedPrs} PRs merged
                    </div>
                  </div>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--score-track)]">
                    <div
                      className="h-full rounded-full bg-[var(--score-fill)]"
                      style={{ width: `${(r.weight / 100) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--muted-2)]">
            <Sparkles className="h-3 w-3" />
            Derived weekly from GitHub · last verified {formatRelative(new Date(score.computedAt))}
          </div>
        </div>
      </Card>

      {/* floating score chip — the share badge */}
      <div className="absolute -right-4 -top-4 hidden rotate-[3deg] md:block">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">TrueHire</div>
          <div className="num mt-1 text-3xl font-semibold leading-none">{score.overall}<span className="text-base text-[var(--muted)]">/100</span></div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </div>
      <div className="relative h-1 w-28 rounded-full bg-[var(--score-track)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--score-fill)]" style={{ width: `${value}%` }} />
      </div>
      <div className="num w-8 text-right text-[12px]">{value}</div>
    </div>
  );
}

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
