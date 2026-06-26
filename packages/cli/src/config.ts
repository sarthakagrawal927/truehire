import os from 'node:os';
import path from 'node:path';

/** Kept in sync with package.json `version` (asserted in a test). */
export const CLI_VERSION = '0.1.0';

/** Where the generated artifact is cached locally. */
export const TRUEHIRE_DIR = path.join(os.homedir(), '.truehire');
export const ARTIFACT_PATH = path.join(TRUEHIRE_DIR, 'ai-build-profile.json');

/** Default API base — overridable for local dev via TRUEHIRE_API_URL. */
export const API_BASE =
  process.env.TRUEHIRE_API_URL?.replace(/\/$/, '') ??
  'https://truehire.sarthakagrawal927.workers.dev';

export const PUBLISH_ENDPOINT = `${API_BASE}/api/ai-build/publish`;

/** Local tool data locations (expanded from $HOME). */
export const HOME = os.homedir();
export const CLAUDE_PROJECTS_DIR = path.join(HOME, '.claude', 'projects');
export const CLAUDE_CONFIG = path.join(HOME, '.claude.json');
export const CURSOR_DIR = path.join(HOME, '.cursor');
export const CURSOR_DB = path.join(HOME, '.cursor', 'ai-tracking', 'ai-code-tracking.db');
export const CURSOR_PLANS_DIR = path.join(HOME, '.cursor', 'plans');
export const CODEX_SESSIONS_DIR = path.join(HOME, '.codex', 'sessions');

/** A session counts as "deep" past this many active minutes. */
export const DEEP_SESSION_MINUTES = 25;
/** Gaps longer than this (ms) don't count toward a session's active time. */
export const ACTIVE_GAP_MS = 30 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
