import fs from 'node:fs';
import readline from 'node:readline/promises';
import { buildArtifact } from '../artifact';
import { API_BASE, ARTIFACT_PATH, PUBLISH_ENDPOINT } from '../config';
import type { Artifact } from '../types';
import { bold, cyan, dim, green, red } from '../ui';

async function promptToken(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `Paste your TrueHire publish token (from ${cyan(`${API_BASE}/dashboard`)}): `
    );
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function loadArtifact(): Promise<Artifact> {
  if (fs.existsSync(ARTIFACT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8')) as Artifact;
    } catch {
      // fall through to a fresh scan on a corrupt cache
    }
  }
  process.stdout.write(dim('No saved profile found — scanning now…\n'));
  const { artifact } = await buildArtifact();
  return artifact;
}

/** `truehire publish [--token T]` — POST the artifact to the verified profile. */
export async function publish(token?: string): Promise<number> {
  const tok = token ?? (await promptToken());
  if (!tok) {
    process.stdout.write(`${red('No token provided.')}\n`);
    return 1;
  }

  const artifact = await loadArtifact();

  let res: Response;
  try {
    res = await fetch(PUBLISH_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` },
      body: JSON.stringify(artifact),
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
      `${red('Token rejected.')} ${msg}\n${dim('Generate a fresh one from the dashboard.')}\n`
    );
  } else if (res.status === 409) {
    process.stdout.write(
      `${red('Token already used.')} ${dim('Generate a new token and try again.')}\n`
    );
  } else if (res.status === 429) {
    process.stdout.write(`${bold('Slow down —')} ${msg}\n`);
  } else {
    process.stdout.write(`${red('Publish failed:')} ${msg}\n`);
  }
  return 1;
}
