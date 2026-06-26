import { describe, expect, it } from 'vitest';
import { emptyAggregate, notDetected } from '../src/adapters/shared';
import { normalizeSignals } from '../src/normalize';
import type { AdapterResult, Fidelity, RawAggregate, Tool } from '../src/types';

function result(tool: Tool, fidelity: Fidelity, raw: Partial<RawAggregate>): AdapterResult {
  return { tool, detected: true, fidelity, raw: { ...emptyAggregate(), ...raw } };
}

const claude = result('claude-code', 'deep', {
  sessions: 10,
  projects: 3,
  userMessages: 100,
  userWords: 2000,
  assistantMessages: 300,
  terminalCalls: 50,
  codeBlocks: 80,
  mcpCalls: 5,
  mcpServers: 1,
  subagentDispatches: 12,
  sessionsWithSubagents: 4,
  maxParallelAgents: 3,
  planCount: 6,
  models: 2,
  referenceMessages: 40,
  deepSessions: 5,
  uniqueTools: 9,
  earliestMs: Date.parse('2026-01-01T00:00:00Z'),
  latestMs: Date.parse('2026-03-02T00:00:00Z'),
});

const cursor = result('cursor', 'deep', {
  sessions: 8,
  scoredCommits: 100,
  aiLineSurvivalRate: 0.7,
  composerRatio: 0.5,
  leverageRatio: 2,
  agentModeRatio: 0.6,
  codeBlocks: 500,
  models: 1,
});

const codex = result('codex', 'counts', { sessions: 20, projects: 5 });

describe('normalizeSignals', () => {
  const { signals, toolsDetected } = normalizeSignals([claude, cursor, codex]);

  it('sums session/project counts across adapters', () => {
    expect(signals.totalSessions).toBe(38);
    expect(signals.projectCount).toBe(8);
    expect(signals.modelCount).toBe(3);
  });

  it('derives prompt ratios from claude human turns', () => {
    expect(signals.avgPromptWords).toBe(20);
    expect(signals.referenceUsageRate).toBeCloseTo(0.4, 5);
    expect(signals.avgTurnsPerTask).toBe(3);
    expect(signals.terminalCommandCount).toBe(50);
    expect(signals.deepSessionCount).toBe(5);
  });

  it('takes cursor-only line signals', () => {
    expect(signals.aiLineSurvivalRate).toBe(0.7);
    expect(signals.composerRatio).toBe(0.5);
    expect(signals.leverageRatio).toBe(2);
    expect(signals.agentModeRatio).toBe(0.6);
    expect(signals.totalScoredCommits).toBe(100);
  });

  it('computes cross-tool breadth', () => {
    expect(signals.cliAiToolCount).toBe(2); // claude + codex
    expect(signals.cliAiCommandCount).toBe(30); // 10 + 20 sessions
    expect(signals.activeSurfaceCount).toBe(3); // all three have sessions
    expect(signals.aiUsageSpanDays).toBeGreaterThan(59);
  });

  it('lists detected tools with fidelity', () => {
    expect(toolsDetected).toEqual([
      { tool: 'claude-code', fidelity: 'deep' },
      { tool: 'cursor', fidelity: 'deep' },
      { tool: 'codex', fidelity: 'counts' },
    ]);
  });

  it('returns empty signals when nothing is detected', () => {
    const { signals: empty, toolsDetected: none } = normalizeSignals([
      notDetected('claude-code'),
      notDetected('cursor'),
      notDetected('codex'),
    ]);
    expect(Object.keys(empty)).toHaveLength(0);
    expect(none).toHaveLength(0);
  });
});
