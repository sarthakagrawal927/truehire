import { describe, expect, it } from 'vitest';
import {
  buildRoleFitReport,
  buildRecruiterCandidateIntelligenceReport,
  buildShortlistComparisonReport,
  extractRoleRequirements,
  serializePublicRoleFitReport,
} from './role-fit';
import type { EvidenceEntry } from './scoring/types';

const evidence: EvidenceEntry[] = [
  {
    repoFullName: 'sarthak/next-platform',
    stars: 240,
    commits: 320,
    mergedPrs: 12,
    isAuthor: true,
    primaryLanguage: 'TypeScript',
    weight: 90,
    craftTags: ['CI', 'tests', 'docs', 'releases'],
  },
  {
    repoFullName: 'cloudflare/api-worker',
    stars: 80,
    commits: 110,
    mergedPrs: 6,
    isAuthor: false,
    primaryLanguage: 'JavaScript',
    weight: 42,
    craftTags: ['core contributor'],
  },
];

describe('role fit reports', () => {
  it('extracts normalized requirements from a job description', () => {
    const requirements = extractRoleRequirements(
      'We need a TypeScript engineer with React, Next.js, CI, tests, docs, and API experience.'
    );

    expect(requirements.map((requirement) => requirement.label)).toEqual(
      expect.arrayContaining([
        'TypeScript',
        'Frontend product engineering',
        'Backend/API engineering',
        'Testing discipline',
        'CI and release hygiene',
        'Documentation',
      ])
    );
  });

  it('maps requirements to verified repositories, languages, and score evidence', () => {
    const report = buildRoleFitReport({
      jobDescription: 'TypeScript React engineer with testing, CI, docs, and Cloudflare API work.',
      evidence,
      score: {
        languages: [
          { language: 'TypeScript', share: 0.72, commits: 800 },
          { language: 'JavaScript', share: 0.18, commits: 200 },
        ],
      },
    });

    expect(report.fitScore).toBeGreaterThan(45);
    const typescript = report.requirements.find(
      (result) => result.requirement.label === 'TypeScript'
    );
    expect(typescript?.strengths[0]).toMatchObject({
      repoFullName: 'sarthak/next-platform',
      primaryLanguage: 'TypeScript',
      commits: 320,
    });
    expect(typescript?.strengths[0]?.scoreEvidenceWeight).toBeGreaterThan(0);
  });

  it('separates gaps from verified strengths with remediation guidance', () => {
    const report = buildRoleFitReport({
      jobDescription: 'Rust systems engineer with Kubernetes and observability ownership.',
      evidence,
      score: { languages: [{ language: 'TypeScript', share: 0.9, commits: 900 }] },
    });

    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.verifiedStrengths.every((result) => !result.gap)).toBe(true);
    expect(report.gaps[0]?.remediation).toContain('public repo');
  });

  it('serializes only public report evidence', () => {
    const report = buildRoleFitReport({
      jobDescription: 'TypeScript engineer with CI and tests.',
      evidence,
      score: { languages: [{ language: 'TypeScript', share: 1, commits: 1000 }] },
    });

    const serialized = serializePublicRoleFitReport(report);
    expect(JSON.stringify(serialized)).not.toContain('dashboard');
    expect(serialized.requirements[0]?.strengths[0]).toEqual(
      expect.objectContaining({
        repoFullName: expect.any(String),
        commits: expect.any(Number),
        scoreEvidenceWeight: expect.any(Number),
      })
    );
  });

  it('ranks shortlist candidates by role fit before generic score', () => {
    const report = buildShortlistComparisonReport({
      jobDescription: 'TypeScript React engineer with testing, CI, docs, and Cloudflare API work.',
      candidates: [
        {
          handle: 'generalist',
          name: 'Generalist',
          profileUrl: '/generalist',
          overallScore: 95,
          signal1: 95,
          signal2: 0,
          totalRepos: 30,
          monthsActive: 60,
          computedAt: '2026-05-08T12:00:00.000Z',
          evidence: [
            {
              repoFullName: 'generalist/rust-tools',
              stars: 400,
              commits: 500,
              mergedPrs: 10,
              isAuthor: true,
              primaryLanguage: 'Rust',
              weight: 96,
              craftTags: ['systems'],
            },
          ],
          languages: [{ language: 'Rust', share: 0.9, commits: 900 }],
        },
        {
          handle: 'frontend-fit',
          name: 'Frontend Fit',
          profileUrl: '/frontend-fit',
          overallScore: 80,
          signal1: 80,
          signal2: 0,
          totalRepos: 12,
          monthsActive: 30,
          computedAt: '2026-05-08T13:00:00.000Z',
          evidence,
          languages: [
            { language: 'TypeScript', share: 0.72, commits: 800 },
            { language: 'JavaScript', share: 0.18, commits: 200 },
          ],
        },
      ],
    });

    expect(report.candidates[0]?.handle).toBe('frontend-fit');
    expect(report.candidates[0]?.rank).toBe(1);
    expect(report.candidates[0]?.computedAt).toBe('2026-05-08T13:00:00.000Z');
    expect(report.summary).toMatchObject({
      candidateCount: 2,
      topCandidateHandle: 'frontend-fit',
    });
    expect(report.summary.averageFitScore).toBeGreaterThan(0);
    expect(report.summary.strongestRequirement).toBeTruthy();
  });

  it('builds an evidence-backed recruiter candidate intelligence report', () => {
    const report = buildRecruiterCandidateIntelligenceReport({
      jobDescription: 'TypeScript React engineer with testing, CI, docs, and Cloudflare API work.',
      evidence,
      score: {
        languages: [
          { language: 'TypeScript', share: 0.72, commits: 800 },
          { language: 'JavaScript', share: 0.18, commits: 200 },
        ],
      },
    });

    expect(report.fit.score).toBeGreaterThan(45);
    expect(report.fit.verifiedRequirementCount).toBeGreaterThan(0);
    expect(report.strengths[0]?.evidence[0]?.repoFullName).toBe('sarthak/next-platform');
    expect(report.evidenceLinks[0]).toEqual(
      expect.objectContaining({
        url: 'https://github.com/sarthak/next-platform',
        reason: expect.stringContaining('commits'),
      })
    );
    expect(JSON.stringify(report)).not.toMatch(/bio|self-declared|claimed/i);
    expect(report.followUpQuestions.length).toBeGreaterThan(0);
  });

  it('reports missing evidence as a recruiter risk instead of inventing claims', () => {
    const report = buildRecruiterCandidateIntelligenceReport({
      jobDescription: 'Rust systems engineer with Kubernetes ownership.',
      evidence: [],
      score: { languages: [] },
    });

    expect(report.strengths).toEqual([]);
    expect(report.risks[0]?.title).toBe('No repository evidence available');
    expect(report.evidenceLinks).toEqual([]);
  });
});
