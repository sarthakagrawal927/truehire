import { cn } from "@/lib/cn";

type Props = {
  score: number; // 0-100
  size?: number;
  label?: string;
  className?: string;
};

export function ScoreRing({ score, size = 168, label = "SCORE", className }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--score-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--score-fill)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(0.22,0.61,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num text-[48px] leading-none font-semibold text-[var(--foreground)]">
          {clamped}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {label}
        </div>
      </div>
    </div>
  );
}
