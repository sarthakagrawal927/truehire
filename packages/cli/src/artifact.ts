import { computeAiBuildScore } from '@truehire/core';
import { runAdapters } from './adapters';
import { CLI_VERSION } from './config';
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
  const { signals, toolsDetected } = normalizeSignals(results);
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
  };
  return { artifact, results };
}
