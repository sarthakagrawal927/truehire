import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Point the credential path at a temp file before importing the module.
const TMP = `${process.env.TMPDIR ?? '/tmp'}/th-creds-${process.pid}`;
vi.mock('../src/config', () => ({
  TRUEHIRE_DIR: TMP,
  CREDENTIALS_PATH: `${TMP}/credentials.json`,
}));

const { loadToken, saveToken, clearToken } = await import('../src/credentials');

describe('credentials', () => {
  afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('returns null when no credential is stored', () => {
    expect(loadToken()).toBeNull();
  });

  it('saves and loads a token, 0600 perms', () => {
    saveToken('secret-token-abc', 'https://example.com');
    expect(loadToken()).toBe('secret-token-abc');
    const mode = fs.statSync(`${TMP}/credentials.json`).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('clearToken removes the credential', () => {
    saveToken('t', 'https://x');
    clearToken();
    expect(loadToken()).toBeNull();
  });

  it('returns null on a corrupt credential file', () => {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(`${TMP}/credentials.json`, 'not json');
    expect(loadToken()).toBeNull();
  });
});
