"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

type Phase = { id: string; label: string; pct: number; detail?: string };

const INITIAL_PHASES: Phase[] = [
  { id: "profile", label: "Fetching GitHub profile", pct: 5 },
  { id: "year",    label: "Scanning 6 years of contributions", pct: 30 },
  { id: "authored",label: "Topping up authored repos", pct: 92 },
  { id: "scoring", label: "Computing depth, breadth, recognition, specialization", pct: 98 },
  { id: "done",    label: "Saving score snapshot", pct: 100 },
];

/**
 * Drives the initial ingest from the browser. Opens an SSE stream to
 * `/api/refresh/stream` so the user sees every phase as it happens.
 */
export function IngestBootstrapper({
  hasScore,
}: {
  hasScore: boolean;
  ingestStatus: "idle" | "queued" | "running" | "failed";
}) {
  const [currentId, setCurrentId] = useState<string>("profile");
  const [currentDetail, setCurrentDetail] = useState<string>("Starting");
  const [currentPct, setCurrentPct] = useState<number>(2);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (hasScore || started.current) return;
    started.current = true;

    const es = new EventSource("/api/refresh/stream");

    es.addEventListener("phase", (ev) => {
      try {
        const p = JSON.parse((ev as MessageEvent).data);
        if (p.pct != null) setCurrentPct(p.pct);
        if (p.message) setCurrentDetail(p.message);
        if (p.type === "profile") {
          setCurrentId("profile");
        } else if (p.type === "year") {
          setCurrentId("year");
          // Mark profile done once we start year scans
          setCompleted((c) => ({ ...c, profile: true }));
        } else if (p.type === "authored") {
          setCurrentId("authored");
          setCompleted((c) => ({ ...c, profile: true, year: true }));
        } else if (p.type === "scoring") {
          setCurrentId("scoring");
          setCompleted((c) => ({ ...c, profile: true, year: true, authored: true }));
        } else if (p.type === "done") {
          setCurrentId("done");
          setCompleted({ profile: true, year: true, authored: true, scoring: true });
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("done", () => {
      setCompleted({ profile: true, year: true, authored: true, scoring: true, done: true });
      setCurrentPct(100);
      es.close();
      setTimeout(() => router.refresh(), 600);
    });

    es.addEventListener("error", (ev) => {
      const data = (ev as MessageEvent).data;
      if (data) {
        try {
          const p = JSON.parse(data);
          setError(p.message ?? "Ingest failed");
        } catch { setError("Ingest failed"); }
      }
      es.close();
    });

    return () => es.close();
  }, [hasScore, router]);

  if (hasScore) return null;

  return (
    <div className="mt-10 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
      {/* progress bar */}
      <div className="relative h-1 w-full bg-[var(--score-track)]">
        <div
          className="h-full rounded-r-full bg-[var(--score-fill)]"
          style={{
            width: `${Math.min(100, currentPct)}%`,
            transition: "width 600ms cubic-bezier(0.22,0.61,0.36,1)",
          }}
        />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Evaluating signal 1 — public work
            </div>
            <div className="mt-1 text-[17px] font-semibold tracking-tight">
              {error ? "Ingest failed" : currentDetail}
            </div>
          </div>
          <div className="num text-[32px] font-semibold tracking-tight text-[var(--foreground)]">
            {Math.min(100, currentPct)}
            <span className="text-[14px] text-[var(--muted)]">%</span>
          </div>
        </div>

        <ol className="mt-6 space-y-2">
          {INITIAL_PHASES.map((p) => {
            const isDone = completed[p.id];
            const isActive = currentId === p.id && !isDone;
            return (
              <li
                key={p.id}
                className={
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors " +
                  (isActive
                    ? "bg-[var(--surface-2)]"
                    : "")
                }
              >
                <span
                  className={
                    "inline-flex h-5 w-5 items-center justify-center rounded-full " +
                    (isDone
                      ? "bg-[var(--verified-bg)] text-[var(--verified)]"
                      : isActive
                      ? "border border-[var(--border-strong)] text-[var(--foreground)]"
                      : "border border-[var(--border)] text-[var(--muted-2)]")
                  }
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : isActive ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={
                    "text-[13px] " +
                    (isDone
                      ? "text-[var(--foreground)]"
                      : isActive
                      ? "text-[var(--foreground)] font-medium"
                      : "text-[var(--muted)]")
                  }
                >
                  {p.label}
                  {isActive && currentDetail && p.id !== "done" && (
                    <span className="ml-2 text-[11px] text-[var(--muted)]">· {currentDetail}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {error && (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--warn)_40%,var(--border))] px-3 py-2 text-[12px] text-[var(--warn)]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
