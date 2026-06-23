export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between animate-pulse">
        <div>
          <div className="h-4 w-48 bg-[var(--surface-2)] rounded"></div>
          <div className="mt-2 h-10 w-80 bg-[var(--surface-2)] rounded"></div>
          <div className="mt-2 h-4 w-60 bg-[var(--surface-2)] rounded"></div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-7 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <div className="h-4 w-20 bg-[var(--surface-2)] rounded"></div>
            <div className="h-32 bg-[var(--surface-2)] rounded-[var(--radius-sm)]"></div>
          </div>
        ))}
      </div>
    </main>
  );
}
