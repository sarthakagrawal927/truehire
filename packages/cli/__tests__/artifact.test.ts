import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildArtifact } from '../src/artifact';
import { CLI_VERSION } from '../src/config';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

describe('packaging invariants', () => {
  it('CLI_VERSION matches package.json', () => {
    expect(CLI_VERSION).toBe(pkg.version);
  });

  it('publishes as the unscoped `truehire` bin', () => {
    expect(pkg.name).toBe('truehire');
    expect(pkg.bin.truehire).toBe('./dist/cli.js');
  });
});

describe('buildArtifact', () => {
  it('produces a well-formed artifact with a fixed generatedAt', async () => {
    const { artifact } = await buildArtifact(1_700_000_000_000);
    expect(artifact.generatedAt).toBe(1_700_000_000_000);
    expect(artifact.cliVersion).toBe(CLI_VERSION);
    expect(artifact.schemaVersion).toBeTruthy();
    expect(artifact.dimensions).toHaveLength(6);
    expect(artifact.dataCompleteness).toBeGreaterThanOrEqual(0);
    expect(artifact.dataCompleteness).toBeLessThanOrEqual(1);
    // signals must never leak free-text — every value is a number
    for (const v of Object.values(artifact.signals)) expect(typeof v).toBe('number');
  });
});
