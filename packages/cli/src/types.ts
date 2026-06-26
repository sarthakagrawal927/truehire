import type { AiBuildResult, AiBuildSignals } from '@truehire/core';

export type Tool = 'claude-code' | 'cursor' | 'codex';

/**
 * Fidelity declares how much a source could actually tell us, mirroring
 * nextmillionai's adapter contract:
 *  - `deep`     full per-session signal (Claude Code JSONL, Cursor DB)
 *  - `counts`   aggregate counts only
 *  - `presence` we know the tool was used, little more
 */
export type Fidelity = 'deep' | 'counts' | 'presence';

/**
 * Raw, pre-normalization aggregates from a single adapter. All counts — never
 * raw prompt text, code, or file paths. `null` span = no timestamped activity.
 */
export type RawAggregate = {
  sessions: number;
  projects: number;
  earliestMs: number | null;
  latestMs: number | null;
  userMessages: number;
  userWords: number;
  assistantMessages: number;
  /** distinct tool names invoked */
  uniqueTools: number;
  terminalCalls: number;
  /** AI-authored code edits (Write/Edit/composer applies) */
  codeBlocks: number;
  mcpCalls: number;
  mcpServers: number;
  subagentDispatches: number;
  sessionsWithSubagents: number;
  maxParallelAgents: number;
  planCount: number;
  models: number;
  /** user messages that referenced a file / path / @mention */
  referenceMessages: number;
  deepSessions: number;
  /** Cursor-only: AI / total line ratio across scored commits */
  aiLineSurvivalRate: number | null;
  scoredCommits: number;
  composerRatio: number | null;
  agentModeRatio: number | null;
  /** Cursor-only: AI lines / human lines across scored commits */
  leverageRatio: number | null;
};

export type AdapterResult = {
  tool: Tool;
  detected: boolean;
  fidelity: Fidelity;
  /** Present only when `detected`. */
  raw: RawAggregate | null;
  /** Non-fatal note shown to the user (e.g. "Cursor DB unreadable"). */
  note?: string;
};

/** The full publishable artifact written locally and POSTed on publish. */
export type Artifact = {
  schemaVersion: string;
  cliVersion: string;
  generatedAt: number;
  composite: AiBuildResult['composite'];
  dimensions: AiBuildResult['dimensions'];
  dataCompleteness: number;
  signals: AiBuildSignals;
  toolsDetected: { tool: Tool; fidelity: Fidelity }[];
};
