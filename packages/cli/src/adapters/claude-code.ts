import fs from 'node:fs';
import { ACTIVE_GAP_MS, CLAUDE_PROJECTS_DIR, DEEP_SESSION_MINUTES } from '../config';
import type { AdapterResult, ProjectStat, RawAggregate } from '../types';
import { emptyAggregate, listJsonl, messageText } from './shared';

/** Aggregated stats for a single Claude Code session (one JSONL file). */
export type SessionStats = {
  project: string | null;
  earliestMs: number | null;
  latestMs: number | null;
  userMessages: number;
  userWords: number;
  assistantMessages: number;
  tools: Set<string>;
  terminalCalls: number;
  codeBlocks: number;
  mcpCalls: number;
  mcpServers: Set<string>;
  subagentDispatches: number;
  maxParallelAgents: number;
  planCount: number;
  referenceMessages: number;
  models: Set<string>;
  activeMinutes: number;
};

const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const SUBAGENT_TOOLS = new Set(['Task', 'Agent']);
// A user message that points at a concrete file / path / @mention — a proxy for
// "grounded" prompting (referenceUsageRate).
const REFERENCE_RE =
  /(^|\s)@[\w./-]+|`[^`]+`|[\w./-]+\.(ts|tsx|js|jsx|py|go|rs|java|rb|md|json|ya?ml|sql|css|html|sh)\b/i;

function emptySession(): SessionStats {
  return {
    project: null,
    earliestMs: null,
    latestMs: null,
    userMessages: 0,
    userWords: 0,
    assistantMessages: 0,
    tools: new Set(),
    terminalCalls: 0,
    codeBlocks: 0,
    mcpCalls: 0,
    mcpServers: new Set(),
    subagentDispatches: 0,
    maxParallelAgents: 0,
    planCount: 0,
    referenceMessages: 0,
    models: new Set(),
    activeMinutes: 0,
  };
}

/**
 * Parse the JSONL lines of ONE Claude Code session into aggregate stats.
 * Pure — no IO. Unknown / malformed lines are skipped.
 */
export function parseSession(lines: string[]): SessionStats {
  const s = emptySession();
  const stamps: number[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }

    if (typeof o.cwd === 'string' && !s.project) s.project = o.cwd;
    if (typeof o.timestamp === 'string') {
      const t = Date.parse(o.timestamp);
      if (!Number.isNaN(t)) stamps.push(t);
    }

    const msg = o.message as { role?: string; content?: unknown; model?: string } | undefined;

    if (o.type === 'user' && msg) {
      const { text, hasText } = messageText(msg.content);
      // Tool results also arrive as type:user (array content, no text block) —
      // those are not human turns, so only count messages with real text.
      if (hasText) {
        s.userMessages += 1;
        s.userWords += text.split(/\s+/).filter(Boolean).length;
        if (REFERENCE_RE.test(text)) s.referenceMessages += 1;
      }
    } else if (o.type === 'assistant' && msg) {
      s.assistantMessages += 1;
      if (typeof msg.model === 'string' && msg.model && msg.model !== '<synthetic>') {
        s.models.add(msg.model);
      }
      if (Array.isArray(msg.content)) {
        let agentsThisTurn = 0;
        for (const b of msg.content) {
          if (!b || typeof b !== 'object') continue;
          const block = b as { type?: string; name?: string };
          if (block.type !== 'tool_use' || typeof block.name !== 'string') continue;
          const name = block.name;
          s.tools.add(name);
          if (name === 'Bash') s.terminalCalls += 1;
          else if (WRITE_TOOLS.has(name)) s.codeBlocks += 1;
          if (name === 'ExitPlanMode') s.planCount += 1;
          if (SUBAGENT_TOOLS.has(name)) {
            s.subagentDispatches += 1;
            agentsThisTurn += 1;
          }
          if (name.startsWith('mcp__')) {
            s.mcpCalls += 1;
            const server = name.split('__')[1];
            if (server) s.mcpServers.add(server);
          }
        }
        if (agentsThisTurn > s.maxParallelAgents) s.maxParallelAgents = agentsThisTurn;
      }
    }
  }

  if (stamps.length > 0) {
    stamps.sort((a, b) => a - b);
    s.earliestMs = stamps[0]!;
    s.latestMs = stamps[stamps.length - 1]!;
    let activeMs = 0;
    for (let i = 1; i < stamps.length; i++) {
      const gap = stamps[i]! - stamps[i - 1]!;
      if (gap <= ACTIVE_GAP_MS) activeMs += gap;
    }
    s.activeMinutes = activeMs / 60000;
  }

  return s;
}

/** Combine per-session stats into one adapter aggregate. */
export function aggregateSessions(sessions: SessionStats[]): RawAggregate {
  const projects = new Set<string>();
  const models = new Set<string>();
  const tools = new Set<string>();
  const mcpServers = new Set<string>();
  const agg: RawAggregate = { ...emptyAggregate(), sessions: sessions.length };

  for (const s of sessions) {
    if (s.project) projects.add(s.project);
    for (const m of s.models) models.add(m);
    for (const t of s.tools) tools.add(t);
    for (const m of s.mcpServers) mcpServers.add(m);
    agg.userMessages += s.userMessages;
    agg.userWords += s.userWords;
    agg.assistantMessages += s.assistantMessages;
    agg.terminalCalls += s.terminalCalls;
    agg.codeBlocks += s.codeBlocks;
    agg.mcpCalls += s.mcpCalls;
    agg.subagentDispatches += s.subagentDispatches;
    agg.planCount += s.planCount;
    agg.referenceMessages += s.referenceMessages;
    if (s.subagentDispatches > 0) agg.sessionsWithSubagents += 1;
    if (s.maxParallelAgents > agg.maxParallelAgents) agg.maxParallelAgents = s.maxParallelAgents;
    if (s.activeMinutes >= DEEP_SESSION_MINUTES) agg.deepSessions += 1;
    if (s.earliestMs != null) {
      agg.earliestMs =
        agg.earliestMs == null ? s.earliestMs : Math.min(agg.earliestMs, s.earliestMs);
    }
    if (s.latestMs != null) {
      agg.latestMs = agg.latestMs == null ? s.latestMs : Math.max(agg.latestMs, s.latestMs);
    }
  }

  agg.projects = projects.size;
  agg.models = models.size;
  agg.uniqueTools = tools.size;
  agg.mcpServers = mcpServers.size;
  return agg;
}

/** Group sessions by project (cwd) into per-project stats. */
export function perProjectStats(sessions: SessionStats[]): ProjectStat[] {
  const map = new Map<string, ProjectStat>();
  for (const s of sessions) {
    if (!s.project) continue;
    let p = map.get(s.project);
    if (!p) {
      p = {
        path: s.project,
        tool: 'claude-code',
        sessions: 0,
        userMessages: 0,
        codeBlocks: 0,
        terminalCalls: 0,
        earliestMs: null,
        latestMs: null,
      };
      map.set(s.project, p);
    }
    p.sessions += 1;
    p.userMessages += s.userMessages;
    p.codeBlocks += s.codeBlocks;
    p.terminalCalls += s.terminalCalls;
    if (s.earliestMs != null)
      p.earliestMs = p.earliestMs == null ? s.earliestMs : Math.min(p.earliestMs, s.earliestMs);
    if (s.latestMs != null)
      p.latestMs = p.latestMs == null ? s.latestMs : Math.max(p.latestMs, s.latestMs);
  }
  return [...map.values()];
}

/** Scan ~/.claude/projects and produce a Claude Code adapter result. */
export function scanClaudeCode(projectsDir = CLAUDE_PROJECTS_DIR): AdapterResult {
  const files = listJsonl(projectsDir);
  if (files.length === 0) {
    return { tool: 'claude-code', detected: false, fidelity: 'presence', raw: null, projects: [] };
  }
  const sessions: SessionStats[] = [];
  for (const file of files) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      sessions.push(parseSession(lines));
    } catch {
      // unreadable session file — skip
    }
  }
  return {
    tool: 'claude-code',
    detected: true,
    fidelity: 'deep',
    raw: aggregateSessions(sessions),
    projects: perProjectStats(sessions),
  };
}
