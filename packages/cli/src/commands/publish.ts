import { loadOrBuildArtifact } from '../artifact';
import { API_BASE, PUBLISH_ENDPOINT } from '../config';
import { loadToken } from '../credentials';
import { cyan, dim, green, red } from '../ui';

/**
 * `truehire publish [--token T]` — POST the artifact to the verified profile,
 * authenticating with the stored login token (or an explicit `--token`).
 */
export async function publish(token?: string): Promise<number> {
  const tok = token ?? loadToken();
  if (!tok) {
    process.stdout.write(`${red('Not logged in.')} Run ${cyan('truehire login')} first.\n`);
    return 1;
  }

  const artifact = await loadOrBuildArtifact();
  // Strip the local-only per-project breakdown — project names/paths never
  // leave the machine (preserves the "no file paths transmitted" guarantee).
  const { projects: _localOnly, ...publishable } = artifact;

  let res: Response;
  try {
    res = await fetch(PUBLISH_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` },
      body: JSON.stringify(publishable),
    });
  } catch (e) {
    process.stdout.write(`${red('Network error:')} ${(e as Error).message}\n`);
    return 1;
  }

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as { handle?: string };
    process.stdout.write(`\n${green('✓ Published your AI build profile.')}\n`);
    if (data.handle) {
      process.stdout.write(`  View it at ${cyan(`${API_BASE}/@${data.handle}`)}\n`);
    }
    return 0;
  }

  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  const msg = body.message ?? body.error ?? `HTTP ${res.status}`;
  if (res.status === 401) {
    process.stdout.write(
      `${red('Not authorized.')} ${msg}\n${dim('Run `truehire login` to reconnect.')}\n`
    );
  } else {
    process.stdout.write(`${red('Publish failed:')} ${msg}\n`);
  }
  return 1;
}
