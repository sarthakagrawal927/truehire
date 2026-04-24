import { cn } from "@/lib/cn";

type Row = { label: string; value: number; weight: number; hint?: string };

export function ScoreBreakdown({ rows, className }: { rows: Row[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-[var(--border)]", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-4 py-3">
          <div className="w-36 shrink-0">
            <div className="text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
              {r.label}
            </div>
            <div className="text-[11px] text-[var(--muted-2)]">
              {Math.round(r.weight * 100)}% weight
            </div>
          </div>
          <div className="relative flex-1 h-1.5 rounded-full bg-[var(--score-track)] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--score-fill)]"
              style={{
                width: `${Math.max(0, Math.min(100, r.value))}%`,
                transition: "width 700ms cubic-bezier(0.22,0.61,0.36,1)",
              }}
            />
          </div>
          <div className="num w-10 text-right text-sm font-medium text-[var(--foreground)]">
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}
