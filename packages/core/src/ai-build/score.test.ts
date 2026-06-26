import { describe, expect, it } from 'vitest';
import { computeAiBuildScore, AI_BUILD_WEIGHTS, AI_BUILD_SCHEMA_VERSION } from './score';
import type { AiBuildDimensionId, AiBuildSignals } from './types';

const scoreOf = (signals: AiBuildSignals, id: AiBuildDimensionId): number | null =>
  computeAiBuildScore(signals).dimensions.find((d) => d.id === id)?.score ?? null;

describe('computeAiBuildScore — shape', () => {
  it('returns six dimensions in a stable order with the fixed weights', () => {
    const r = computeAiBuildScore({});
    expect(r.schemaVersion).toBe(AI_BUILD_SCHEMA_VERSION);
    expect(r.dimensions.map((d) => d.id)).toEqual([
      'signalClarity',
      'buildStability',
      'decisionWeight',
      'recoveryVelocity',
      'contextCommand',
      'orchestrationRange',
    ]);
    for (const d of r.dimensions) expect(d.weight).toBe(AI_BUILD_WEIGHTS[d.id]);
    expect(Object.values(AI_BUILD_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('empty signals → every dimension null, composite null, completeness 0', () => {
    const r = computeAiBuildScore({});
    expect(r.composite).toBeNull();
    expect(r.dimensions.every((d) => d.score === null)).toBe(true);
    expect(r.dimensions.every((d) => d.evidence.length === 0)).toBe(true);
    expect(r.dataCompleteness).toBe(0);
  });

  it('records evidence strings for present signals', () => {
    const r = computeAiBuildScore({ firstShotAcceptRate: 0.85 });
    const clarity = r.dimensions.find((d) => d.id === 'signalClarity');
    expect(clarity?.evidence).toContain('first-shot accept: 100');
  });
});

describe('linear mapping (via Signal Clarity · first-shot accept)', () => {
  it('clamps to 0 at/below floor', () => {
    expect(scoreOf({ firstShotAcceptRate: 0.2 }, 'signalClarity')).toBe(0);
    expect(scoreOf({ firstShotAcceptRate: 0.1 }, 'signalClarity')).toBe(0);
  });
  it('clamps to 100 at/above ceiling', () => {
    expect(scoreOf({ firstShotAcceptRate: 0.85 }, 'signalClarity')).toBe(100);
    expect(scoreOf({ firstShotAcceptRate: 1 }, 'signalClarity')).toBe(100);
  });
  it('interpolates linearly in between', () => {
    expect(scoreOf({ firstShotAcceptRate: 0.525 }, 'signalClarity')).toBe(50);
  });
});

describe('inverse mapping (via Signal Clarity · turns per task)', () => {
  it('100 at/below best', () => {
    expect(scoreOf({ avgTurnsPerTask: 1.5 }, 'signalClarity')).toBe(100);
    expect(scoreOf({ avgTurnsPerTask: 1 }, 'signalClarity')).toBe(100);
  });
  it('0 at/above worst', () => {
    expect(scoreOf({ avgTurnsPerTask: 10 }, 'signalClarity')).toBe(0);
    expect(scoreOf({ avgTurnsPerTask: 20 }, 'signalClarity')).toBe(0);
  });
  it('interpolates (lower is better)', () => {
    expect(scoreOf({ avgTurnsPerTask: 5.75 }, 'signalClarity')).toBe(50);
  });
});

describe('prompt-length piecewise (via Signal Clarity)', () => {
  it('terse band (< 15 words)', () => {
    expect(scoreOf({ avgPromptWords: 5 }, 'signalClarity')).toBe(0);
    expect(scoreOf({ avgPromptWords: 10 }, 'signalClarity')).toBe(30);
  });
  it('sweet-spot band (15–150 words)', () => {
    expect(scoreOf({ avgPromptWords: 47.5 }, 'signalClarity')).toBe(80);
    expect(scoreOf({ avgPromptWords: 150 }, 'signalClarity')).toBe(100);
  });
  it('rambling band (> 150 words)', () => {
    expect(scoreOf({ avgPromptWords: 225 }, 'signalClarity')).toBe(60);
    expect(scoreOf({ avgPromptWords: 300 }, 'signalClarity')).toBe(20);
  });
});

describe('Signal Clarity · model range gate (> 1)', () => {
  it('counts when more than one model', () => {
    expect(scoreOf({ modelCount: 3 }, 'signalClarity')).toBe(50);
  });
  it('ignored at a single model (gate off)', () => {
    expect(scoreOf({ modelCount: 1 }, 'signalClarity')).toBeNull();
  });
});

describe('Build Stability', () => {
  it('averages the survival/error/test/build signals', () => {
    // all four map to mid-range 50 → average 50
    const s: AiBuildSignals = {
      aiLineSurvivalRate: 0.725, // mid of 0.5..0.95
      errorFixRate: 0.625, // mid of 0.3..0.95
      testAfterAiRate: 0.4, // mid of 0.1..0.7
      buildSuccessRate: 0.575, // mid of 0.3..0.85
    };
    expect(scoreOf(s, 'buildStability')).toBe(50);
  });
  it('errors-per-block uses the inverse mapping', () => {
    expect(scoreOf({ errorsPerAiBlock: 0.01 }, 'buildStability')).toBe(100);
    expect(scoreOf({ errorsPerAiBlock: 0.2 }, 'buildStability')).toBe(0);
  });
  it('post-AI edit piecewise (stability lens)', () => {
    expect(scoreOf({ postAiEditRate: 0.01 }, 'buildStability')).toBe(30);
    expect(scoreOf({ postAiEditRate: 0.1 }, 'buildStability')).toBe(80);
    expect(scoreOf({ postAiEditRate: 0.5 }, 'buildStability')).toBe(50);
  });
  it('qualified leverage needs both leverage and survival', () => {
    // survival 1.0 → 100; leverage 21*1.0=21 → linear(21,1.5,40)≈50.6; avg → 75
    expect(scoreOf({ leverageRatio: 21, aiLineSurvivalRate: 1 }, 'buildStability')).toBe(75);
    // leverage alone → no qualified-leverage sub
    expect(scoreOf({ leverageRatio: 21 }, 'buildStability')).toBeNull();
  });
});

describe('Decision Weight', () => {
  it('plan count + complexity', () => {
    expect(scoreOf({ planCount: 20 }, 'decisionWeight')).toBe(50); // linear(20,0,40)
    expect(scoreOf({ avgPlanComplexity: 110 }, 'decisionWeight')).toBe(50); // linear(110,20,200)
  });
  it('planning frequency gated on sessions', () => {
    // planCount alone → only the plan-count sub (50)
    expect(scoreOf({ planCount: 20 }, 'decisionWeight')).toBe(50);
    // with sessions: avg of plan-count(50) and frequency linear(20/40=0.5 → 100) → 75
    expect(scoreOf({ planCount: 20, totalSessions: 40 }, 'decisionWeight')).toBe(75);
    // sessions = 0 → frequency gate off, back to 50
    expect(scoreOf({ planCount: 20, totalSessions: 0 }, 'decisionWeight')).toBe(50);
  });
  it('post-AI edit piecewise (judgment lens)', () => {
    expect(scoreOf({ postAiEditRate: 0.03 }, 'decisionWeight')).toBe(30);
    expect(scoreOf({ postAiEditRate: 0.05 }, 'decisionWeight')).toBe(70);
    expect(scoreOf({ postAiEditRate: 0.2 }, 'decisionWeight')).toBe(100);
    expect(scoreOf({ postAiEditRate: 0.5 }, 'decisionWeight')).toBe(50);
  });
});

describe('Recovery Velocity', () => {
  it('debug-to-generate ratio gated on AI code blocks', () => {
    // terminal 275 / (5500/100 = 55) = 5 → linear(5,0.5,5)=100
    expect(
      scoreOf({ terminalCommandCount: 275, totalAiCodeBlocks: 5500 }, 'recoveryVelocity')
    ).toBe(100);
    // no code blocks → gate off → no sub → null
    expect(
      scoreOf({ terminalCommandCount: 275, totalAiCodeBlocks: 0 }, 'recoveryVelocity')
    ).toBeNull();
  });
  it('recovery-quality proxy needs fix-rate and errors-per-block', () => {
    // errorFix 0.95 (→100), errorsPerBlock 0.01 (→inverse 100), proxy:
    // 0.95*(1-0.05)=0.9025 → linear(0.9025,0.2,0.9)=100 → avg(100,100,100)=100
    expect(scoreOf({ errorFixRate: 0.95, errorsPerAiBlock: 0.01 }, 'recoveryVelocity')).toBe(100);
  });
});

describe('Context Command — reward-only gates', () => {
  it('checkpoint frequency + deep sessions gate on sessions', () => {
    // commits 40 / sessions 40 = 1 → linear(1,0.2,2.0) ≈ 44.4
    expect(scoreOf({ totalScoredCommits: 40, totalSessions: 40 }, 'contextCommand')).toBe(44);
    expect(scoreOf({ totalScoredCommits: 40, totalSessions: 0 }, 'contextCommand')).toBeNull();
  });
  it('clarity synergy needs first-shot AND reference usage', () => {
    // 0.5 * 0.5 * 200 = 50; referenceUsage also adds linear(0.5,0.1,0.65)≈72.7
    // avg(72.7, 50) ≈ 61
    expect(scoreOf({ firstShotAcceptRate: 0.5, referenceUsageRate: 0.5 }, 'contextCommand')).toBe(
      61
    );
  });
  it('MCP / active-surface signals are reward-only (off when zero/one)', () => {
    expect(scoreOf({ mcpServerCount: 0 }, 'contextCommand')).toBeNull();
    expect(scoreOf({ mcpToolCalls: 0 }, 'contextCommand')).toBeNull();
    expect(scoreOf({ activeSurfaceCount: 1 }, 'contextCommand')).toBeNull();
    expect(scoreOf({ mcpServerCount: 5 }, 'contextCommand')).toBe(100);
    expect(scoreOf({ activeSurfaceCount: 3 }, 'contextCommand')).toBe(50);
  });
});

describe('Orchestration Range', () => {
  it('tool/agent/model breadth', () => {
    expect(scoreOf({ uniqueToolCount: 5.5 }, 'orchestrationRange')).toBe(50); // linear(5.5,1,10)
    expect(scoreOf({ totalSessions: 102.5 }, 'orchestrationRange')).toBe(50); // linear(.,5,200)
  });
  it('reward-only sub-agent + mcp signals (off when zero)', () => {
    expect(scoreOf({ subagentDispatches: 0 }, 'orchestrationRange')).toBeNull();
    expect(scoreOf({ sessionsWithSubagents: 0 }, 'orchestrationRange')).toBeNull();
    expect(scoreOf({ subagentDispatches: 30 }, 'orchestrationRange')).toBe(50);
  });
  it('multi-surface count rewards working across surfaces (> 1)', () => {
    // two surfaces present → linear(2,1,4) ≈ 33.3; combined with the two
    // contributing sub-signals below
    const oneSurface = computeAiBuildScore({ totalAiCodeBlocks: 10 });
    // single surface → no multi-surface sub; only contributes elsewhere
    expect(
      oneSurface.dimensions
        .find((d) => d.id === 'orchestrationRange')
        ?.evidence.some((e) => e.startsWith('multi-surface'))
    ).toBe(false);
    const twoSurfaces = computeAiBuildScore({ totalAiCodeBlocks: 10, terminalCommandCount: 5 });
    expect(
      twoSurfaces.dimensions
        .find((d) => d.id === 'orchestrationRange')
        ?.evidence.some((e) => e.startsWith('multi-surface'))
    ).toBe(true);
  });
});

describe('composite + data completeness', () => {
  it('weights only the dimensions that could be scored, renormalized', () => {
    // only Signal Clarity scorable → composite equals its score
    const r = computeAiBuildScore({ firstShotAcceptRate: 0.525 });
    expect(r.composite).toBe(50);
  });

  it('blends two dimensions by their relative weights', () => {
    // signalClarity=100 (w .18), buildStability=0 (w .22). buildSuccessRate
    // lives ONLY in buildStability, so the two dimensions stay isolated.
    // composite = (100*.18 + 0*.22)/(.18+.22) = 18/.40 = 45
    const r = computeAiBuildScore({ firstShotAcceptRate: 0.85, buildSuccessRate: 0.3 });
    expect(r.composite).toBe(45);
  });

  it('dataCompleteness is the fraction of known signals present', () => {
    expect(computeAiBuildScore({}).dataCompleteness).toBe(0);
    // 1 of 33 known signals
    expect(computeAiBuildScore({ totalSessions: 5 }).dataCompleteness).toBeCloseTo(0.03, 2);
  });

  it('a fully-populated profile scores every dimension and completeness 1', () => {
    const full: Required<AiBuildSignals> = {
      totalSessions: 120,
      projectCount: 8,
      aiUsageSpanDays: 200,
      modelCount: 3,
      totalScoredCommits: 80,
      totalAiCodeBlocks: 4000,
      planCount: 25,
      avgPlanComplexity: 120,
      deepSessionCount: 40,
      firstShotAcceptRate: 0.6,
      avgTurnsPerTask: 3,
      referenceUsageRate: 0.4,
      correctionConvergenceRate: 0.7,
      avgPromptWords: 60,
      aiLineSurvivalRate: 0.85,
      errorFixRate: 0.8,
      testAfterAiRate: 0.5,
      errorsPerAiBlock: 0.05,
      buildSuccessRate: 0.7,
      postAiEditRate: 0.12,
      leverageRatio: 15,
      terminalCommandCount: 600,
      composerRatio: 0.6,
      agentModeRatio: 0.5,
      uniqueToolCount: 8,
      cliAiToolCount: 2,
      cliAiCommandCount: 50,
      maxParallelAgents: 3,
      subagentDispatches: 30,
      sessionsWithSubagents: 8,
      mcpServerCount: 3,
      mcpToolCalls: 25,
      activeSurfaceCount: 4,
    };
    const r = computeAiBuildScore(full);
    expect(r.dataCompleteness).toBe(1);
    expect(r.composite).not.toBeNull();
    expect(r.dimensions.every((d) => d.score !== null && d.score >= 0 && d.score <= 100)).toBe(
      true
    );
  });
});
