import { CLI_AUTH_LOGOUT } from '../config';
import { clearToken, loadToken } from '../credentials';
import { dim, green } from '../ui';

/** `truehire logout` — revoke the stored token server-side and delete it locally. */
export async function logout(): Promise<number> {
  const token = loadToken();
  if (token) {
    try {
      await fetch(CLI_AUTH_LOGOUT, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      // revoke is best-effort; we still clear the local credential
    }
  }
  clearToken();
  process.stdout.write(
    token ? `${green('✓ Logged out.')} ${dim('Token revoked.')}\n` : `${dim('Not logged in.')}\n`
  );
  return 0;
}
