'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Check, Copy } from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';

export type ConnectedCli = {
  id: string;
  label: string | null;
  createdAt: number;
  lastUsedAt: number | null;
};

function CopyRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="num flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-[12px] hover:bg-[var(--surface-3)]"
    >
      <span className="truncate">{text}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--verified)]" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
      )}
    </button>
  );
}

function rel(ms: number): string {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AiBuildCard({ tokens }: { tokens: ConnectedCli[] }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);

  async function revoke(tokenId: string) {
    setRevoking(tokenId);
    try {
      await fetch('/api/cli-auth/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tokenId }),
      });
      router.refresh();
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Bot className="h-4 w-4" /> AI Build Profile
          </span>
        </CardTitle>
        <Badge tone="outline">optional · self-attested</Badge>
      </CardHeader>
      <CardBody>
        <p className="text-[13px] text-[var(--muted)]">
          Show <span className="text-[var(--foreground)]">how you build with AI</span>. Connect the{' '}
          <span className="num">truehire</span> CLI, then publish a six-dimension profile from your
          local Claude Code, Cursor and Codex logs. It&apos;s self-reported, so it&apos;s shown
          separately and <span className="text-[var(--foreground)]">adds 0 to your score</span>.
        </p>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            1 · Log in (opens this site to approve)
          </div>
          <CopyRow text="npx truehire login" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              2 · Scan
            </div>
            <CopyRow text="truehire assess" />
          </div>
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              3 · Publish
            </div>
            <CopyRow text="truehire publish" />
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Connected CLIs
          </div>
          {tokens.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--muted-2)]">
              None yet — run <span className="num">npx truehire login</span> to connect this
              machine.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-[var(--border)]">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{t.label ?? 'CLI'}</div>
                    <div className="text-[11px] text-[var(--muted-2)]">
                      connected {rel(t.createdAt)}
                      {t.lastUsedAt ? ` · last used ${rel(t.lastUsedAt)}` : ' · never used'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(t.id)}
                    disabled={revoking === t.id}
                  >
                    {revoking === t.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
