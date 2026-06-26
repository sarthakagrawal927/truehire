import { describe, expect, it } from 'vitest';
import { readCursorDb, scanCursor } from '../src/adapters/cursor';

/** Fake better-sqlite3 DB that returns canned rows keyed by query content. */
function fakeDb(rows: Record<string, Record<string, unknown>>) {
  return {
    prepare: (sql: string) => ({
      get: () => {
        for (const [key, val] of Object.entries(rows)) if (sql.includes(key)) return val;
        return undefined;
      },
    }),
    close: () => {},
  };
}

describe('readCursorDb', () => {
  it('derives ratios from scored_commits and counts from ai_code_hashes', () => {
    const db = fakeDb({
      ai_code_hashes: { c: 1000, m: 2, conv: 50, mn: 1_700_000_000_000, mx: 1_710_000_000_000 },
      scored_commits: { c: 492, comp: 5000, tab: 1000, hum: 4000, aipct: 60 },
      conversation_summaries: { c: 0, agent: 0 },
    });
    const agg = readCursorDb(db);
    expect(agg.codeBlocks).toBe(1000);
    expect(agg.models).toBe(2);
    expect(agg.scoredCommits).toBe(492);
    expect(agg.composerRatio).toBeCloseTo(0.5, 5); // 5000 / 10000
    expect(agg.leverageRatio).toBeCloseTo(1.5, 5); // 6000 / 4000
    expect(agg.aiLineSurvivalRate).toBeCloseTo(0.6, 5); // 60%
    expect(agg.sessions).toBe(50); // conversation_summaries empty → distinct convs
    expect(agg.agentModeRatio).toBeNull();
  });

  it('uses conversation_summaries when populated', () => {
    const db = fakeDb({
      ai_code_hashes: { c: 10, m: 1, conv: 4, mn: 1, mx: 2 },
      scored_commits: { c: 0 },
      conversation_summaries: { c: 8, agent: 6 },
    });
    const agg = readCursorDb(db);
    expect(agg.sessions).toBe(8);
    expect(agg.agentModeRatio).toBeCloseTo(0.75, 5); // 6/8
  });

  it('survives a missing scored_commits table (no rows)', () => {
    const agg = readCursorDb(fakeDb({ ai_code_hashes: { c: 5, m: 1, conv: 5 } }));
    expect(agg.scoredCommits).toBe(0);
    expect(agg.composerRatio).toBeNull();
  });
});

describe('scanCursor', () => {
  it('returns not-detected when ~/.cursor is absent (via missing db path)', async () => {
    // CURSOR_DIR is real on dev machines, but an obviously-missing db path
    // exercises the presence fallback without the native binding.
    const res = await scanCursor('/nonexistent/path/ai-code-tracking.db');
    expect(['cursor']).toContain(res.tool);
    // detected depends on whether ~/.cursor exists; fidelity is never 'deep' here
    expect(res.fidelity).not.toBe('deep');
  });
});
