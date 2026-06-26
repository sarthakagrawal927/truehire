import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  aggregateSessions,
  parseSession,
  perProjectStats,
  scanClaudeCode,
} from '../src/adapters/claude-code';

const j = (o: unknown) => JSON.stringify(o);

const SESSION = [
  j({
    type: 'user',
    cwd: '/proj/a',
    timestamp: '2026-06-01T10:00:00Z',
    message: { role: 'user', content: 'fix the bug in app.ts please now' },
  }),
  j({
    type: 'assistant',
    timestamp: '2026-06-01T10:01:00Z',
    message: {
      role: 'assistant',
      model: 'claude-opus-4-8',
      content: [
        { type: 'thinking' },
        { type: 'tool_use', name: 'Read' },
        { type: 'tool_use', name: 'Edit' },
        { type: 'tool_use', name: 'Bash' },
      ],
    },
  }),
  // tool result arrives as type:user with no text block — NOT a human turn
  j({
    type: 'user',
    timestamp: '2026-06-01T10:02:00Z',
    message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] },
  }),
  j({
    type: 'assistant',
    timestamp: '2026-06-01T10:03:00Z',
    message: {
      model: '<synthetic>',
      content: [
        { type: 'tool_use', name: 'Task' },
        { type: 'tool_use', name: 'Task' },
        { type: 'tool_use', name: 'mcp__cloudflare__docs' },
        { type: 'tool_use', name: 'ExitPlanMode' },
      ],
    },
  }),
  'not json at all',
  '',
];

describe('parseSession', () => {
  const s = parseSession(SESSION);

  it('counts only real human turns and their words', () => {
    expect(s.userMessages).toBe(1);
    expect(s.userWords).toBe(7);
    expect(s.referenceMessages).toBe(1); // app.ts
    expect(s.assistantMessages).toBe(2);
  });

  it('classifies tool calls', () => {
    expect(s.terminalCalls).toBe(1); // Bash
    expect(s.codeBlocks).toBe(1); // Edit
    expect(s.planCount).toBe(1); // ExitPlanMode
    expect(s.subagentDispatches).toBe(2); // two Task
    expect(s.maxParallelAgents).toBe(2);
    expect(s.mcpCalls).toBe(1);
    expect([...s.mcpServers]).toEqual(['cloudflare']);
    expect(s.tools.has('Read')).toBe(true);
  });

  it('ignores the synthetic model and tracks real ones', () => {
    expect([...s.models]).toEqual(['claude-opus-4-8']);
  });

  it('computes span and active minutes (gaps <= 30m)', () => {
    expect(s.earliestMs).toBe(Date.parse('2026-06-01T10:00:00Z'));
    expect(s.latestMs).toBe(Date.parse('2026-06-01T10:03:00Z'));
    expect(s.activeMinutes).toBe(3);
  });

  it('handles an empty session', () => {
    const e = parseSession([]);
    expect(e.userMessages).toBe(0);
    expect(e.earliestMs).toBeNull();
    expect(e.activeMinutes).toBe(0);
  });
});

describe('aggregateSessions', () => {
  it('combines sessions and dedupes projects/models/tools', () => {
    const agg = aggregateSessions([parseSession(SESSION), parseSession(SESSION)]);
    expect(agg.sessions).toBe(2);
    expect(agg.projects).toBe(1); // same cwd
    expect(agg.models).toBe(1);
    expect(agg.subagentDispatches).toBe(4);
    expect(agg.sessionsWithSubagents).toBe(2);
    expect(agg.maxParallelAgents).toBe(2);
    expect(agg.mcpServers).toBe(1);
  });
});

describe('perProjectStats', () => {
  it('groups sessions by cwd with summed counts', () => {
    const stats = perProjectStats([parseSession(SESSION), parseSession(SESSION)]);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      path: '/proj/a',
      tool: 'claude-code',
      sessions: 2,
      terminalCalls: 2, // 1 Bash per session
      codeBlocks: 2, // 1 Edit per session
    });
  });

  it('skips sessions with no project', () => {
    expect(perProjectStats([parseSession([])])).toHaveLength(0);
  });
});

describe('scanClaudeCode', () => {
  const dir = path.join(os.tmpdir(), `th-claude-${process.pid}`);
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('returns not-detected for an empty/absent dir', () => {
    expect(scanClaudeCode(path.join(dir, 'nope')).detected).toBe(false);
  });

  it('reads .jsonl session files from a project tree', () => {
    const proj = path.join(dir, 'proj-a');
    fs.mkdirSync(proj, { recursive: true });
    fs.writeFileSync(path.join(proj, 's1.jsonl'), SESSION.join('\n'));
    const res = scanClaudeCode(dir);
    expect(res.detected).toBe(true);
    expect(res.fidelity).toBe('deep');
    expect(res.raw?.sessions).toBe(1);
    expect(res.raw?.terminalCalls).toBe(1);
  });
});
