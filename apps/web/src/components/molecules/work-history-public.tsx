import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/atoms/badge";

export type PublicWorkEntry = {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  status: "confirmed" | "pending" | "denied" | "disputed" | "expired" | null;
  verifierDomain?: string | null;
  respondedAt?: number | null;
};

/**
 * Public-facing work history — only confirmed entries show a verified chip.
 * Unverified entries render in muted state so recruiters know they're
 * self-claimed, not signed. Denied/disputed explicitly surfaced per PRD
 * (we don't arbitrate, we show both sides).
 */
export function PublicWorkHistory({ entries }: { entries: PublicWorkEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((e, i) => {
        const confirmed = e.status === "confirmed";
        const disputed = e.status === "disputed" || e.status === "denied";
        return (
          <li key={i} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{e.company}</span>
                <span className="text-[var(--muted-2)]">·</span>
                <span className="text-[14px]">{e.title}</span>
              </div>
              <div className="num mt-1 text-[12px] text-[var(--muted)]">
                {e.startDate} — {e.endDate ?? "present"}
                {confirmed && e.verifierDomain && (
                  <span className="ml-2 text-[var(--muted-2)]">
                    signed by {e.verifierDomain}
                  </span>
                )}
              </div>
            </div>
            {confirmed ? (
              <Badge tone="verified" className="gap-1 shrink-0">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            ) : disputed ? (
              <Badge tone="neutral" className="gap-1 shrink-0">
                <ShieldAlert className="h-3 w-3" />
                {e.status}
              </Badge>
            ) : (
              <Badge tone="outline" className="shrink-0">
                Self-claimed
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
