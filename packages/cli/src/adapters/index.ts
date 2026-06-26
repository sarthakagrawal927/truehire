import type { AdapterResult } from '../types';
import { scanClaudeCode } from './claude-code';
import { scanCodex } from './codex';
import { scanCursor } from './cursor';

/** Run every adapter. Each is independently optional and never throws. */
export async function runAdapters(): Promise<AdapterResult[]> {
  const claude = scanClaudeCode();
  const codex = scanCodex();
  const cursor = await scanCursor();
  return [claude, cursor, codex];
}

export { scanClaudeCode, scanCodex, scanCursor };
