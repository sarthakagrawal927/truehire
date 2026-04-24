"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/atoms/button";

export function VerifyDecisionForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [decision, setDecision] = useState<"confirmed" | "denied" | null>(null);
  const [notes, setNotes] = useState("");

  async function submit(d: "confirmed" | "denied") {
    setDecision(d);
    setState("loading");
    try {
      const res = await fetch("/api/verify/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, decision: d, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--verified-bg)] text-[var(--verified)]">
          <Check className="h-5 w-5" />
        </div>
        <div className="mt-3 font-semibold">Thank you.</div>
        <div className="mt-1 text-[13px] text-[var(--muted)]">
          Recorded as <strong>{decision}</strong>. You can close this tab.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <label className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
        Optional note
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
        placeholder="e.g. confirmed dates and title; left voluntarily"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          size="lg"
          onClick={() => submit("confirmed")}
          disabled={state === "loading"}
          leftIcon={<Check className="h-4 w-4" />}
        >
          Confirm
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => submit("denied")}
          disabled={state === "loading"}
          leftIcon={<X className="h-4 w-4" />}
        >
          Deny
        </Button>
      </div>
      {state === "error" && (
        <p className="mt-3 text-[12px] text-[var(--warn)]">
          Couldn’t record that. Link may have expired — ask the candidate to re-send.
        </p>
      )}
    </div>
  );
}
