import fs from 'node:fs';
import { compositeOf, computeAiBuildScore } from '@truehire/core';
import { runAdapters } from './adapters';
import { ARTIFACT_PATH, CLI_VERSION } from './config';
import { type DeepGrade, deepGrade } from './deep-grade';
import { normalizeSignals } from './normalize';
import type { AdapterResult, Artifact } from './types';

/**
 * Scan all local AI tools, normalize signals, score, and assemble the
 * publishable artifact. `now` is injectable for deterministic tests.
 */
export async function buildArtifact(
  now: number = Date.now(),
  deepOpts?: { engine?: string; model?: string }
): Promise<{ artifact: Artifact; results: AdapterResult[]; deep: DeepGrade | null }> {
  const results = await runAdapters();
  const { signals, toolsDetected, projects } = normalizeSignals(results);
  const result = computeAiBuildScore(signals);

  let dimensions = result.dimensions;
  let composite = result.composite;
  let deep: DeepGrade | null = null;

  // `--deep`: have a local (or Codex) LLM grade the soft dimensions, override
  // those scores, and recompute the composite. Falls back silently to proxies.
  if (deepOpts) {
    deep = await deepGrade(deepOpts);
    if (deep) {
      const override = new Map<string, number>(deep.grades.map((g) => [g.id, g.score]));
      dimensions = dimensions.map((d) => {
        const score = override.get(d.id);
        return score == null ? d : { ...d, score };
      });
      composite = compositeOf(dimensions);
    }
  }

  const artifact: Artifact = {
    schemaVersion: result.schemaVersion,
    cliVersion: CLI_VERSION,
    generatedAt: now,
    composite,
    dimensions,
    dataCompleteness: result.dataCompleteness,
    signals,
    toolsDetected,
    // Local-only; `publish` strips these so no path/name/reasoning is transmitted.
    projects: projects.slice(0, 25),
    ...(deep ? { deep } : {}),
  };
  return { artifact, results, deep };
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
