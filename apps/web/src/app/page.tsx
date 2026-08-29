import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Card, CardBody } from '@/components/atoms/card';
import { LiveHeroProfileDemo } from './live-hero-profile-demo';

export default function LandingPage() {
  return (
    <>
      {/* ─────────────────────  HERO  ───────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* layered backdrop — dot grid + radial falloff for depth */}
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in srgb, var(--foreground) 10%, transparent), transparent)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-16 px-6 pb-20 pt-14 md:grid-cols-[1.08fr_1fr] md:gap-10 md:pb-28 md:pt-24">
          <div className="relative z-10">
            <Badge tone="outline" className="mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--verified)]" />
              Archived research artifact · no active signup
            </Badge>

            <h1 className="text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.025em] md:text-[72px]">
              A transparent
              <br />
              <span className="text-[var(--muted)]">hiring-signal</span>
              <br />
              experiment.
            </h1>

            <p className="mt-8 max-w-[34ch] text-[16px] leading-[1.55] text-[var(--muted)]">
              TrueHire tested whether technical candidates could be ranked transparently from
              verified public GitHub evidence. The standalone product is archived; this page
              preserves the scoring thesis, sample profile, and limitations for inspection.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/#how">
                <Button size="lg">
                  Inspect the methodology
                </Button>
              </Link>
              <Link href="https://rolepatch.com/proof">
                <Button size="lg" variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  See the retained proof in RolePatch
                </Button>
              </Link>
            </div>
            <div className="mt-4">
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
              >
                See a sample profile <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <dl className="mt-14 grid max-w-xl grid-cols-3 gap-8 border-t border-[var(--border)] pt-7">
              <Metric k="GitHub" v="years of public commits, verified" />
              <Metric k="0–100" v="transparent score, every number sourced" />
              <Metric k="1 shipped" v="public-work signal; three layers stayed proposed" />
            </dl>
          </div>

          {/* hero demo: the actual product, not a mini-card */}
          <div className="relative">
            <Suspense fallback={<HeroProfileDemoSkeleton />}>
              <LiveHeroProfileDemo />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ─────────────────────  PROBLEM  ───────────────────── */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-24 md:grid-cols-2">
          <div>
            <SectionEyebrow index="01" label="Signal collapse" />
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">
              Hiring broke in a new way.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--muted)]">
              When every applicant can ship a tailored resume in 30 seconds, top-tier candidates
              look identical to average ones. Recruiters bias toward warm intros, great engineers
              without networks go invisible, and everyone pays more for worse hires.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 self-start">
            {[
              'A single posting now draws hundreds of applicants — most with an AI-tailored resume.',
              'Resumes converge: a strong engineer and an average one read almost identically.',
              'Recruiters fall back on warm intros, so great engineers without a network go unseen.',
              'Time-to-hire stretches, and a bad hire is expensive to unwind.',
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted-2)]" />
                <span className="text-[13px] leading-relaxed text-[var(--muted)]">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────────────────  SIGNAL STACK  ───────────────────── */}
      <section id="signals" className="border-b border-[var(--border)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <SectionEyebrow index="02" label="The stack" />
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">
              One observed signal. Three proposed layers.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">
              Public GitHub work powered the shipped MVP. Employer verification, reputation bonds,
              and paid auditions were explored as possible additions, but the standalone product
              was archived before they shipped.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] md:grid-cols-2 lg:grid-cols-4">
            <SignalCard
              state="observed"
              index="01"
              title="Public work"
              body="Years of real commits, merged PRs into popular repos, authored libraries. Already indexable, no buy-in required."
              visual={<SignalVizCommits />}
            />
            <SignalCard
              state="proposed"
              index="02"
              title="Employer verification"
              body="HR-signed confirmation of role and tenure, payroll-backed where available. Cryptographically signed on your profile."
              visual={<SignalVizVerify />}
            />
            <SignalCard
              state="proposed"
              index="03"
              title="Reputation bonds"
              body="Colleagues and referrers stake money on specific claims. The stake forfeits if the claim proves false."
              visual={<SignalVizBonds />}
            />
            <SignalCard
              state="proposed"
              index="04"
              title="Paid audition"
              body="Two weeks of paid contract work at target comp. Convert to FT with escrowed outcome feedback."
              visual={<SignalVizAudition />}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────  HOW IT WORKS  ───────────────────── */}
      <section id="how" className="border-b border-[var(--border)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <SectionEyebrow index="03" label="How the MVP worked" />
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">
              Derived, not declared.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">
              Candidates could not write their own bio, summary, or skills list. The MVP computed
              profile claims from public evidence and showed the source behind each score.
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Step
              n="01"
              title="Connect public GitHub"
              body="OAuth linked the account without asking for a resume, headline, or self-description."
            />
            <Step
              n="02"
              title="Read the public work"
              body="The model inspected commits, releases, stars, and merged pull requests."
            />
            <Step
              n="03"
              title="Compute score + evidence"
              body="A transparent 0–100 composite showed the source behind every number."
            />
          </ol>

          <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-5">
            {[
              ['Recognition', '30%', 'Stars + merged PRs to 100★+ repos'],
              ['Depth', '20%', 'Months active, recency-weighted'],
              ['Craft', '20%', 'CI, tests, reviews, commit quality'],
              ['Breadth', '15%', 'Distinct meaningful repos, capped at 40'],
              ['Specialization', '15%', 'Concentration in a top language'],
            ].map(([n, w, d]) => (
              <Card key={n}>
                <CardBody>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    {n}
                  </div>
                  <div className="num mt-1 text-3xl font-semibold">{w}</div>
                  <div className="mt-2 text-[13px] text-[var(--muted)]">{d}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────  FAQ  ───────────────────── */}
      <section id="faq">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <div className="mb-12">
            <SectionEyebrow index="04" label="FAQ" />
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">
              Questions, answered.
            </h2>
          </div>
          <dl className="divide-y divide-[var(--border)]">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4 [&>summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-[var(--foreground)]">
                  {f.q}
                  <span className="text-[var(--muted)] transition-transform group-open:rotate-45">
                    ＋
                  </span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* ─────────────────────  CTA  ───────────────────── */}
      <section className="border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight md:text-[28px]">
              The experiment is archived.
            </h2>
            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Inspect the retained methodology here, or continue to RolePatch for active hiring work.
            </p>
          </div>
          <Link href="https://rolepatch.com/proof">
            <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View retained proof
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="num rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium tracking-[0.14em] text-[var(--foreground)]">
        § {index}
      </span>
      <span className="h-px w-8 bg-[var(--border-strong)]" />
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="num text-[20px] font-semibold leading-none tracking-tight">{k}</dt>
      <dd className="mt-2 text-[12px] leading-[1.4] text-[var(--muted)]">{v}</dd>
    </div>
  );
}

function SignalCard({
  state,
  index,
  title,
  body,
  visual,
}: {
  state: 'observed' | 'proposed';
  index: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  const label = state === 'observed' ? 'Observed input' : 'Proposed';
  const tone = state === 'observed' ? 'verified' : 'outline';
  return (
    <div className="relative flex flex-col gap-5 border-b border-r border-[var(--border)] p-6 last:border-r-0 md:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(4)]:border-r-0 md:[&:nth-child(n+3)]:border-b-0 lg:[&:nth-child(n+2)]:border-b-0">
      <div className="flex items-center justify-between">
        <span className="num text-[11px] tracking-[0.14em] text-[var(--muted-2)]">{index}</span>
        <Badge tone={tone}>
          {state === 'observed' && <span className="h-1.5 w-1.5 rounded-full bg-[var(--verified)]" />}
          {label}
        </Badge>
      </div>

      <div className="h-24 w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]">
        {visual}
      </div>

      <div>
        <div className="text-[16px] font-semibold tracking-tight">{title}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}

// ─────── per-signal micro-visuals ───────

function SignalVizCommits() {
  // A dense commit-bar column — conveys "public work"
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 20 + Math.round(70 * Math.abs(Math.sin(i * 0.9)));
    return h;
  });
  return (
    <div className="flex h-full items-end gap-[3px] px-3 pb-3 pt-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${h}%`,
            backgroundColor: `color-mix(in srgb, var(--foreground) ${35 + h / 3}%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

function SignalVizVerify() {
  // Stacked signed-email rows with a verified checkmark
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-4">
      {[
        { line: 'hr@stripe.com', k: 'Confirmed Staff Eng · 2022–2024' },
        { line: 'hr@datadog.com', k: 'Confirmed Senior SWE · 2019–2022' },
      ].map((r) => (
        <div key={r.line} className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--verified-bg)] text-[var(--verified)]">
            <ShieldCheck className="h-2.5 w-2.5" />
          </span>
          <span className="num text-[var(--foreground)]">{r.line}</span>
          <span className="ml-auto truncate text-[var(--muted-2)]">{r.k}</span>
        </div>
      ))}
    </div>
  );
}

function SignalVizBonds() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.18]">
        <div className="h-24 w-24 rounded-full border-2 border-[var(--foreground)]" />
        <div className="absolute h-16 w-16 rounded-full border-2 border-[var(--foreground)]" />
      </div>
      <div className="relative z-10 flex gap-2">
        {[200, 500, 1000].map((v) => (
          <div
            key={v}
            className="num rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-[11px]"
          >
            ${v}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalVizAudition() {
  // 14-day calendar strip with 10 days marked
  const days = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="flex h-full items-center justify-center px-3">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d}
            className={
              'h-5 w-5 rounded-[3px] ' +
              (d < 10
                ? 'bg-[var(--foreground)]'
                : 'border border-[var(--border-strong)] bg-transparent')
            }
          />
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="num text-[11px] tracking-[0.1em] text-[var(--muted-2)]">{n}</div>
      <div className="mt-3 text-[17px] font-semibold">{title}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
    </li>
  );
}

function HeroProfileDemoSkeleton() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <Card className="relative flex h-[460px] items-center justify-center overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45),0_0_0_1px_var(--border)]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-transparent"
          aria-hidden
        />
      </Card>
    </div>
  );
}

const faqs = [
  {
    q: 'Why GitHub first?',
    a: "GitHub was the one public signal the experiment could inspect without asking candidates or employers to provide new data. A long public history is harder to fabricate quickly than a tailored resume. Employer verification, reputation bonds, and paid auditions remained proposals.",
  },
  {
    q: 'Can I edit my profile?',
    a: "No. TrueHire derived profile claims from public evidence instead of candidate-written copy. Each score exposed its source so a recruiter could inspect how the number was produced.",
  },
  {
    q: "What if I don't have much GitHub history?",
    a: "The MVP focused on engineers with public code, so it could not fairly represent people whose best work was private. The proposed employment, reference, and audition signals were not shipped in the standalone product.",
  },
  {
    q: 'How do you stop gaming (bot commits, bought stars)?',
    a: 'Recognition credits only high-star repos and merged PRs into them. Depth requires sustained months of activity, not a recent burst. We detect and discount star-spikes. Gaming enough signals to materially move a score is substantially harder than real work.',
  },
  {
    q: 'Can I claim a profile or buy a recruiter plan?',
    a: 'No. TrueHire is archived as a standalone product. Its methodology and sample evidence remain available for inspection, while active employment-product work continues in RolePatch.',
  },
];
