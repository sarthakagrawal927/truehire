import type { RawAggregate, Tool } from '../types';

/** A zeroed aggregate — adapters fill in only the fields their source covers. */
export function emptyAggregate(): RawAggregate {
  return {
    sessions: 0,
    projects: 0,
    earliestMs: null,
    latestMs: null,
    userMessages: 0,
    userWords: 0,
    assistantMessages: 0,
    uniqueTools: 0,
    terminalCalls: 0,
    codeBlocks: 0,
    mcpCalls: 0,
    mcpServers: 0,
    subagentDispatches: 0,
    sessionsWithSubagents: 0,
    maxParallelAgents: 0,
    planCount: 0,
    models: 0,
    referenceMessages: 0,
    deepSessions: 0,
    aiLineSurvivalRate: null,
    scoredCommits: 0,
    composerRatio: null,
    agentModeRatio: null,
    leverageRatio: null,
  };
}

export function notDetected(tool: Tool) {
  return { tool, detected: false as const, fidelity: 'presence' as const, raw: null, projects: [] };
}

/** Cursor/Codex epochs are sometimes seconds, sometimes ms — normalize to ms. */
export function toMs(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}
