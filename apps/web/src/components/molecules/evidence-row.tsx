import { Star, GitPullRequest, Code2, User } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import type { EvidenceEntry } from "@truehire/core";

type Props = { entry: EvidenceEntry; maxWeight: number; rank: number };

export function EvidenceRow({ entry, maxWeight, rank }: Props) {
  const pct = maxWeight > 0 ? (entry.weight / maxWeight) * 100 : 0;
  return (
    <a
      href={`https://github.com/${entry.repoFullName}`}
      target="_blank"
      rel="noreferrer"
      className="group relative block rounded-[var(--radius-sm)] px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      <div className="flex items-center gap-4">
        <div className="num w-6 text-right text-[11px] text-[var(--muted-2)]">
          {String(rank).padStart(2, "0")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-[var(--foreground)] truncate">
              {entry.repoFullName}
            </div>
            {entry.isAuthor && (
              <Badge tone="outline" className="gap-1">
                <User className="h-3 w-3" />
                author
              </Badge>
            )}
            {entry.primaryLanguage && (
              <Badge tone="neutral" className="gap-1">
                <Code2 className="h-3 w-3" />
                {entry.primaryLanguage}
              </Badge>
            )}
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-[var(--score-track)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--score-fill)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] text-[var(--muted)] num shrink-0">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {formatNumber(entry.stars)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5" />
            {entry.mergedPrs}
          </span>
          <span className="inline-flex items-center gap-1">
            <Code2 className="h-3.5 w-3.5" />
            {formatNumber(entry.commits)}
          </span>
        </div>
      </div>
    </a>
  );
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
