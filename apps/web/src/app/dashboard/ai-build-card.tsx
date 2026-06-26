'use client';

import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/atoms/card';

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

export function AiBuildCard() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-build/token', { method: 'POST' });
      if (!res.ok) throw new Error('Could not generate a token. Try again.');
      const data = (await res.json()) as { token: string };
      setToken(data.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
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
          Show <span className="text-[var(--foreground)]">how you build with AI</span>. The{' '}
          <span className="num">truehire</span> CLI scans your local Claude Code, Cursor and Codex
          logs on your own machine and publishes a six-dimension profile to your account. It&apos;s
          self-reported, so it&apos;s shown separately and{' '}
          <span className="text-[var(--foreground)]">adds 0 to your verified score</span>.
        </p>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            1 · Scan locally
          </div>
          <CopyRow text="npx truehire assess" />
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            2 · Generate a one-time publish token
          </div>
          {token ? (
            <>
              <CopyRow text={token} />
              <p className="text-[11px] text-[var(--muted-2)]">
                Single-use · expires in 15 minutes. Generate a new one if it lapses.
              </p>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate publish token'}
            </Button>
          )}
          {error && <p className="text-[12px] text-[var(--warn)]">{error}</p>}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            3 · Publish
          </div>
          <CopyRow text="truehire publish --token <token>" />
        </div>
      </CardBody>
    </Card>
  );
}
