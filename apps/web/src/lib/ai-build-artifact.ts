/**
 * Server-side validation for the self-attested AI build artifact uploaded by
 * the `truehire` CLI. Hand-rolled (no zod dependency) and defensive: it rebuilds
 * a clean object so no arbitrary fields are ever persisted, and rejects any
 * free-text leaking into `signals` (every signal value must be a number).
 */

const DIMENSION_IDS = [
  'signalClarity',
  'buildStability',
  'decisionWeight',
  'recoveryVelocity',
  'contextCommand',
  'orchestrationRange',
] as const;

export type ArtifactDimension = {
  id: string;
  name: string;
  score: number | null;
  weight: number;
  evidence: string[];
};

export type Artifact = {
  schemaVersion: string;
  cliVersion: string;
  generatedAt: number;
  composite: number | null;
  dataCompleteness: number;
  dimensions: ArtifactDimension[];
  signals: Record<string, number>;
  toolsDetected: { tool: string; fidelity: string }[];
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const score01 = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 100;

function str(v: unknown, max = 64): string | null {
  return isStr(v) && v.length > 0 && v.length <= max ? v : null;
}

function parseDimension(v: unknown): ArtifactDimension | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 32);
  const name = str(v.name, 48);
  if (!id || !name || !DIMENSION_IDS.includes(id as (typeof DIMENSION_IDS)[number])) return null;
  if (v.score !== null && !score01(v.score)) return null;
  if (typeof v.weight !== 'number' || v.weight < 0 || v.weight > 1) return null;
  if (!Array.isArray(v.evidence) || v.evidence.length > 24) return null;
  const evidence: string[] = [];
  for (const e of v.evidence) {
    const s = str(e, 80);
    if (!s) return null;
    evidence.push(s);
  }
  return { id, name, score: v.score as number | null, weight: v.weight, evidence };
}

/** Returns a sanitized Artifact, or null if the payload is malformed. */
export function parseArtifact(input: unknown): Artifact | null {
  if (!isObj(input)) return null;

  const schemaVersion = str(input.schemaVersion, 16);
  const cliVersion = str(input.cliVersion, 16);
  if (!schemaVersion || !cliVersion) return null;

  if (typeof input.generatedAt !== 'number' || !Number.isFinite(input.generatedAt)) return null;
  if (input.composite !== null && !score01(input.composite)) return null;
  if (
    typeof input.dataCompleteness !== 'number' ||
    input.dataCompleteness < 0 ||
    input.dataCompleteness > 1
  )
    return null;

  if (!Array.isArray(input.dimensions) || input.dimensions.length !== 6) return null;
  const dimensions: ArtifactDimension[] = [];
  for (const d of input.dimensions) {
    const parsed = parseDimension(d);
    if (!parsed) return null;
    dimensions.push(parsed);
  }

  // signals: numbers only — refuse anything that could carry free text.
  if (!isObj(input.signals)) return null;
  const signalKeys = Object.keys(input.signals);
  if (signalKeys.length > 64) return null;
  const signals: Record<string, number> = {};
  for (const k of signalKeys) {
    const val = input.signals[k];
    if (typeof val !== 'number' || !Number.isFinite(val)) return null;
    if (k.length > 40) return null;
    signals[k] = val;
  }

  if (!Array.isArray(input.toolsDetected) || input.toolsDetected.length > 8) return null;
  const toolsDetected: { tool: string; fidelity: string }[] = [];
  for (const t of input.toolsDetected) {
    if (!isObj(t)) return null;
    const tool = str(t.tool, 24);
    const fidelity = str(t.fidelity, 16);
    if (!tool || !fidelity) return null;
    toolsDetected.push({ tool, fidelity });
  }

  return {
    schemaVersion,
    cliVersion,
    generatedAt: input.generatedAt,
    composite: input.composite as number | null,
    dataCompleteness: input.dataCompleteness,
    dimensions,
    signals,
    toolsDetected,
  };
}
