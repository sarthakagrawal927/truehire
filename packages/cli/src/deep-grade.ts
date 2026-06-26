import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AiBuildDimensionId } from '@truehire/core';
import { listJsonl, messageText } from './adapters/shared';
import { CLAUDE_PROJECTS_DIR } from './config';

// Dimensions an LLM can grade better than the deterministic proxies (they need
// to actually read prompt content). The others stay proxy-scored. Derived from
// core's dimension ids so a rename there is a build error here.
export type DeepDimId = Extract<AiBuildDimensionId, 'signalClarity' | 'decisionWeight'>;

export type DeepGrade = {
  engine: 'lmstudio' | 'ollama' | 'codex';
  model: string;
  /** true when the model ran on-device (nothing left the machine). */
  local: boolean;
  grades: { id: DeepDimId; name: string; score: number; reasoning: string }[];
};

const PER_PROJECT = 2;
const SAMPLE = 18;
const MAXLEN = 420;
const INSTRUCTION =
  /\b(add|fix|make|implement|refactor|write|create|build|update|change|remove|delete|check|review|run|test|debug|why|how|should|can you|let'?s|need to|investigate|explain|analy[sz]e|optimi[sz]e|migrate|set ?up|wire|ensure|verify|compare|design|plan)\b/i;
const PAYLOAD = /^(story:|tick|world ingest|\{|\[|```|the user just spoke)/i;

/** Sample real user prompts, spread across projects, deduped, instructions only. */
export function sampleClaudePrompts(projectsDir = CLAUDE_PROJECTS_DIR): {
  sample: string[];
  projects: number;
} {
  const byProject = new Map<string, string[]>();
  for (const file of listJsonl(projectsDir)) {
    const project = path.basename(path.dirname(file));
    let lines: string[];
    try {
      lines = fs.readFileSync(file, 'utf8').split('\n');
    } catch {
      continue;
    }
    for (const line of lines) {
      if (!line.trim()) continue;
      let o: Record<string, unknown>;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      if (o.type !== 'user' || !o.message) continue;
      const t = messageText((o.message as { content?: unknown }).content)
        .text.replace(/\s+/g, ' ')
        .trim();
      if (t.length < 60 || t.length > 2000) continue;
      if (PAYLOAD.test(t) || t.startsWith('/') || t.startsWith('<')) continue;
      if (!INSTRUCTION.test(t)) continue;
      const arr = byProject.get(project) ?? [];
      arr.push(t.slice(0, MAXLEN));
      byProject.set(project, arr);
    }
  }
  const projects = [...byProject.entries()].sort((a, b) => b[1].length - a[1].length);
  const seen = new Set<string>();
  const sample: string[] = [];
  for (let take = 0; take < PER_PROJECT && sample.length < SAMPLE; take++) {
    for (const [, arr] of projects) {
      if (sample.length >= SAMPLE) break;
      const p = arr[take];
      if (!p) continue;
      const key = p.slice(0, 80).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sample.push(p);
    }
  }
  return { sample, projects: projects.length };
}

function rubric(sample: string[]): string {
  return `You are assessing how a developer DIRECTS an AI coding assistant, from a representative sample of their real prompts (across many projects).

Score 0-100, calibrated and slightly harsh, based ONLY on these prompts:
- signalClarity: precision of direction — specificity, context, file/constraint references, unambiguous goals, acceptance criteria.
- decisionWeight: planning rigor & judgment — approach/constraints/tradeoffs specified, work broken down, completion criteria, redirection — vs vague "do X" delegation.

Provide a one-sentence "why" for each, citing patterns. Respond ONLY with the JSON.

PROMPTS:
${sample.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    signalClarity: { type: 'integer', minimum: 0, maximum: 100 },
    signalClarityWhy: { type: 'string' },
    decisionWeight: { type: 'integer', minimum: 0, maximum: 100 },
    decisionWeightWhy: { type: 'string' },
  },
  required: ['signalClarity', 'signalClarityWhy', 'decisionWeight', 'decisionWeightWhy'],
} as const;

type Raw = {
  signalClarity?: number;
  signalClarityWhy?: string;
  decisionWeight?: number;
  decisionWeightWhy?: string;
};

/** Pull a JSON object out of model text (tolerant of think-tags / prose). */
export function extractJson(text: string): Raw | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Raw;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init: RequestInit, ms: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Grade via an OpenAI-compatible endpoint (LM Studio / Ollama). */
async function openaiGrade(baseUrl: string, model: string, prompt: string): Promise<Raw | null> {
  const data = (await fetchJson(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a calibrated, slightly harsh grader. Respond ONLY with the requested JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'grade', strict: true, schema: SCHEMA },
        },
        temperature: 0.2,
        max_tokens: 1200,
      }),
    },
    120_000
  )) as { choices?: { message?: { content?: string; reasoning_content?: string } }[] } | null;
  const msg = data?.choices?.[0]?.message;
  if (!msg) return null;
  return extractJson(msg.content || msg.reasoning_content || '');
}

/** Grade via the local Codex CLI (cloud-backed). */
function codexGrade(prompt: string): Raw | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-deep-'));
  const schemaFile = path.join(dir, 'schema.json');
  const outFile = path.join(dir, 'out.json');
  fs.writeFileSync(schemaFile, JSON.stringify(SCHEMA));
  try {
    execFileSync(
      'codex',
      [
        'exec',
        '--sandbox',
        'read-only',
        '--skip-git-repo-check',
        '-c',
        'model_reasoning_effort=low',
        '--output-schema',
        schemaFile,
        '--output-last-message',
        outFile,
        '-',
      ],
      { input: prompt, cwd: dir, stdio: ['pipe', 'ignore', 'ignore'], timeout: 120_000 }
    );
    return extractJson(fs.readFileSync(outFile, 'utf8'));
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** A reachable chat model id from an OpenAI-compatible /v1/models list. */
function pickModel(list: unknown, preferred?: string): string | null {
  if (preferred) return preferred;
  const data = (list as { data?: { id?: string }[] } | null)?.data ?? [];
  const ids = data.map((m) => m.id).filter((id): id is string => !!id && !/embed/i.test(id));
  return ids[0] ?? null;
}

type Engine = { engine: DeepGrade['engine']; model: string; local: boolean; baseUrl?: string };

// Local-first, in preference order. Codex (cloud) is explicit opt-in below.
const LOCAL_ENGINES = [
  { engine: 'lmstudio', baseUrl: 'http://localhost:1234/v1' },
  { engine: 'ollama', baseUrl: 'http://localhost:11434/v1' },
] as const;

async function detect(engineOpt?: string, modelOpt?: string): Promise<Engine | null> {
  if (engineOpt === 'codex') return { engine: 'codex', model: modelOpt ?? 'gpt-5.5', local: false };
  for (const c of LOCAL_ENGINES) {
    if (engineOpt && engineOpt !== c.engine) continue;
    const model = pickModel(await fetchJson(`${c.baseUrl}/models`, {}, 1500), modelOpt);
    if (model) return { engine: c.engine, model, local: true, baseUrl: c.baseUrl };
  }
  return null;
}

function clampInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Grade the soft dimensions with an LLM. Returns null if no engine is reachable
 * or the model produced nothing usable (caller falls back to proxy scores).
 */
export async function deepGrade(
  opts: { engine?: string; model?: string } = {}
): Promise<DeepGrade | null> {
  // Probe for an engine first (cheap) — avoids reading the whole corpus when
  // no LLM is reachable, which is the common case without `--deep` setup.
  const eng = await detect(opts.engine, opts.model);
  if (!eng) return null;
  const { sample } = sampleClaudePrompts();
  if (sample.length < 4) return null;

  const prompt = rubric(sample);
  const out =
    eng.engine === 'codex'
      ? codexGrade(prompt)
      : await openaiGrade(eng.baseUrl as string, eng.model, prompt);
  if (!out) return null;

  const sc = clampInt(out.signalClarity);
  const dw = clampInt(out.decisionWeight);
  if (sc == null || dw == null) return null;

  return {
    engine: eng.engine,
    model: eng.model,
    local: eng.local,
    grades: [
      {
        id: 'signalClarity',
        name: 'Signal Clarity',
        score: sc,
        reasoning: String(out.signalClarityWhy ?? '').slice(0, 400),
      },
      {
        id: 'decisionWeight',
        name: 'Decision Weight',
        score: dw,
        reasoning: String(out.decisionWeightWhy ?? '').slice(0, 400),
      },
    ],
  };
}
