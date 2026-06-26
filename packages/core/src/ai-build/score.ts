import type { AiBuildDimension, AiBuildDimensionId, AiBuildResult, AiBuildSignals } from './types';

/**
 * AI-build scorer — pure functions, no IO. Faithful TypeScript port of
 * nextmillionai's `scoring.py` six-dimension model.
 *
 * Conventions mirrored from the Python original:
 *  - every sub-signal maps through `linear` / `inverse` / a piecewise block to
 *    a 0-100 float; a dimension is the (clamped, rounded) average of whatever
 *    sub-signals were present;
 *  - missing signals are omitted (never a zero penalty);
 *  - "reward-only" signals (MCP, sub-agents, extra surfaces) only count when
 *    present and > 0, so their absence can't drag a score down.
 *
 * v1 uses FIXED weights (nextmillionai's work-mode adaptation, archetypes and
 * titles are intentionally deferred).
 */

export const AI_BUILD_SCHEMA_VERSION = '1.0';

// Weights sum to 1.0. Build Stability carries the most weight: code that
// survives is the strongest evidence of building well with AI.
const W = {
  signalClarity: 0.18,
  buildStability: 0.22,
  decisionWeight: 0.18,
  recoveryVelocity: 0.15,
  contextCommand: 0.12,
  orchestrationRange: 0.15,
} as const;

const DIMENSION_NAMES: Record<AiBuildDimensionId, string> = {
  signalClarity: 'Signal Clarity',
  buildStability: 'Build Stability',
  decisionWeight: 'Decision Weight',
  recoveryVelocity: 'Recovery Velocity',
  contextCommand: 'Context Command',
  orchestrationRange: 'Orchestration Range',
};

// ─────────────────── helpers ───────────────────

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** 0 at/below floor, 100 at/above ceiling, linear in between. */
function linear(val: number, floor: number, ceiling: number): number {
  if (val <= floor) return 0;
  if (val >= ceiling) return 100;
  return ((val - floor) / (ceiling - floor)) * 100;
}

/** 100 at/below best, 0 at/above worst, linear in between (lower is better). */
function inverse(val: number, best: number, worst: number): number {
  if (val <= best) return 100;
  if (val >= worst) return 0;
  return ((worst - val) / (worst - best)) * 100;
}

/** Prompt-length sweet spot: too terse or too rambling both score lower. */
function promptWordsScore(w: number): number {
  if (w < 15) return clamp(linear(w, 5, 15) * 0.6);
  if (w <= 150) return clamp(60 + linear(w, 15, 80) * 0.4);
  return clamp(inverse(w, 150, 300) * 0.8 + 20);
}

/** Post-AI edit rate as a stability signal (some editing is healthy). */
function stabilityPostEditScore(r: number): number {
  if (r < 0.02) return 30;
  if (r <= 0.3) return clamp(60 + linear(r, 0.05, 0.15) * 0.4);
  return clamp(inverse(r, 0.3, 0.7) * 0.6 + 20);
}

/** Post-AI edit rate as a judgment signal (reviewing/overriding AI output). */
function decisionPostEditScore(r: number): number {
  if (r < 0.05) return 30; // insufficient review
  if (r <= 0.3) return clamp(70 + linear(r, 0.05, 0.2) * 30);
  return 50; // over-editing
}

/**
 * Accumulates optional sub-signal scores for one dimension. A sub-signal is
 * only `add`ed when its source value is present (and any gate passes), so the
 * average reflects exactly the evidence available.
 */
function dimension(id: AiBuildDimensionId) {
  const subs: number[] = [];
  const evidence: string[] = [];
  return {
    add(score: number, label: string) {
      subs.push(score);
      evidence.push(`${label}: ${Math.round(score)}`);
    },
    result(): AiBuildDimension {
      const score =
        subs.length === 0 ? null : clamp(Math.round(subs.reduce((a, b) => a + b, 0) / subs.length));
      return { id, name: DIMENSION_NAMES[id], score, weight: W[id], evidence };
    },
  };
}

const has = (v: number | undefined): v is number => v !== undefined;

// ─────────────────── dimensions ───────────────────

function signalClarity(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('signalClarity');
  if (has(s.firstShotAcceptRate))
    d.add(linear(s.firstShotAcceptRate, 0.2, 0.85), 'first-shot accept');
  if (has(s.avgTurnsPerTask)) d.add(inverse(s.avgTurnsPerTask, 1.5, 10), 'turns per task');
  if (has(s.referenceUsageRate)) d.add(linear(s.referenceUsageRate, 0.05, 0.6), 'reference usage');
  if (has(s.correctionConvergenceRate))
    d.add(linear(s.correctionConvergenceRate, 0.3, 0.9), 'correction convergence');
  if (has(s.avgPromptWords)) d.add(promptWordsScore(s.avgPromptWords), 'prompt length');
  if (has(s.modelCount) && s.modelCount > 1) d.add(linear(s.modelCount, 1, 5), 'model range');
  return d.result();
}

function buildStability(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('buildStability');
  if (has(s.aiLineSurvivalRate)) d.add(linear(s.aiLineSurvivalRate, 0.5, 0.95), 'AI line survival');
  if (has(s.errorFixRate)) d.add(linear(s.errorFixRate, 0.3, 0.95), 'error fix rate');
  if (has(s.testAfterAiRate)) d.add(linear(s.testAfterAiRate, 0.1, 0.7), 'tests after AI');
  if (has(s.errorsPerAiBlock)) d.add(inverse(s.errorsPerAiBlock, 0.01, 0.2), 'errors per block');
  if (has(s.buildSuccessRate)) d.add(linear(s.buildSuccessRate, 0.3, 0.85), 'build success');
  if (has(s.postAiEditRate)) d.add(stabilityPostEditScore(s.postAiEditRate), 'post-AI edits');
  if (has(s.leverageRatio) && has(s.aiLineSurvivalRate))
    d.add(linear(s.leverageRatio * s.aiLineSurvivalRate, 1.5, 40), 'qualified leverage');
  return d.result();
}

function decisionWeight(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('decisionWeight');
  if (has(s.planCount)) d.add(linear(s.planCount, 0, 40), 'plan count');
  if (has(s.avgPlanComplexity)) d.add(linear(s.avgPlanComplexity, 20, 200), 'plan complexity');
  if (has(s.referenceUsageRate)) d.add(linear(s.referenceUsageRate, 0.05, 0.6), 'reference usage');
  if (has(s.planCount) && has(s.totalSessions) && s.totalSessions > 0)
    d.add(linear(s.planCount / s.totalSessions, 0.05, 0.5), 'planning frequency');
  if (has(s.composerRatio)) d.add(linear(s.composerRatio, 0.3, 0.8), 'composer ratio');
  if (has(s.postAiEditRate)) d.add(decisionPostEditScore(s.postAiEditRate), 'judgment via edits');
  return d.result();
}

function recoveryVelocity(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('recoveryVelocity');
  if (has(s.errorFixRate)) d.add(linear(s.errorFixRate, 0.3, 0.95), 'error fix rate');
  if (has(s.correctionConvergenceRate))
    d.add(linear(s.correctionConvergenceRate, 0.3, 0.9), 'correction convergence');
  if (has(s.errorsPerAiBlock)) d.add(inverse(s.errorsPerAiBlock, 0.01, 0.2), 'errors per block');
  if (has(s.terminalCommandCount) && has(s.totalAiCodeBlocks) && s.totalAiCodeBlocks > 0)
    d.add(
      linear(s.terminalCommandCount / (s.totalAiCodeBlocks / 100), 0.5, 5),
      'debug-to-generate'
    );
  if (has(s.errorFixRate) && has(s.errorsPerAiBlock))
    d.add(
      linear(s.errorFixRate * (1 - Math.min(1, s.errorsPerAiBlock * 5)), 0.2, 0.9),
      'recovery quality'
    );
  return d.result();
}

function contextCommand(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('contextCommand');
  if (has(s.referenceUsageRate)) d.add(linear(s.referenceUsageRate, 0.1, 0.65), 'reference usage');
  if (has(s.totalScoredCommits) && has(s.totalSessions) && s.totalSessions > 0)
    d.add(linear(s.totalScoredCommits / s.totalSessions, 0.2, 2.0), 'checkpoint frequency');
  if (has(s.projectCount)) d.add(linear(s.projectCount, 1, 12), 'project breadth');
  if (has(s.firstShotAcceptRate) && has(s.referenceUsageRate))
    d.add(clamp(s.firstShotAcceptRate * s.referenceUsageRate * 200), 'clarity synergy');
  if (has(s.aiUsageSpanDays)) d.add(linear(s.aiUsageSpanDays, 7, 180), 'usage span');
  if (has(s.mcpServerCount) && s.mcpServerCount > 0)
    d.add(linear(s.mcpServerCount, 0, 5), 'MCP servers');
  if (has(s.mcpToolCalls) && s.mcpToolCalls > 0) d.add(linear(s.mcpToolCalls, 0, 50), 'MCP calls');
  if (has(s.deepSessionCount) && has(s.totalSessions) && s.totalSessions > 0)
    d.add(linear(s.deepSessionCount / s.totalSessions, 0.1, 0.6), 'deep sessions');
  if (has(s.activeSurfaceCount) && s.activeSurfaceCount > 1)
    d.add(linear(s.activeSurfaceCount, 1, 5), 'active surfaces');
  return d.result();
}

function orchestrationRange(s: AiBuildSignals): AiBuildDimension {
  const d = dimension('orchestrationRange');
  if (has(s.uniqueToolCount)) d.add(linear(s.uniqueToolCount, 1, 10), 'unique tools');
  if (has(s.composerRatio)) d.add(linear(s.composerRatio, 0.1, 0.8), 'composer ratio');
  if (has(s.agentModeRatio)) d.add(linear(s.agentModeRatio, 0.1, 0.7), 'agent mode ratio');
  if (has(s.mcpServerCount) && s.mcpServerCount > 0)
    d.add(linear(s.mcpServerCount, 0, 5), 'MCP servers');
  if (has(s.cliAiToolCount)) d.add(linear(s.cliAiToolCount, 0, 4), 'CLI AI tools');
  if (has(s.cliAiCommandCount)) d.add(linear(s.cliAiCommandCount, 0, 80), 'CLI AI commands');
  if (has(s.maxParallelAgents)) d.add(linear(s.maxParallelAgents, 1, 5), 'parallel agents');
  if (has(s.subagentDispatches) && s.subagentDispatches > 0)
    d.add(linear(s.subagentDispatches, 0, 60), 'sub-agent dispatches');
  if (has(s.sessionsWithSubagents) && s.sessionsWithSubagents > 0)
    d.add(linear(s.sessionsWithSubagents, 0, 15), 'sessions with sub-agents');
  if (has(s.mcpToolCalls) && s.mcpToolCalls > 0) d.add(linear(s.mcpToolCalls, 0, 50), 'MCP calls');
  if (has(s.modelCount)) d.add(linear(s.modelCount, 1, 5), 'model range');
  if (has(s.totalSessions)) d.add(linear(s.totalSessions, 5, 200), 'session volume');
  const surfaces =
    (s.totalAiCodeBlocks ? 1 : 0) +
    (s.terminalCommandCount ? 1 : 0) +
    (s.cliAiCommandCount ? 1 : 0) +
    (s.mcpToolCalls ? 1 : 0);
  if (surfaces > 1) d.add(linear(surfaces, 1, 4), 'multi-surface');
  return d.result();
}

// ─────────────────── data completeness ───────────────────

/** Every signal key the scorer knows how to use — drives `dataCompleteness`. */
const ALL_SIGNAL_KEYS: (keyof AiBuildSignals)[] = [
  'totalSessions',
  'projectCount',
  'aiUsageSpanDays',
  'modelCount',
  'totalScoredCommits',
  'totalAiCodeBlocks',
  'planCount',
  'avgPlanComplexity',
  'deepSessionCount',
  'firstShotAcceptRate',
  'avgTurnsPerTask',
  'referenceUsageRate',
  'correctionConvergenceRate',
  'avgPromptWords',
  'aiLineSurvivalRate',
  'errorFixRate',
  'testAfterAiRate',
  'errorsPerAiBlock',
  'buildSuccessRate',
  'postAiEditRate',
  'leverageRatio',
  'terminalCommandCount',
  'composerRatio',
  'agentModeRatio',
  'uniqueToolCount',
  'cliAiToolCount',
  'cliAiCommandCount',
  'maxParallelAgents',
  'subagentDispatches',
  'sessionsWithSubagents',
  'mcpServerCount',
  'mcpToolCalls',
  'activeSurfaceCount',
];

function dataCompleteness(s: AiBuildSignals): number {
  const present = ALL_SIGNAL_KEYS.filter((k) => has(s[k])).length;
  return Math.round((present / ALL_SIGNAL_KEYS.length) * 100) / 100;
}

// ─────────────────── compose ───────────────────

/**
 * Weight-renormalized composite over the dimensions that have a score.
 * Exported so callers that override individual dimension scores (e.g. the CLI's
 * `--deep` LLM grading) recompute the composite with the SAME math.
 */
export function compositeOf(dimensions: AiBuildDimension[]): number | null {
  let weighted = 0;
  let total = 0;
  for (const dim of dimensions) {
    if (dim.score === null) continue;
    weighted += dim.score * dim.weight;
    total += dim.weight;
  }
  return total > 0 ? Math.round(weighted / total) : null;
}

/**
 * Score an AI-build profile from normalized signals. Returns each dimension
 * (score `null` when no sub-signal was present) plus a weight-renormalized
 * composite over the dimensions that could be scored.
 */
export function computeAiBuildScore(signals: AiBuildSignals): AiBuildResult {
  const dimensions: AiBuildDimension[] = [
    signalClarity(signals),
    buildStability(signals),
    decisionWeight(signals),
    recoveryVelocity(signals),
    contextCommand(signals),
    orchestrationRange(signals),
  ];

  return {
    schemaVersion: AI_BUILD_SCHEMA_VERSION,
    composite: compositeOf(dimensions),
    dimensions,
    dataCompleteness: dataCompleteness(signals),
  };
}

export { W as AI_BUILD_WEIGHTS };
