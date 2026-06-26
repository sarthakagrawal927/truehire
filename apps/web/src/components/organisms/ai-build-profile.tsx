import { Bot, Info } from 'lucide-react';
import { Badge } from '@/components/atoms/badge';

type Dimension = {
  id: string;
  name: string;
  score: number | null;
  weight: number;
};

export type AiBuildProfileView = {
  composite: number | null;
  dataCompleteness: number;
  generatedAt: number;
  dimensions: Dimension[];
  toolsDetected: { tool: string; fidelity: string }[];
};

const TOOL_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  codex: 'Codex',
};

function Bar({ value }: { value: number | null }) {
  if (value == null) {
    return <div className="text-[11px] text-[var(--muted-2)]">not enough data</div>;
  }
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--score-track)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Self-attested "AI Build Profile" (Signal 3). Deliberately fenced off from the
 * verified score: distinct accent border, a "self-attested" badge, and an
 * explicit note that it contributes 0 to the TrueHire score.
 */
export function AiBuildProfile({ profile }: { profile: AiBuildProfileView }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <Bot className="h-3.5 w-3.5" /> Companion signal · how they build with AI
        </div>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          AI Build Profile{' '}
          <span className="align-middle text-[13px] font-normal text-[var(--muted)]">
            — self-attested
          </span>
        </h2>
      </div>

      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_5%,var(--surface))] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="num text-[34px] font-semibold leading-none">
            {profile.composite ?? '—'}
            <span className="text-[15px] font-normal text-[var(--muted)]">/100</span>
          </div>
          <Badge tone="outline">AI Build Index</Badge>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {profile.toolsDetected.map((t) => (
              <Badge key={t.tool} tone="outline">
                {TOOL_LABEL[t.tool] ?? t.tool} · {t.fidelity}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-5 divide-y divide-[var(--border)]">
          {profile.dimensions.map((d) => (
            <div key={d.id} className="flex items-center gap-4 py-2.5">
              <div className="w-40 shrink-0 text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                {d.name}
              </div>
              <Bar value={d.score} />
              <div className="num w-10 text-right text-sm font-medium">{d.score ?? '—'}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <p className="text-[12px] text-[var(--muted)]">
            <span className="font-medium text-[var(--foreground)]">Self-attested.</span> Computed on
            this candidate&apos;s machine from their local AI-coding tools and uploaded with a
            verified-identity token. The identity is GitHub-verified, but the underlying activity is
            self-reported and{' '}
            <span className="font-medium text-[var(--foreground)]">
              contributes 0 to the TrueHire score
            </span>{' '}
            · {Math.round(profile.dataCompleteness * 100)}% data completeness.
          </p>
        </div>
      </div>
    </section>
  );
}
