import type { AiBuildSignals } from '@truehire/core';
import { MS_PER_DAY } from './config';
import { emptyAggregate } from './adapters/shared';
import type { AdapterResult, Fidelity, RawAggregate, Tool } from './types';

type Merged = {
  merged: RawAggregate;
  detected: AdapterResult[];
  cliTools: AdapterResult[];
};

/** CLI-style AI tools (as opposed to the Cursor IDE surface). */
const CLI_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['claude-code', 'codex']);

/** Combine adapter outputs: counts sum, ratios take the first real value. */
function mergeAdapters(results: AdapterResult[]): Merged {
  const detected = results.filter((r) => r.detected && r.raw);
  const m = emptyAggregate();
  let earliest: number | null = null;
  let latest: number | null = null;

  for (const r of detected) {
    const a = r.raw as RawAggregate;
    m.sessions += a.sessions;
    m.projects += a.projects;
    m.userMessages += a.userMessages;
    m.userWords += a.userWords;
    m.assistantMessages += a.assistantMessages;
    m.uniqueTools += a.uniqueTools;
    m.terminalCalls += a.terminalCalls;
    m.codeBlocks += a.codeBlocks;
    m.mcpCalls += a.mcpCalls;
    m.mcpServers += a.mcpServers;
    m.subagentDispatches += a.subagentDispatches;
    m.sessionsWithSubagents += a.sessionsWithSubagents;
    m.planCount += a.planCount;
    m.models += a.models;
    m.referenceMessages += a.referenceMessages;
    m.deepSessions += a.deepSessions;
    m.scoredCommits += a.scoredCommits;
    m.maxParallelAgents = Math.max(m.maxParallelAgents, a.maxParallelAgents);
    if (a.aiLineSurvivalRate != null) m.aiLineSurvivalRate = a.aiLineSurvivalRate;
    if (a.composerRatio != null) m.composerRatio = a.composerRatio;
    if (a.agentModeRatio != null) m.agentModeRatio = a.agentModeRatio;
    if (a.leverageRatio != null) m.leverageRatio = a.leverageRatio;
    if (a.earliestMs != null)
      earliest = earliest == null ? a.earliestMs : Math.min(earliest, a.earliestMs);
    if (a.latestMs != null) latest = latest == null ? a.latestMs : Math.max(latest, a.latestMs);
  }
  m.earliestMs = earliest;
  m.latestMs = latest;

  return {
    merged: m,
    detected,
    cliTools: detected.filter((r) => CLI_TOOLS.has(r.tool)),
  };
}

/** Assign only when positive — keeps "no data" out of the signals object. */
function pos(v: number): number | undefined {
  return v > 0 ? v : undefined;
}

/**
 * Fold detected adapters into the scorer's normalized signals. Signals we have
 * no source for are left undefined so `dataCompleteness` stays honest.
 */
export function normalizeSignals(results: AdapterResult[]): {
  signals: AiBuildSignals;
  toolsDetected: { tool: Tool; fidelity: Fidelity }[];
} {
  const { merged: m, detected, cliTools } = mergeAdapters(results);
  const claudeDetected = detected.some((r) => r.tool === 'claude-code');
  const cursorDetected = detected.some((r) => r.tool === 'cursor');

  const s: AiBuildSignals = {};
  if (detected.length === 0) return { signals: s, toolsDetected: [] };

  s.totalSessions = pos(m.sessions);
  s.projectCount = pos(m.projects);
  s.modelCount = pos(m.models);
  s.uniqueToolCount = pos(m.uniqueTools);
  s.totalAiCodeBlocks = pos(m.codeBlocks);
  s.planCount = pos(m.planCount);
  s.maxParallelAgents = pos(m.maxParallelAgents);
  s.subagentDispatches = pos(m.subagentDispatches);
  s.sessionsWithSubagents = pos(m.sessionsWithSubagents);
  s.mcpServerCount = pos(m.mcpServers);
  s.mcpToolCalls = pos(m.mcpCalls);

  // span
  if (m.earliestMs != null && m.latestMs != null) {
    s.aiUsageSpanDays = Math.max(0, (m.latestMs - m.earliestMs) / MS_PER_DAY);
  }

  // prompt-derived ratios (need real human turns)
  if (m.userMessages > 0) {
    s.avgTurnsPerTask = m.assistantMessages / m.userMessages;
    s.referenceUsageRate = m.referenceMessages / m.userMessages;
    s.avgPromptWords = m.userWords / m.userMessages;
  }

  // claude provides terminal + deep-session counts (0 is meaningful when present)
  if (claudeDetected) {
    s.terminalCommandCount = m.terminalCalls;
    s.deepSessionCount = m.deepSessions;
  }

  // cursor-only line-level signals
  if (cursorDetected) {
    if (m.scoredCommits > 0) s.totalScoredCommits = m.scoredCommits;
    if (m.aiLineSurvivalRate != null) s.aiLineSurvivalRate = m.aiLineSurvivalRate;
    if (m.composerRatio != null) s.composerRatio = m.composerRatio;
    if (m.agentModeRatio != null) s.agentModeRatio = m.agentModeRatio;
    if (m.leverageRatio != null) s.leverageRatio = m.leverageRatio;
  }

  // cross-tool breadth
  if (cliTools.length > 0) {
    s.cliAiToolCount = cliTools.length;
    s.cliAiCommandCount = cliTools.reduce((sum, r) => sum + (r.raw?.sessions ?? 0), 0);
  }
  const surfaces = detected.filter((r) => (r.raw?.sessions ?? 0) > 0).length;
  s.activeSurfaceCount = pos(surfaces);

  return {
    signals: s,
    toolsDetected: detected.map((r) => ({ tool: r.tool, fidelity: r.fidelity })),
  };
}
