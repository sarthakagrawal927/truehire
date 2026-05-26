"use client";

import { useState, useDeferredValue } from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ScoreBreakdown } from "./score-breakdown";

const EXAMPLE_JD =
  "We're hiring a Senior Backend Engineer with 5+ years of Go or Rust experience. Strong background in distributed systems, open source contributions, and cloud-native architecture (Kubernetes). Experience with CI/CD pipelines and automated testing is required. We'd love to see contributions to high-impact open source projects.";

type Dimension = {
  signal: string;
  weight: number;
  hint: string;
  measures: string;
  jdMapping: string;
  patterns: RegExp[];
};

const DIMENSIONS: Dimension[] = [
  {
    signal: "Depth",
    weight: 0.2,
    hint: "consistency",
    measures: "Months of sustained public activity, recency-weighted over 30 months",
    jdMapping: "years of experience · seniority level",
    patterns: [
      /\b\d\+?\s*years?\b/i,
      /\bsenior\b/i,
      /\blead\b/i,
      /\bstaff\b/i,
      /\bprincipal\b/i,
      /\bexperienced\b/i,
    ],
  },
  {
    signal: "Breadth",
    weight: 0.15,
    hint: "public GitHub",
    measures: "Distinct repos with ≥3 commits or ≥1 merged PR, capped at 40",
    jdMapping: "language & framework requirements · multi-stack experience",
    patterns: [
      /\bgo\b/i,
      /\brust\b/i,
      /\bpython\b/i,
      /\btypescript\b/i,
      /\bjavascript\b/i,
      /\bjava\b/i,
      /\bc\+\+\b/i,
      /\bnode\.?js\b/i,
      /\bfull.?stack\b/i,
    ],
  },
  {
    signal: "Recognition",
    weight: 0.3,
    hint: "portfolio",
    measures: "Stars on authored repos + merged PRs into ≥100★ repos",
    jdMapping: "open source contributions · community involvement · high-visibility work",
    patterns: [
      /\bopen.?source\b/i,
      /\boss\b/i,
      /\bcontribut/i,
      /\bcommunity\b/i,
      /\bmaintain/i,
      /\bkubernetes\b/i,
      /\blinux\b/i,
    ],
  },
  {
    signal: "Craft",
    weight: 0.2,
    hint: "portfolio",
    measures: "CI pipelines, test coverage, structured releases across top repos",
    jdMapping: "CI/CD practices · testing discipline · engineering quality",
    patterns: [
      /\bci\b/i,
      /\bcd\b/i,
      /\bci\/cd\b/i,
      /\btest/i,
      /\bdevops\b/i,
      /\bpipeline\b/i,
      /\bquality\b/i,
      /\breliab/i,
    ],
  },
  {
    signal: "Specialization",
    weight: 0.15,
    hint: "activity",
    measures: "Dominant-language concentration — piecewise 0–100",
    jdMapping: "expert-level depth in a specific language or domain",
    patterns: [/\bexpert\b/i, /\bspeciali/i, /\bdeep expertise\b/i, /\bcore competency\b/i],
  },
];

const SAMPLE_SCORES = [
  { label: "Depth", value: 88, weight: 0.2, hint: "consistency" },
  { label: "Breadth", value: 71, weight: 0.15, hint: "public GitHub" },
  { label: "Recognition", value: 84, weight: 0.3, hint: "portfolio" },
  { label: "Craft", value: 79, weight: 0.2, hint: "portfolio" },
  { label: "Specialization", value: 76, weight: 0.15, hint: "activity" },
];

export function JdEvaluator() {
  const [jd, setJd] = useState("");
  const [showSample, setShowSample] = useState(false);
  const deferred = useDeferredValue(jd);
  const hasText = deferred.trim().length > 0;

  const dims = DIMENSIONS.map((d) => ({
    ...d,
    matched: d.patterns.some((p) => p.test(deferred)),
  }));

  const matchedCount = dims.filter((d) => d.matched).length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Job description</CardTitle>
          <Badge tone="outline">no candidates needed</Badge>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-[13px] text-[var(--muted)]">
            Paste any job description to see which verified GitHub signals TrueHire will
            evaluate your candidates against.
          </p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={7}
            placeholder="Senior Go engineer with 5+ years of experience, open source contributions, strong CI/CD practices..."
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
          />
          {!hasText ? (
            <button
              type="button"
              onClick={() => setJd(EXAMPLE_JD)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            >
              Load a sample JD <ChevronRight className="h-3 w-3" />
            </button>
          ) : (
            <div className="mt-2 text-[12px] text-[var(--muted-2)]">
              {matchedCount} of {dims.length} dimensions matched from this description
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation dimensions</CardTitle>
          <Badge tone="outline">verified GitHub only</Badge>
        </CardHeader>
        <CardBody>
          {!hasText ? (
            <div className="flex items-center justify-center py-8 text-center text-[13px] text-[var(--muted)]">
              Paste a job description on the left to preview the mapping.
            </div>
          ) : (
            <div className="space-y-4">
              {dims.map((d) => (
                <div key={d.signal} className="flex gap-3">
                  {d.matched ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--verified)]" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{d.signal}</span>
                      <span className="text-[11px] text-[var(--muted-2)]">
                        {Math.round(d.weight * 100)}% weight
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">{d.measures}</div>
                    <div className="text-[11px] text-[var(--muted-2)]">
                      JD signals: {d.jdMapping}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {hasText && (
        <div className="lg:col-span-2">
          {!showSample ? (
            <button
              type="button"
              onClick={() => setShowSample(true)}
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            >
              See how a verified candidate compares{" "}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sample match · @sample-dev</CardTitle>
                <Badge tone="verified">82 · demo profile</Badge>
              </CardHeader>
              <CardBody>
                <p className="mb-4 text-[13px] text-[var(--muted)]">
                  Every row traces back to verifiable public GitHub data — no self-reported
                  skills or tailored resumes.
                </p>
                <ScoreBreakdown rows={SAMPLE_SCORES} />
                <div className="mt-5">
                  <Link href="/demo">
                    <Button
                      size="sm"
                      variant="outline"
                      rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                    >
                      View full sample profile
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
