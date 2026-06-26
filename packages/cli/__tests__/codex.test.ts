import { describe, expect, it } from 'vitest';
import { aggregateCodex, parseCodexRollout, perProjectCodex } from '../src/adapters/codex';

const j = (o: unknown) => JSON.stringify(o);

const ROLLOUT = [
  j({
    timestamp: '2026-06-06T13:00:00Z',
    type: 'session_meta',
    payload: { cwd: '/work/saas', model_provider: 'codex-tui' },
  }),
  j({ timestamp: '2026-06-06T13:05:00Z', type: 'event_msg' }),
  j({ timestamp: '2026-06-06T13:10:00Z', type: 'response_item' }),
  'garbage',
];

describe('parseCodexRollout', () => {
  it('extracts project, model and span', () => {
    const s = parseCodexRollout(ROLLOUT);
    expect(s.project).toBe('/work/saas');
    expect(s.model).toBe('codex-tui');
    expect(s.earliestMs).toBe(Date.parse('2026-06-06T13:00:00Z'));
    expect(s.latestMs).toBe(Date.parse('2026-06-06T13:10:00Z'));
  });

  it('tolerates a meta-less rollout', () => {
    const s = parseCodexRollout([j({ timestamp: '2026-06-06T13:00:00Z', type: 'event_msg' })]);
    expect(s.project).toBeNull();
    expect(s.model).toBeNull();
    expect(s.earliestMs).not.toBeNull();
  });
});

describe('aggregateCodex', () => {
  it('counts sessions and dedupes projects/models across rollouts', () => {
    const a = parseCodexRollout(ROLLOUT);
    const b = parseCodexRollout([
      j({
        timestamp: '2026-06-07T09:00:00Z',
        type: 'session_meta',
        payload: { cwd: '/work/other', model_provider: 'codex-tui' },
      }),
    ]);
    const agg = aggregateCodex([a, b]);
    expect(agg.sessions).toBe(2);
    expect(agg.projects).toBe(2);
    expect(agg.models).toBe(1); // both codex-tui
    expect(agg.earliestMs).toBe(Date.parse('2026-06-06T13:00:00Z'));
    expect(agg.latestMs).toBe(Date.parse('2026-06-07T09:00:00Z'));
  });
});

describe('perProjectCodex', () => {
  it('groups rollouts by cwd (sessions + span only)', () => {
    const a = parseCodexRollout(ROLLOUT);
    const b = parseCodexRollout([
      j({
        timestamp: '2026-06-06T14:00:00Z',
        type: 'session_meta',
        payload: { cwd: '/work/saas', model_provider: 'codex-tui' },
      }),
    ]);
    const stats = perProjectCodex([a, b]);
    expect(stats).toHaveLength(1); // same cwd
    expect(stats[0]).toMatchObject({ path: '/work/saas', tool: 'codex', sessions: 2 });
  });
});
