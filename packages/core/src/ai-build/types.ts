/**
 * AI-build profile scoring — types.
 *
 * This is the "how you build with AI" companion signal: a faithful port of
 * nextmillionai's six-dimension model. Unlike the GitHub score in `../scoring`,
 * the inputs here are SELF-REPORTED (derived locally from a candidate's AI tool
 * logs by the `truehire` CLI) and therefore never feed the verified 0-100 score.
 *
 * Every signal is OPTIONAL: a dimension is the average of whatever sub-signals
 * are present, and the composite is the weighted average over whatever
 * dimensions could be computed. Missing data never penalizes — it only lowers
 * `dataCompleteness`. "Reward-only" signals (MCP / sub-agents) are counted only
 * when present so a zero never dilutes a score.
 */

/**
 * Normalized signals consumed by the scorer. Produced by the CLI's `normalize`
 * step from one or more local tool adapters. All optional.
 */
export type AiBuildSignals = {
  // ── volume / coverage ──
  totalSessions?: number;
  projectCount?: number;
  aiUsageSpanDays?: number;
  modelCount?: number;
  totalScoredCommits?: number;
  totalAiCodeBlocks?: number;
  planCount?: number;
  avgPlanComplexity?: number;
  deepSessionCount?: number;

  // ── communication / clarity ──
  firstShotAcceptRate?: number;
  avgTurnsPerTask?: number;
  referenceUsageRate?: number;
  correctionConvergenceRate?: number;
  avgPromptWords?: number;

  // ── stability ──
  aiLineSurvivalRate?: number;
  errorFixRate?: number;
  testAfterAiRate?: number;
  errorsPerAiBlock?: number;
  buildSuccessRate?: number;
  postAiEditRate?: number;
  leverageRatio?: number;

  // ── recovery ──
  terminalCommandCount?: number;

  // ── orchestration / context ──
  composerRatio?: number;
  agentModeRatio?: number;
  uniqueToolCount?: number;
  cliAiToolCount?: number;
  cliAiCommandCount?: number;
  maxParallelAgents?: number;
  subagentDispatches?: number;
  sessionsWithSubagents?: number;
  mcpServerCount?: number;
  mcpToolCalls?: number;
  activeSurfaceCount?: number;
};

/** A single scored dimension. */
export type AiBuildDimension = {
  id: AiBuildDimensionId;
  name: string;
  /** 0-100, or null when no sub-signal was available. */
  score: number | null;
  weight: number;
  /** Human-readable notes on which signals contributed. */
  evidence: string[];
};

export type AiBuildDimensionId =
  | 'signalClarity'
  | 'buildStability'
  | 'decisionWeight'
  | 'recoveryVelocity'
  | 'contextCommand'
  | 'orchestrationRange';

/** Full scorer output — the core of the publishable artifact. */
export type AiBuildResult = {
  schemaVersion: string;
  /** 0-100 weighted composite, or null when nothing could be scored. */
  composite: number | null;
  dimensions: AiBuildDimension[];
  /** 0..1 — fraction of known signals that were present. */
  dataCompleteness: number;
};
