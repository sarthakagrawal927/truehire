import { describe, expect, it } from 'vitest';
import { buildResumeClaimAuditReport } from './resume-claim-audit';
import type { EvidenceEntry } from './scoring/types';

const evidence: EvidenceEntry[] = [
  {
    repoFullName: 'ada/next-worker',
    stars: 820,
    commits: 340,
    mergedPrs: 0,
    isAuthor: true,
    primaryLanguage: 'TypeScript',
    weight: 92,
    craftTags: ['CI', 'tests', 'docs', 'releases'],
  },
  {
    repoFullName: 'cloudflare/workers-sdk',
    stars: 3200,
    commits: 22,
    mergedPrs: 6,
    isAuthor: false,
    primaryLanguage: 'TypeScript',
    weight: 64,
    craftTags: ['CI'],
  },
];

describe('resume claim audit', () => {
  it('separates resume claims into verified, partial, and unverified findings', () => {
    const report = buildResumeClaimAuditReport({
      resumeText:
        'Senior TypeScript React engineer with Cloudflare API ownership, testing, CI, documentation, and Rust systems work.',
      evidence,
      score: {
        languages: [
          { language: 'TypeScript', share: 0.72, commits: 900 },
          { language: 'JavaScript', share: 0.18, commits: 210 },
        ],
      },
    });

    expect(report.summary.claimCount).toBeGreaterThan(0);
    expect(report.summary.verifiedCount).toBeGreaterThan(0);
    expect(report.summary.unverifiedCount).toBeGreaterThan(0);
    expect(report.verifiedClaims.map((finding) => finding.claim)).toContain('TypeScript');
    expect(report.unverifiedClaims.map((finding) => finding.claim)).toContain('Rust');
    expect(report.summary.coverageScore).toBeGreaterThan(0);
    expect(report.summary.coverageScore).toBeLessThan(100);
  });

  it('keeps unverified claims framed as evidence gaps, not negative skill claims', () => {
    const report = buildResumeClaimAuditReport({
      resumeText: 'Rust Kubernetes observability engineer.',
      evidence: [],
      score: { languages: [] },
    });

    expect(report.verifiedClaims).toEqual([]);
    expect(report.unverifiedClaims.length).toBeGreaterThan(0);
    expect(report.unverifiedClaims[0]?.reason).toContain('No matching public GitHub evidence');
    expect(report.caveats.join(' ')).toMatch(/does not prove the candidate lacks the skill/i);
  });

  it('returns no claims when the resume has no known technical requirements', () => {
    const report = buildResumeClaimAuditReport({
      resumeText: 'Collaborative teammate with clear communication and ownership.',
      evidence,
      score: { languages: [] },
    });

    expect(report.summary).toMatchObject({
      claimCount: 0,
      verifiedCount: 0,
      partialCount: 0,
      unverifiedCount: 0,
      coverageScore: 0,
    });
    expect(report.findings).toEqual([]);
  });
});
