import fs from 'node:fs';
import path from 'node:path';
import { CODEX_SESSIONS_DIR } from '../config';
import type { AdapterResult, RawAggregate } from '../types';
import { emptyAggregate, notDetected } from './shared';

export type CodexSession = {
  project: string | null;
  model: string | null;
  earliestMs: number | null;
  latestMs: number | null;
};

/** Parse one Codex rollout file's lines into a session summary (pure). */
export function parseCodexRollout(lines: string[]): CodexSession {
  let project: string | null = null;
  let model: string | null = null;
  const stamps: number[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof o.timestamp === 'string') {
      const t = Date.parse(o.timestamp);
      if (!Number.isNaN(t)) stamps.push(t);
    }
    if (o.type === 'session_meta' && o.payload && typeof o.payload === 'object') {
      const p = o.payload as { cwd?: unknown; model_provider?: unknown; model?: unknown };
      if (typeof p.cwd === 'string') project = p.cwd;
      if (typeof p.model_provider === 'string') model = p.model_provider;
      else if (typeof p.model === 'string') model = p.model;
    }
  }

  stamps.sort((a, b) => a - b);
  return {
    project,
    model,
    earliestMs: stamps[0] ?? null,
    latestMs: stamps[stamps.length - 1] ?? null,
  };
}

export function aggregateCodex(sessions: CodexSession[]): RawAggregate {
  const agg = emptyAggregate();
  agg.sessions = sessions.length;
  const projects = new Set<string>();
  const models = new Set<string>();
  for (const s of sessions) {
    if (s.project) projects.add(s.project);
    if (s.model) models.add(s.model);
    if (s.earliestMs != null)
      agg.earliestMs =
        agg.earliestMs == null ? s.earliestMs : Math.min(agg.earliestMs, s.earliestMs);
    if (s.latestMs != null)
      agg.latestMs = agg.latestMs == null ? s.latestMs : Math.max(agg.latestMs, s.latestMs);
  }
  agg.projects = projects.size;
  agg.models = models.size;
  return agg;
}

function listRollouts(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listRollouts(full));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/** Scan ~/.codex/sessions and produce a Codex adapter result (counts fidelity). */
export function scanCodex(sessionsDir = CODEX_SESSIONS_DIR): AdapterResult {
  const files = listRollouts(sessionsDir);
  if (files.length === 0) return notDetected('codex');
  const sessions: CodexSession[] = [];
  for (const file of files) {
    try {
      sessions.push(parseCodexRollout(fs.readFileSync(file, 'utf8').split('\n')));
    } catch {
      // skip unreadable rollout
    }
  }
  return { tool: 'codex', detected: true, fidelity: 'counts', raw: aggregateCodex(sessions) };
}
