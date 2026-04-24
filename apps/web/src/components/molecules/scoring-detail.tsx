import { Info } from "lucide-react";

type Row = {
  label: string;
  value: number;        // 0-100 raw score
  weight: number;       // 0-1 weight
  formula: string;      // human-readable formula
  improve: string[];    // actionable levers
};

export function ScoringDetail({ rows, overall }: { rows: Row[]; overall: number }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-2)]" />
          <div>
            Every number on your profile is derived from public GitHub data.
            Overall score = <span className="num text-[var(--foreground)]">{overall}</span> =
            <span className="mx-1 num">
              {rows.map((r) => `${r.value}×${r.weight}`).join(" + ")}
            </span>
            (rounded). Recomputed weekly, or on manual refresh.
          </div>
        </div>
      </div>

      {rows.map((r) => {
        const contribution = Math.round(r.value * r.weight);
        return (
          <details
            key={r.label}
            className="group rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center gap-4 px-5 py-4">
              <span className="num w-6 text-[11px] text-[var(--muted-2)]">
                {Math.round(r.weight * 100)}%
              </span>
              <span className="flex-1 font-medium">{r.label}</span>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-[12px] text-[var(--muted)]">
                  contributes <span className="num text-[var(--foreground)]">+{contribution}</span>
                </div>
                <div className="num text-lg font-semibold">{r.value}</div>
                <span className="text-[var(--muted)] transition-transform group-open:rotate-45">＋</span>
              </div>
            </summary>
            <div className="border-t border-[var(--border)] px-5 py-4 text-[13px]">
              <div className="mb-3 font-mono text-[12px] text-[var(--muted)]">
                {r.formula}
              </div>
              {r.improve.length > 0 && (
                <>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    How to improve
                  </div>
                  <ul className="space-y-1.5 text-[var(--foreground)]">
                    {r.improve.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--foreground)]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function buildScoringRows(score: {
  overall: number;
  depth: number;
  breadth: number;
  recognition: number;
  craft: number;
  specialization: number;
  totalRepos: number;
  monthsActive: number;
}): Row[] {
  return [
    {
      label: "Depth",
      value: score.depth,
      weight: 0.2,
      formula:
        "log₁(Σ recency-weighted months active) / log₁(48) × 100 · half-life 30 months",
      improve: [
        "Commit even once/month — gaps pull this down more than volume ever compensates.",
        "Old contributions decay: work older than 2 years is worth half a recent month.",
        "Consistency beats burst — five spread months beat fifty commits in one week.",
      ],
    },
    {
      label: "Breadth",
      value: score.breadth,
      weight: 0.15,
      formula:
        "log₁(distinct meaningful repos) / log₁(50) × 100 · external repos need ≥2 merged PRs AND ≥3 commits",
      improve: [
        "Land ≥2 merged PRs in an external repo — single-PR repos don't count.",
        "Author public tools with real commit history — each repo crossing the bar adds breadth.",
        `You have ${score.totalRepos} repo${score.totalRepos === 1 ? "" : "s"} on record — adding a few more meaningful ones moves this ~10 points.`,
      ],
    },
    {
      label: "Recognition",
      value: score.recognition,
      weight: 0.3,
      formula:
        "log₁₀(authored stars × freshness + core-contrib stars × share + PR credit to 100★+ repos) / 5.5 × 100",
      improve: [
        "Keep authored repos fresh — a 5-year-dead star ≈ 38% of a live one.",
        "Merged PRs into high-star production repos (React, Next.js, Kubernetes) move this most.",
        "Trivial PRs (<2) to external repos add zero — target depth in real projects.",
      ],
    },
    {
      label: "Craft",
      value: score.craft,
      weight: 0.2,
      formula:
        "avg over top-10 repos (authored + core-contrib): CI 18 + tests 18 + README 12 + LICENSE 6 + releases ≤14 + collabs ≤14 + commit-msg quality ≤18",
      improve: [
        "Add GitHub Actions / any CI to your main authored repos — biggest single bump.",
        "Add a test directory or vitest/jest/playwright config — even a sanity-check suite counts.",
        "Write a substantive README (>800 chars). LICENSE + release tags stack small bonuses.",
        "Invite collaborators or attract contributors — solo repos lose the team signal.",
      ],
    },
    {
      label: "Specialization",
      value: score.specialization,
      weight: 0.15,
      formula:
        "piecewise on dominant-language share of weighted activity · below 20% share = 0",
      improve: [
        "Pick a primary language and double down — 70% Rust beats 30% in each of four stacks.",
        "Merged PRs weigh 5× commits here — language of your PRs matters most.",
        "Polyglot hobby repos dilute this. Keep them, ship depth elsewhere.",
      ],
    },
  ];
}
