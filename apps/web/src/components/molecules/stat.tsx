import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="num text-2xl font-medium text-[var(--foreground)]">
        {value}
      </div>
      {hint && <div className="text-[11px] text-[var(--muted-2)]">{hint}</div>}
    </div>
  );
}
