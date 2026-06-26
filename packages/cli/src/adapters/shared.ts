import fs from 'node:fs';
import path from 'node:path';
import type { RawAggregate, Tool } from '../types';

/** Recursively list *.jsonl files under a directory (missing dir → []). */
export function listJsonl(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listJsonl(full));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/** Plain-text portion of a message.content (string or block array). */
export function messageText(content: unknown): { text: string; hasText: boolean } {
  if (typeof content === 'string') return { text: content, hasText: content.length > 0 };
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const b of content) {
      if (b && typeof b === 'object' && (b as { type?: string }).type === 'text') {
        const t = (b as { text?: string }).text;
        if (typeof t === 'string') parts.push(t);
      }
    }
    return { text: parts.join(' '), hasText: parts.length > 0 };
  }
  return { text: '', hasText: false };
}

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
