import Link from "next/link";
import {
  ShieldCheck, GitBranch, Award, Coins, Activity, ArrowRight,
  Star, GitPullRequest, Code2, Sparkles,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/atoms/github-icon";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Card, CardBody } from "@/components/atoms/card";
import { ScoreRing } from "@/components/molecules/score-ring";

export default function LandingPage() {
  return (
    <>
      {/* ─────────────────────  HERO  ───────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* layered backdrop — dot grid + radial falloff for depth */}
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--foreground) 10%, transparent), transparent)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-16 px-6 pb-20 pt-14 md:grid-cols-[1.08fr_1fr] md:gap-10 md:pb-28 md:pt-24">
          <div className="relative z-10">
            <Badge tone="outline" className="mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--verified)]" />
              Costly signals over cheap ones
            </Badge>

            <h1 className="text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.025em] md:text-[72px]">
              Your resume
              <br />
              <span className="text-[var(--muted)]">is gone.</span>
              <br />
              Your work still speaks.
            </h1>

            <p className="mt-8 max-w-[34ch] text-[16px] leading-[1.55] text-[var(--muted)]">
              AI tailors every resume into a 95% match. Recruiters stopped reading them.
              TrueHire replaces the resume with signals that are too expensive to fake —
              starting with years of verified public code.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg" leftIcon={<Github className="h-4 w-4" />}>
                  Claim your profile
                </Button>
              </Link>
              <Link href="#how">
                <Button size="lg" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  How the score works
                </Button>
              </Link>
            </div>

            <dl className="mt-14 grid max-w-xl grid-cols-3 gap-8 border-t border-[var(--border)] pt-7">
              <Metric k="500–1000" v="applicants per role, post-ChatGPT" />
              <Metric k="30s" v="to generate a ‘perfect’ resume" />
              <Metric k="4 signals" v="stacked, near-impossible to fake" />
            </dl>
          </div>

          {/* hero demo: the actual product, not a mini-card */}
          <div className="relative">
            <HeroProfileDemo />
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
              When every applicant can ship a tailored resume in 30 seconds, top-tier
              candidates look identical to average ones. Recruiters bias toward warm
              intros, great engineers without networks go invisible, and everyone pays
              more for worse hires.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 self-start">
            {[
              ["10×", "increase in application volume per role"],
              ["62%", "recruiters who can't tell AI resumes apart"],
              ["34 days", "average time to hire — and getting longer"],
              ["$4,700", "average cost-per-hire for a senior IC"],
            ].map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="num text-xl font-semibold">{k}</span>
                <span className="text-right text-[13px] text-[var(--muted)]">{v}</span>
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
              Four orthogonal signals. Stacked.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">
              Any one costly signal can be partially gamed. Four, layered, can only
              be produced by someone who actually is who they claim to be.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] md:grid-cols-2 lg:grid-cols-4">
            <SignalCard
              state="live"
              index="01"
              title="Public work"
              body="Years of real commits, merged PRs into popular repos, authored libraries. Already indexable, no buy-in required."
              visual={<SignalVizCommits />}
            />
            <SignalCard
              state="next"
              index="02"
              title="Employer verification"
              body="HR-signed confirmation of role and tenure, payroll-backed where available. Cryptographically signed on your profile."
              visual={<SignalVizVerify />}
            />
            <SignalCard
              state="soon"
              index="03"
              title="Reputation bonds"
              body="Colleagues and referrers stake money on specific claims. The stake forfeits if the claim proves false."
              visual={<SignalVizBonds />}
            />
            <SignalCard
              state="soon"
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
            <SectionEyebrow index="03" label="How it works" />
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">
              Derived, not declared.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">
              You cannot write your own bio, summary, or skills list. Everything on
              your profile is computed from verified sources. That is the point.
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Step n="01" title="Connect GitHub"
              body="OAuth only — we never ask for a resume, a headline, or a self-description." />
            <Step n="02" title="We read your work"
              body="Commits, releases, stars, merged PRs to high-reputation repos — no heuristics, no ML black box." />
            <Step n="03" title="Score + evidence"
              body="A transparent 0–100 composite with the receipts behind every number. Recomputed weekly." />
          </ol>

          <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-4">
            {[
              ["Depth", "30%", "Months active, recency-weighted"],
              ["Breadth", "20%", "Distinct meaningful repos"],
              ["Recognition", "35%", "Stars, merged PRs to 100★+ repos"],
              ["Specialization", "15%", "Concentration in a top language"],
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
                  <span className="text-[var(--muted)] transition-transform group-open:rotate-45">＋</span>
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
              Stop tailoring. Start being trusted.
            </h2>
            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Your profile takes 60 seconds. Then it works for you, forever.
            </p>
          </div>
          <Link href="/login">
            <Button size="lg" leftIcon={<Github className="h-4 w-4" />}>
              Claim your profile
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
      <dt className="num text-[20px] font-semibold leading-none tracking-tight">
        {k}
      </dt>
      <dd className="mt-2 text-[12px] leading-[1.4] text-[var(--muted)]">{v}</dd>
    </div>
  );
}

function SignalCard({
  state, index, title, body, visual,
}: {
  state: "live" | "next" | "soon";
  index: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  const label =
    state === "live" ? "Live" : state === "next" ? "Next" : "Roadmap";
  const tone =
    state === "live"
      ? "verified"
      : state === "next"
      ? "outline"
      : "neutral";
  return (
    <div className="relative flex flex-col gap-5 border-b border-r border-[var(--border)] p-6 last:border-r-0 md:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(4)]:border-r-0 md:[&:nth-child(n+3)]:border-b-0 lg:[&:nth-child(n+2)]:border-b-0">
      <div className="flex items-center justify-between">
        <span className="num text-[11px] tracking-[0.14em] text-[var(--muted-2)]">
          {index}
        </span>
        <Badge tone={tone as any}>
          {state === "live" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--verified)]" />}
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
        { line: "hr@stripe.com", k: "Confirmed Staff Eng · 2022–2024" },
        { line: "hr@datadog.com", k: "Confirmed Senior SWE · 2019–2022" },
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
          <div key={v} className="num rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-[11px]">
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
              "h-5 w-5 rounded-[3px] " +
              (d < 10
                ? "bg-[var(--foreground)]"
                : "border border-[var(--border-strong)] bg-transparent")
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

function HeroProfileDemo() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* glow */}
      <div
        className="absolute -inset-10 rounded-[28px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_12%,transparent),transparent)] blur-[2px]"
        aria-hidden
      />
      {/* window chrome */}
      <Card className="relative overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45),0_0_0_1px_var(--border)]">
        {/* chrome strip */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="num flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] text-[var(--muted)]">
            <span className="h-1 w-1 rounded-full bg-[var(--verified)]" />
            truehire.dev/sample-dev
          </div>
          <div className="w-10" />
        </div>

        {/* content */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[var(--score-track)]">
              <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-[var(--muted)]">sd</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">Sam Devlin</div>
              <div className="truncate text-[12px] text-[var(--muted)]">@sample-dev · Senior infra engineer</div>
            </div>
            <Badge tone="verified" className="ml-auto">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
            <ScoreRing score={82} size={136} />
            <div className="flex flex-col gap-3">
              <MiniBar label="Depth" value={88} />
              <MiniBar label="Breadth" value={71} />
              <MiniBar label="Recognition" value={84} />
              <MiniBar label="Specialization" value={76} />
            </div>
          </div>

          <div className="mt-7 border-t border-[var(--border)] pt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
              <span>Top evidence</span>
              <span>weight</span>
            </div>
            <ul className="space-y-2.5">
              {[
                { repo: "kubernetes/kubernetes", stars: "112k", note: "14 PRs merged", weight: 96 },
                { repo: "sample-dev/warp-cache", stars: "3.2k", note: "authored", weight: 72 },
                { repo: "grafana/loki", stars: "24k", note: "6 PRs merged", weight: 61 },
              ].map((r) => (
                <li key={r.repo} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{r.repo}</div>
                    <div className="num mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                      <Star className="h-3 w-3" /> {r.stars}
                      <span className="text-[var(--muted-2)]">·</span>
                      <GitPullRequest className="h-3 w-3" /> {r.note}
                    </div>
                  </div>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--score-track)]">
                    <div
                      className="h-full rounded-full bg-[var(--score-fill)]"
                      style={{ width: `${r.weight}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--muted-2)]">
            <Sparkles className="h-3 w-3" />
            Derived weekly from GitHub · last verified 2h ago
          </div>
        </div>
      </Card>

      {/* floating score chip — the share badge */}
      <div className="absolute -right-4 -top-4 hidden rotate-[3deg] md:block">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">TrueHire</div>
          <div className="num mt-1 text-3xl font-semibold leading-none">82<span className="text-base text-[var(--muted)]">/100</span></div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </div>
      <div className="relative h-1 w-28 rounded-full bg-[var(--score-track)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--score-fill)]" style={{ width: `${value}%` }} />
      </div>
      <div className="num w-8 text-right text-[12px]">{value}</div>
    </div>
  );
}

const faqs = [
  {
    q: "Why GitHub first?",
    a: "Because it's the one signal that exists at scale today without asking anyone's permission. Years of public commits cannot be fabricated in a weekend. Other signals — employer verification, reputation bonds, paid auditions — come next.",
  },
  {
    q: "Can I edit my profile?",
    a: "No. The entire point is that nothing on a TrueHire profile is written by the candidate. If it's on your profile, it came from a verifiable source. We surface the raw evidence so recruiters can audit every number.",
  },
  {
    q: "What if I don't have much GitHub history?",
    a: "MVP focuses on engineers with public code. If that's not you yet, the score will be low — that's honest. As we ship signals 2–4, non-code credentials (verified employment, references, auditions) open the door for more profiles.",
  },
  {
    q: "How do you stop gaming (bot commits, bought stars)?",
    a: "Recognition credits only high-star repos and merged PRs into them. Depth requires sustained months of activity, not a recent burst. We detect and discount star-spikes. Gaming enough signals to materially move a score is substantially harder than real work.",
  },
  {
    q: "Is this free?",
    a: "Yes — public profiles and weekly score refresh will stay free. Paid tiers (manual refresh, private mode, verified PDF export, recruiter search) come later.",
  },
];
