import fs from 'node:fs';
import { CURSOR_DB, CURSOR_DIR, CURSOR_PLANS_DIR } from '../config';
import type { AdapterResult, RawAggregate } from '../types';
import { emptyAggregate, notDetected, toMs } from './shared';

// Minimal structural view of `better-sqlite3` so we don't hard-depend on its
// types at runtime (it's lazy-imported and optional).
type Stmt = { get: (...a: unknown[]) => Record<string, unknown> | undefined };
type DB = { prepare: (sql: string) => Stmt; close: () => void };

/** Run a single-row query, returning {} on any error (missing table/column). */
function row(db: DB, sql: string): Record<string, unknown> {
  try {
    return db.prepare(sql).get() ?? {};
  } catch {
    return {};
  }
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function countPlanFiles(): number {
  try {
    return fs.readdirSync(CURSOR_PLANS_DIR).filter((f) => f.endsWith('.plan.md')).length;
  } catch {
    return 0;
  }
}

function countProjects(): number {
  try {
    return fs
      .readdirSync(`${CURSOR_DIR}/projects`, { withFileTypes: true })
      .filter((d) => d.isDirectory()).length;
  } catch {
    return 0;
  }
}

/** Build the aggregate from an open Cursor DB. */
export function readCursorDb(db: DB): RawAggregate {
  const agg = emptyAggregate();

  const code = row(
    db,
    `SELECT COUNT(*) c, COUNT(DISTINCT model) m, COUNT(DISTINCT conversationId) conv,
            MIN(createdAt) mn, MAX(createdAt) mx FROM ai_code_hashes`
  );
  agg.codeBlocks = num(code.c) ?? 0;
  agg.models = num(code.m) ?? 0;
  agg.earliestMs = toMs(num(code.mn));
  agg.latestMs = toMs(num(code.mx));

  const commits = row(
    db,
    `SELECT COUNT(*) c, SUM(composerLinesAdded) comp, SUM(tabLinesAdded) tab,
            SUM(humanLinesAdded) hum, AVG(CAST(v2AiPercentage AS REAL)) aipct
       FROM scored_commits`
  );
  agg.scoredCommits = num(commits.c) ?? 0;
  const comp = num(commits.comp) ?? 0;
  const tab = num(commits.tab) ?? 0;
  const hum = num(commits.hum) ?? 0;
  const aiLines = comp + tab;
  const allLines = aiLines + hum;
  if (allLines > 0) agg.composerRatio = comp / allLines;
  if (hum > 0) agg.leverageRatio = aiLines / hum;
  const aipct = num(commits.aipct);
  if (aipct != null) agg.aiLineSurvivalRate = Math.max(0, Math.min(1, aipct / 100));

  const convo = row(
    db,
    `SELECT COUNT(*) c, SUM(CASE WHEN lower(mode) LIKE '%agent%' THEN 1 ELSE 0 END) agent
       FROM conversation_summaries`
  );
  const convoCount = num(convo.c) ?? 0;
  if (convoCount > 0) {
    agg.sessions = convoCount;
    agg.agentModeRatio = (num(convo.agent) ?? 0) / convoCount;
  } else {
    // conversation_summaries can be empty — fall back to distinct conversations
    // observed in the AI-code table.
    agg.sessions = num(code.conv) ?? 0;
  }

  agg.planCount = countPlanFiles();
  agg.projects = countProjects();
  return agg;
}

/** Open ~/.cursor's AI-tracking DB and produce a Cursor adapter result. */
export async function scanCursor(dbPath = CURSOR_DB): Promise<AdapterResult> {
  if (!fs.existsSync(CURSOR_DIR)) return notDetected('cursor');
  if (!fs.existsSync(dbPath)) {
    // Cursor installed but no tracking DB yet — presence only.
    return {
      tool: 'cursor',
      detected: true,
      fidelity: 'presence',
      raw: emptyAggregate(),
      projects: [],
    };
  }

  let Database: new (p: string, opts: { readonly: boolean; fileMustExist: boolean }) => DB;
  try {
    Database = (await import('better-sqlite3')).default as unknown as typeof Database;
  } catch {
    return {
      tool: 'cursor',
      detected: true,
      fidelity: 'presence',
      raw: emptyAggregate(),
      projects: [],
      note: 'install better-sqlite3 to read Cursor signals',
    };
  }

  let db: DB | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const raw = readCursorDb(db);
    return { tool: 'cursor', detected: true, fidelity: 'deep', raw, projects: [] };
  } catch {
    return {
      tool: 'cursor',
      detected: true,
      fidelity: 'presence',
      raw: emptyAggregate(),
      projects: [],
      note: 'Cursor tracking DB could not be read',
    };
  } finally {
    db?.close();
  }
}
