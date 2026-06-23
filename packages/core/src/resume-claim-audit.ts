import type { EvidenceEntry, ScoreBreakdown } from './scoring/types';
import {
  buildRoleFitReport,
  extractRoleRequirements,
  type RoleFitEvidence,
  type RoleFitRequirementResult,
} from './role-fit';

export type ResumeClaimStatus = 'verified' | 'partial' | 'unverified';

export type ResumeClaimAuditFinding = {
  id: string;
  claim: string;
  category: 'language' | 'framework' | 'practice' | 'domain';
  status: ResumeClaimStatus;
  score: number;
  reason: string;
  evidence: RoleFitEvidence[];
  followUpQuestion: string;
};

export type ResumeClaimAuditReport = {
  summary: {
    claimCount: number;
    verifiedCount: number;
    partialCount: number;
    unverifiedCount: number;
    coverageScore: number;
  };
  findings: ResumeClaimAuditFinding[];
  verifiedClaims: ResumeClaimAuditFinding[];
  partialClaims: ResumeClaimAuditFinding[];
  unverifiedClaims: ResumeClaimAuditFinding[];
  evidenceLinks: Array<{
    repoFullName: string;
    url: string;
    reason: string;
  }>;
  caveats: string[];
};

export function buildResumeClaimAuditReport(params: {
  resumeText: string;
  score: Pick<ScoreBreakdown, 'languages'>;
  evidence: EvidenceEntry[];
}): ResumeClaimAuditReport {
  const requirements = extractRoleRequirements(params.resumeText);
  const roleFit = buildRoleFitReport({
    jobDescription: params.resumeText,
    score: params.score,
    evidence: params.evidence,
  });

  const byId = new Map(roleFit.requirements.map((result) => [result.requirement.id, result]));
  const findings = requirements.map((requirement) => {
    const result = byId.get(requirement.id);
    return buildFinding(
      result ?? {
        requirement,
        score: 0,
        strengths: [],
        gap: true,
        remediation: `No public GitHub evidence was found for ${requirement.label}.`,
      }
    );
  });

  const verifiedClaims = findings.filter((finding) => finding.status === 'verified');
  const partialClaims = findings.filter((finding) => finding.status === 'partial');
  const unverifiedClaims = findings.filter((finding) => finding.status === 'unverified');
  const coverageScore =
    findings.length === 0
      ? 0
      : Math.round(
          findings.reduce((sum, finding) => sum + statusWeight(finding.status), 0) / findings.length
        );

  return {
    summary: {
      claimCount: findings.length,
      verifiedCount: verifiedClaims.length,
      partialCount: partialClaims.length,
      unverifiedCount: unverifiedClaims.length,
      coverageScore,
    },
    findings,
    verifiedClaims,
    partialClaims,
    unverifiedClaims,
    evidenceLinks: buildEvidenceLinks(params.evidence),
    caveats: [
      'Resume text is treated as candidate-supplied claims, not proof.',
      'Unverified means public GitHub evidence did not support the claim; it does not prove the candidate lacks the skill.',
      'Do not use absent public work as a proxy for protected attributes, employment constraints, private-repo work, or non-GitHub ecosystems.',
    ],
  };
}

function buildFinding(result: RoleFitRequirementResult): ResumeClaimAuditFinding {
  const status = deriveStatus(result.score, result.strengths.length);
  return {
    id: result.requirement.id,
    claim: result.requirement.label,
    category: result.requirement.category,
    status,
    score: result.score,
    reason: buildReason(result, status),
    evidence: result.strengths.slice(0, 3),
    followUpQuestion: buildFollowUpQuestion(result.requirement.label, status),
  };
}

function deriveStatus(score: number, evidenceCount: number): ResumeClaimStatus {
  if (score >= 65 && evidenceCount > 0) return 'verified';
  if (score >= 25 || evidenceCount > 0) return 'partial';
  return 'unverified';
}

function buildReason(result: RoleFitRequirementResult, status: ResumeClaimStatus) {
  if (status === 'verified') {
    const topRepo = result.strengths[0]?.repoFullName;
    return topRepo
      ? `Supported by public evidence, led by ${topRepo}.`
      : 'Supported by public language-share and contribution evidence.';
  }
  if (status === 'partial') {
    return result.strengths.length > 0
      ? 'Some public evidence matched, but coverage is not strong enough to treat the claim as verified.'
      : 'Language-share evidence matched, but no specific repository evidence supported the claim.';
  }
  return 'No matching public GitHub evidence was found for this resume claim.';
}

function buildFollowUpQuestion(claim: string, status: ResumeClaimStatus) {
  if (status === 'verified') {
    return `Which design tradeoff in your ${claim} work mattered most?`;
  }
  if (status === 'partial') {
    return `Can you share a concrete project or PR that proves your ${claim} experience?`;
  }
  return `The resume claims ${claim}; where can we verify that work?`;
}

function statusWeight(status: ResumeClaimStatus) {
  if (status === 'verified') return 100;
  if (status === 'partial') return 50;
  return 0;
}

function buildEvidenceLinks(evidence: EvidenceEntry[]) {
  return evidence.slice(0, 6).map((entry) => ({
    repoFullName: entry.repoFullName,
    url: `https://github.com/${entry.repoFullName}`,
    reason: [
      entry.isAuthor ? 'authored repo' : 'external contribution',
      `${entry.commits} commits`,
      `${entry.mergedPrs} merged PRs`,
      `${entry.stars} stars`,
      entry.primaryLanguage,
    ]
      .filter(Boolean)
      .join(' / '),
  }));
}
