"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Loader2,
  Mail,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";

type Row = {
  id: string;
  company: string;
  companyDomain: string | null;
  title: string;
  startDate: string;
  endDate: string | null;
  verification: null | {
    id: string;
    status: "pending" | "confirmed" | "denied" | "disputed" | "expired";
    verifierEmail: string;
    requestedAt: number;
    respondedAt: number | null;
  };
};

export function WorkHistorySection() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const res = await fetch("/api/work-history");
    if (res.ok) {
      const body = await res.json();
      setRows(body.rows);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Employment — Signal 2</CardTitle>
        <div className="flex items-center gap-2">
          <Badge tone="outline">beta</Badge>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAdd((s) => !s)}
          >
            Add role
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <p className="mb-5 max-w-2xl text-[13px] text-[var(--muted)]">
          Add roles you’ve held, then request a cryptographically signed
          confirmation from HR. Verified entries appear on your public profile
          and unlock the ceiling past Signal 1.
        </p>

        {showAdd && (
          <AddRoleForm
            onDone={() => {
              setShowAdd(false);
              load();
            }}
          />
        )}

        {rows === null ? (
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-6 text-center text-[13px] text-[var(--muted)]">
            No roles yet. Add the companies you’ve worked at — one at a time.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <RoleRow key={r.id} row={r} onChanged={load} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function RoleRow({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const [verifierEmail, setVerifierEmail] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const v = row.verification;
  const tone =
    v?.status === "confirmed"
      ? "verified"
      : v?.status === "pending"
      ? "outline"
      : v?.status === "denied" || v?.status === "disputed" || v?.status === "expired"
      ? "neutral"
      : "neutral";
  const label =
    v?.status === "confirmed"
      ? "Confirmed"
      : v?.status === "pending"
      ? "Awaiting HR"
      : v?.status === "denied"
      ? "Denied"
      : v?.status === "expired"
      ? "Expired"
      : v?.status === "disputed"
      ? "Disputed"
      : "Not verified";
  const icon =
    v?.status === "confirmed" ? (
      <BadgeCheck className="h-3 w-3" />
    ) : v?.status === "pending" ? (
      <Clock className="h-3 w-3" />
    ) : v?.status === "denied" || v?.status === "disputed" ? (
      <ShieldAlert className="h-3 w-3" />
    ) : null;

  async function request() {
    start(async () => {
      const res = await fetch(`/api/work-history/${row.id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verifierEmail }),
      });
      if (res.ok) {
        const body = await res.json();
        setLastLink(body.url);
        setShowRequest(false);
        onChanged();
      }
    });
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{row.company}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span className="text-[14px] text-[var(--foreground)]">{row.title}</span>
          </div>
          <div className="num mt-1 text-[12px] text-[var(--muted)]">
            {row.startDate} — {row.endDate ?? "present"}
            {row.companyDomain && <span className="ml-2 text-[var(--muted-2)]">@ {row.companyDomain}</span>}
          </div>
        </div>
        <Badge tone={tone as any} className="gap-1">
          {icon}
          {label}
        </Badge>
      </div>

      {/* Request flow */}
      {(!v || v.status === "denied" || v.status === "expired") && (
        <div className="mt-3">
          {!showRequest ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Mail className="h-4 w-4" />}
              onClick={() => setShowRequest(true)}
            >
              Request HR verification
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <input
                type="email"
                placeholder="hr@company.com"
                value={verifierEmail}
                onChange={(e) => setVerifierEmail(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--border-strong)]"
              />
              <Button size="sm" onClick={request} disabled={!verifierEmail.includes("@") || isPending}>
                {isPending ? "Sending…" : "Send"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRequest(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* In-flight link (no mailer yet — show link so user can hand it to HR manually) */}
      {lastLink && (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--verified)]/40 bg-[var(--verified-bg)]/50 p-3 text-[12px]">
          <div className="font-medium text-[var(--foreground)]">Verification link created</div>
          <p className="mt-1 text-[var(--muted)]">
            Email delivery isn’t wired yet — forward this link to the verifier:
          </p>
          <code className="num mt-2 block truncate rounded bg-[var(--surface)] px-2 py-1 text-[11px]">
            {lastLink}
          </code>
        </div>
      )}

      {v?.status === "pending" && !lastLink && (
        <div className="mt-2 text-[12px] text-[var(--muted)]">
          Sent to <span className="num">{v.verifierEmail}</span> on{" "}
          {new Date(v.requestedAt).toLocaleDateString()}. Expires in 14 days.
        </div>
      )}
    </li>
  );
}

function AddRoleForm({ onDone }: { onDone: () => void }) {
  const [company, setCompany] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [current, setCurrent] = useState(true);
  const [isPending, start] = useTransition();
  const router = useRouter();

  async function submit() {
    start(async () => {
      const res = await fetch("/api/work-history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company,
          companyDomain: companyDomain || undefined,
          title,
          startDate,
          endDate: current ? null : endDate,
        }),
      });
      if (res.ok) {
        setCompany("");
        setCompanyDomain("");
        setTitle("");
        setStartDate("");
        setEndDate("");
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4 md:grid-cols-2">
      <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" />
      <Field
        label="Company domain (for HR email)"
        value={companyDomain}
        onChange={setCompanyDomain}
        placeholder="acme.com"
      />
      <Field label="Title" value={title} onChange={setTitle} placeholder="Senior Engineer" />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start (YYYY-MM)"
          value={startDate}
          onChange={setStartDate}
          placeholder="2022-04"
        />
        <Field
          label={current ? "End" : "End (YYYY-MM)"}
          value={current ? "present" : endDate}
          onChange={(v) => {
            if (v !== "present") setEndDate(v);
          }}
          placeholder="2024-08"
          disabled={current}
        />
      </div>
      <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
        <input
          type="checkbox"
          checked={current}
          onChange={(e) => setCurrent(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Current role
      </label>
      <div className="flex items-center gap-2 md:col-span-2">
        <Button
          size="sm"
          onClick={submit}
          disabled={!company || !title || !startDate || isPending}
        >
          {isPending ? "Adding…" : "Add role"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[var(--border-strong)] disabled:opacity-60"
      />
    </label>
  );
}
