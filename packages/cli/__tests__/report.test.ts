import { describe, expect, it } from 'vitest';
import { generateReport } from '../src/report';
import type { Artifact } from '../src/types';

const artifact: Artifact = {
  schemaVersion: '1.0',
  cliVersion: '0.2.0',
  generatedAt: 1_700_000_000_000,
  composite: 67,
  dataCompleteness: 0.73,
  dimensions: [
    { id: 'signalClarity', name: 'Signal Clarity', score: 50, weight: 0.18, evidence: [] },
    { id: 'buildStability', name: 'Build Stability', score: null, weight: 0.22, evidence: [] },
    { id: 'decisionWeight', name: 'Decision Weight', score: 40, weight: 0.18, evidence: [] },
    { id: 'recoveryVelocity', name: 'Recovery Velocity', score: 100, weight: 0.15, evidence: [] },
    { id: 'contextCommand', name: 'Context Command', score: 27, weight: 0.12, evidence: [] },
    {
      id: 'orchestrationRange',
      name: 'Orchestration Range',
      score: 73,
      weight: 0.15,
      evidence: [],
    },
  ],
  signals: { projectCount: 138, totalSessions: 2167 },
  toolsDetected: [
    { tool: 'claude-code', fidelity: 'deep' },
    { tool: 'cursor', fidelity: 'deep' },
    { tool: 'codex', fidelity: 'counts' },
  ],
  projects: [
    {
      name: 'fleet',
      path: '/x/fleet',
      tools: ['claude-code', 'codex'],
      sessions: 221,
      codeBlocks: 9,
      terminalCalls: 4,
      lastActiveMs: 1,
    },
  ],
};

describe('generateReport', () => {
  it('renders a valid PDF', async () => {
    const bytes = await generateReport(artifact);
    expect(bytes.length).toBeGreaterThan(1000);
    // %PDF magic header
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('handles a null composite and empty projects without throwing', async () => {
    const bytes = await generateReport({ ...artifact, composite: null, projects: [] });
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });
});
