import { describe, expect, it } from 'vitest';
import { parseArtifact } from './ai-build-artifact';

const valid = () => ({
  schemaVersion: '1.0',
  cliVersion: '0.1.0',
  generatedAt: 1_700_000_000_000,
  composite: 67,
  dataCompleteness: 0.73,
  dimensions: [
    { id: 'signalClarity', name: 'Signal Clarity', score: 50, weight: 0.18, evidence: ['a: 50'] },
    { id: 'buildStability', name: 'Build Stability', score: null, weight: 0.22, evidence: [] },
    { id: 'decisionWeight', name: 'Decision Weight', score: 19, weight: 0.18, evidence: [] },
    { id: 'recoveryVelocity', name: 'Recovery Velocity', score: 100, weight: 0.15, evidence: [] },
    { id: 'contextCommand', name: 'Context Command', score: 27, weight: 0.12, evidence: [] },
    {
      id: 'orchestrationRange',
      name: 'Orchestration Range',
      score: 71,
      weight: 0.15,
      evidence: [],
    },
  ],
  signals: { totalSessions: 10, referenceUsageRate: 0.4 },
  toolsDetected: [{ tool: 'claude-code', fidelity: 'deep' }],
});

describe('parseArtifact', () => {
  it('accepts a valid artifact and strips unknown fields', () => {
    const out = parseArtifact({ ...valid(), evil: 'rm -rf', extra: { x: 1 } });
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty('evil');
    expect(out?.composite).toBe(67);
    expect(out?.dimensions).toHaveLength(6);
  });

  it('allows a null composite (too little data)', () => {
    expect(parseArtifact({ ...valid(), composite: null })?.composite).toBeNull();
  });

  it('rejects the wrong number of dimensions', () => {
    expect(parseArtifact({ ...valid(), dimensions: [] })).toBeNull();
  });

  it('rejects free text leaking into signals', () => {
    expect(parseArtifact({ ...valid(), signals: { note: 'leaked prompt text' } })).toBeNull();
  });

  it('rejects out-of-range scores', () => {
    const bad = valid();
    bad.dimensions[0].score = 250;
    expect(parseArtifact(bad)).toBeNull();
  });

  it('rejects a non-object / missing versions', () => {
    expect(parseArtifact(null)).toBeNull();
    expect(parseArtifact('nope')).toBeNull();
    expect(parseArtifact({ ...valid(), schemaVersion: '' })).toBeNull();
  });

  it('rejects dataCompleteness outside 0..1', () => {
    expect(parseArtifact({ ...valid(), dataCompleteness: 1.5 })).toBeNull();
  });
});
