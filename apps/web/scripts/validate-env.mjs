import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_WORKER_SECRETS = [
  'AUTH_SECRET',
  ['AUTH_GITHUB_ID', 'GITHUB_ID'],
  ['AUTH_GITHUB_SECRET', 'GITHUB_SECRET'],
  'DATABASE_URL',
  'DATABASE_AUTH_TOKEN',
  'GITHUB_API_TOKEN',
];

function parseSecretNames(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => item?.name ?? item).filter(Boolean);
    }
  } catch {
    // Fall through to line parsing for older wrangler output.
  }

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^([A-Z][A-Z0-9_]+)\b/)?.[1])
    .filter(Boolean);
}

function formatRequirement(entry) {
  return Array.isArray(entry) ? entry.join(' || ') : entry;
}

function hasRequirement(entry, present) {
  return Array.isArray(entry) ? entry.some((name) => present.has(name)) : present.has(entry);
}

function fail(message) {
  console.error(`[env] ${message}`);
  process.exit(1);
}

function validateDeploySecrets() {
  const result = spawnSync('pnpm', ['exec', 'wrangler', 'secret', 'list', '--format', 'json'], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(`Unable to list Cloudflare Worker secrets.\n${result.stderr || result.stdout}`);
  }

  const present = new Set(parseSecretNames(result.stdout));
  const missing = REQUIRED_WORKER_SECRETS.filter((entry) => !hasRequirement(entry, present));

  if (missing.length > 0) {
    fail(`Missing Cloudflare Worker secrets: ${missing.map(formatRequirement).join(', ')}`);
  }
}

const mode = process.argv[2] ?? 'deploy';

if (mode !== 'deploy') {
  fail(`Unknown validation mode: ${mode}`);
}

validateDeploySecrets();
console.log('[env] Cloudflare deploy secrets are configured.');
