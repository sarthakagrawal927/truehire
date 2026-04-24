type Bucket = { month: string; commits: number };

/**
 * Compact month-by-month bar chart. 60 months max. Recent on the right.
 */
export function ActivityTimeline({ months }: { months: Bucket[] }) {
  const last = padMonths(months, 60);
  const max = last.reduce((m, b) => Math.max(m, b.commits), 0) || 1;

  // Gridline for year boundaries
  const yearMarkers = new Set<string>();
  let lastYear = "";
  for (const b of last) {
    const y = b.month.slice(0, 4);
    if (y !== lastYear) {
      yearMarkers.add(b.month);
      lastYear = y;
    }
  }

  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]">
        {last.map((b) => {
          const h = b.commits === 0 ? 2 : Math.max(4, (b.commits / max) * 100);
          const op = b.commits === 0 ? 0.25 : 0.35 + (b.commits / max) * 0.65;
          return (
            <div
              key={b.month}
              className="group relative flex-1 th-rise"
              title={`${b.month} · ${b.commits} contributions`}
              style={{
                height: `${h}%`,
                backgroundColor: `color-mix(in srgb, var(--foreground) ${Math.round(
                  op * 100,
                )}%, transparent)`,
                borderRadius: "2px",
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[10px] text-[var(--muted-2)]">
        {[...yearMarkers].map((m) => (
          <span key={m} className="num">
            {m.slice(0, 4)}
          </span>
        ))}
      </div>
    </div>
  );
}

function padMonths(months: Bucket[], count: number): Bucket[] {
  const map = new Map(months.map((m) => [m.month, m.commits]));
  const out: Bucket[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, commits: map.get(key) ?? 0 });
  }
  return out;
}
