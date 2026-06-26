'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/atoms/button';

type State = 'idle' | 'working' | 'approved' | 'denied' | 'error';

export function CliApprove({ userCode }: { userCode: string }) {
  const [state, setState] = useState<State>('idle');

  async function decide(approve: boolean) {
    setState('working');
    try {
      const res = await fetch('/api/cli-auth/decide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCode, approve }),
      });
      if (!res.ok) throw new Error('failed');
      setState(approve ? 'approved' : 'denied');
    } catch {
      setState('error');
    }
  }

  if (state === 'approved') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] py-3 text-[13px] text-[var(--verified)]">
        <Check className="h-4 w-4" /> Connected — return to your terminal.
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <p className="text-center text-[13px] text-[var(--muted)]">Denied. Nothing was connected.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => decide(true)} disabled={state === 'working'}>
        {state === 'working' ? 'Connecting…' : 'Approve'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => decide(false)}
        disabled={state === 'working'}
      >
        Deny
      </Button>
      {state === 'error' && (
        <p className="text-center text-[12px] text-[var(--warn)]">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
