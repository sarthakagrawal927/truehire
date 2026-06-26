import fs from 'node:fs';
import { computeAiBuildScore } from '@truehire/core';
import { runAdapters } from './adapters';
import { ARTIFACT_PATH, CLI_VERSION } from './config';
import { normalizeSignals } from './normalize';
import type { AdapterResult, Artifact } from './types';

/**
 * Scan all local AI tools, normalize signals, score, and assemble the
 * publishable artifact. `now` is injectable for deterministic tests.
 */
export async function buildArtifact(
  now: number = Date.now()
): Promise<{ artifact: Artifact; results: AdapterResult[] }> {
  const results = await runAdapters();
  const { signals, toolsDetected, projects } = normalizeSignals(results);
  const result = computeAiBuildScore(signals);

  const artifact: Artifact = {
    schemaVersion: result.schemaVersion,
    cliVersion: CLI_VERSION,
    generatedAt: now,
    composite: result.composite,
    dimensions: result.dimensions,
    dataCompleteness: result.dataCompleteness,
    signals,
    toolsDetected,
    // Local-only; `publish` strips this so no path/name is transmitted.
    projects: projects.slice(0, 25),
  };
  return { artifact, results };
}

/** Return the cached artifact if present, otherwise scan and build a fresh one. */
export async function loadOrBuildArtifact(): Promise<Artifact> {
  if (fs.existsSync(ARTIFACT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8')) as Artifact;
    } catch {
      // corrupt cache — fall through to a fresh scan
    }
  }
  const { artifact } = await buildArtifact();
  return artifact;
}
