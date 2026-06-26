import fs from 'node:fs';
import { CREDENTIALS_PATH, TRUEHIRE_DIR } from './config';

type Credentials = { token: string; apiBase: string; savedAt: number };

/** Read the stored CLI token, or null if not logged in / unreadable. */
export function loadToken(): string | null {
  try {
    const c = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8')) as Credentials;
    return typeof c.token === 'string' && c.token ? c.token : null;
  } catch {
    return null;
  }
}

/** Persist the CLI token with owner-only permissions (0600). */
export function saveToken(token: string, apiBase: string): void {
  fs.mkdirSync(TRUEHIRE_DIR, { recursive: true });
  const data: Credentials = { token, apiBase, savedAt: Date.now() };
  fs.writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  // Re-assert mode in case the file pre-existed with looser perms.
  try {
    fs.chmodSync(CREDENTIALS_PATH, 0o600);
  } catch {
    // best effort (e.g. Windows)
  }
}

export function clearToken(): void {
  try {
    fs.rmSync(CREDENTIALS_PATH);
  } catch {
    // already gone
  }
}
