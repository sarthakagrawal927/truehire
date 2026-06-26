import { type Color, PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { Artifact } from './types';

// A4 in points.
const W = 595;
const H = 842;
const M = 50;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.45, 0.52);
const FAINT = rgb(0.62, 0.62, 0.68);
const ACCENT = rgb(0.36, 0.4, 0.95);
const TRACK = rgb(0.9, 0.9, 0.93);
const RULE = rgb(0.87, 0.87, 0.91);
const PANEL = rgb(0.96, 0.96, 0.985);

// Score tiers (label + color), à la CodeVetter's badge.
const EMERALD = rgb(0.13, 0.66, 0.45);
const AMBER = rgb(0.85, 0.6, 0.05);
const ORANGE = rgb(0.92, 0.45, 0.2);
const SLATE = rgb(0.5, 0.5, 0.58);

function tier(score: number | null): { label: string; color: Color } {
  if (score == null) return { label: 'No data', color: SLATE };
  if (score >= 80) return { label: 'Exceptional', color: EMERALD };
  if (score >= 60) return { label: 'Strong', color: ACCENT };
  if (score >= 40) return { label: 'Developing', color: AMBER };
  return { label: 'Early', color: ORANGE };
}

const TOOL_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  codex: 'Codex',
};

const DIM_DESC: Record<string, string> = {
  signalClarity:
    'How precisely you direct the AI — prompt specificity, first-shot acceptance, fewer turns.',
  buildStability: 'Whether AI-written code survives — reverts, errors, and tests after AI edits.',
  decisionWeight:
    'Planning rigor and judgment — plans written, reviewing and overriding AI output.',
  recoveryVelocity: 'How fast you detect and fix AI mistakes.',
  contextCommand: 'Continuity across sessions, tools and references — MCP, checkpoints, breadth.',
  orchestrationRange: 'Multi-tool, multi-model and multi-agent fluency.',
};

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function num(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

/** Greedy word-wrap to lines of at most `max` characters. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if (cur && `${cur} ${w}`.length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** One deterministic sentence from the best/weakest scored dimensions. */
function interpretation(dims: Artifact['dimensions']): string {
  const scored = dims
    .filter((d) => d.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (scored.length === 0) return 'Not enough local AI-tool history yet to characterize.';
  const top = scored.slice(0, 2).map((d) => d.name);
  const low = scored[scored.length - 1];
  const strong = top.length === 2 ? `${top[0]} and ${top[1]}` : top[0];
  return `Strongest in ${strong}; most room to grow in ${low?.name}.`;
}

type Draw = {
  text: (s: string, x: number, y: number, size: number, f: PDFFont, color?: Color) => void;
  right: (s: string, xR: number, y: number, size: number, f: PDFFont, color?: Color) => void;
  rule: (y: number, x0?: number, x1?: number) => void;
  rect: (x: number, y: number, w: number, h: number, color: Color) => void;
};

function makeDraw(page: PDFPage): Draw {
  return {
    text: (s, x, y, size, f, color = INK) => page.drawText(s, { x, y, size, font: f, color }),
    right: (s, xR, y, size, f, color = INK) =>
      page.drawText(s, { x: xR - f.widthOfTextAtSize(s, size), y, size, font: f, color }),
    rule: (y, x0 = M, x1 = W - M) =>
      page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 1, color: RULE }),
    rect: (x, y, w, h, color) => page.drawRectangle({ x, y, width: w, height: h, color }),
  };
}

export async function generateReport(artifact: Artifact): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('TrueHire — AI Build Profile');
  doc.setCreator('truehire CLI');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const s = artifact.signals;
  const deepById = new Map((artifact.deep?.grades ?? []).map((g) => [g.id as string, g] as const));

  // ───────────────────── PAGE 1 ─────────────────────
  const d = makeDraw(doc.addPage([W, H]));
  d.text('TrueHire', M, H - M, 13, bold, ACCENT);
  d.right(fmtDate(artifact.generatedAt), W - M, H - M, 10, font, MUTED);
  let y = H - M - 30;
  d.text('AI Build Profile', M, y, 26, bold, INK);
  y -= 18;
  d.text('How you build with AI · self-attested', M, y, 11, font, MUTED);

  // composite + tier + interpretation
  y -= 52;
  const t = tier(artifact.composite);
  const comp = artifact.composite == null ? '—' : String(artifact.composite);
  d.text(comp, M, y, 46, bold, INK);
  const cw = bold.widthOfTextAtSize(comp, 46);
  d.text('/ 100', M + cw + 8, y + 6, 16, font, MUTED);
  d.text(t.label.toUpperCase(), M + cw + 8, y - 12, 11, bold, t.color);
  d.right(
    `${Math.round(artifact.dataCompleteness * 100)}% data completeness`,
    W - M,
    y + 6,
    11,
    font,
    MUTED
  );
  const tools = artifact.toolsDetected
    .map((tt) => `${TOOL_LABEL[tt.tool] ?? tt.tool} (${tt.fidelity})`)
    .join('   ');
  d.right(tools, W - M, y - 12, 9, font, FAINT);
  y -= 30;
  d.text(interpretation(artifact.dimensions), M, y, 10, font, MUTED);

  // key stats panel
  y -= 30;
  const stats: [string, string][] = [
    ['Sessions', num(s.totalSessions)],
    ['Projects', num(s.projectCount)],
    ['AI span', s.aiUsageSpanDays != null ? `${Math.round(s.aiUsageSpanDays / 30)} mo` : '—'],
    ['Models', num(s.modelCount)],
    ['AI code edits', num(s.totalAiCodeBlocks)],
    ['Sub-agents', num(s.subagentDispatches)],
    ['MCP calls', num(s.mcpToolCalls)],
    ['Plans', num(s.planCount)],
  ];
  const colW = (W - 2 * M) / 4;
  const panelH = 78;
  d.rect(M, y - panelH + 14, W - 2 * M, panelH, PANEL);
  stats.forEach(([label, value], i) => {
    const x = M + 14 + (i % 4) * colW;
    const rowY = y - Math.floor(i / 4) * 36;
    d.text(value, x, rowY, 18, bold, INK);
    d.text(label.toUpperCase(), x, rowY - 12, 7.5, font, FAINT);
  });

  // dimensions with weight + evidence
  y -= panelH + 6;
  d.text('DIMENSIONS', M, y, 9, bold, FAINT);
  if (artifact.deep) {
    d.text(
      `· Signal Clarity & Decision Weight AI-graded by ${artifact.deep.model}${artifact.deep.local ? ' (on-device)' : ' (cloud)'}`,
      M + 72,
      y,
      7.5,
      font,
      ACCENT
    );
  }
  y -= 22;
  const barX = 230;
  const barW = W - M - barX - 40;
  for (const dim of artifact.dimensions) {
    const dt = tier(dim.score);
    const g = deepById.get(dim.id);
    d.text(dim.name, M, y, 11, bold, INK);
    d.text(`${Math.round(dim.weight * 100)}% weight`, M, y - 11, 8, font, FAINT);
    d.rect(barX, y - 1, barW, 6, TRACK);
    if (dim.score != null)
      d.rect(barX, y - 1, (barW * Math.max(0, Math.min(100, dim.score))) / 100, 6, dt.color);
    d.right(dim.score == null ? '—' : String(dim.score), W - M, y - 1, 12, bold, dt.color);
    // deep-graded dims show the LLM's full reasoning; others show contributing
    // signals — wrapped full-width below the bar (no truncation).
    const ev = g
      ? g.reasoning
      : dim.evidence.length
        ? dim.evidence.slice(0, 5).join('   ·   ')
        : 'not enough data for this dimension';
    let ly = y - 22;
    for (const line of wrap(ev, 116)) {
      d.text(line, M, ly, 7.5, font, g ? MUTED : FAINT);
      ly -= 9;
    }
    y = ly - 10;
  }
  drawFooter(d, font, artifact.cliVersion, 1);

  // ───────────────────── PAGE 2 ─────────────────────
  const d2 = makeDraw(doc.addPage([W, H]));
  d2.text('TrueHire', M, H - M, 13, bold, ACCENT);
  d2.right('AI Build Profile', W - M, H - M, 10, font, MUTED);
  let y2 = H - M - 28;

  if (artifact.projects.length > 0) {
    const total = s.projectCount ?? artifact.projects.length;
    d2.text(`PROJECTS · AI USED ACROSS ${total}`, M, y2, 9, bold, FAINT);
    y2 -= 8;
    d2.rule(y2);
    y2 -= 15;
    d2.text('PROJECT', M, y2, 7.5, bold, FAINT);
    d2.text('TOOLS', 250, y2, 7.5, bold, FAINT);
    d2.right('EDITS', W - M - 88, y2, 7.5, bold, FAINT);
    d2.right('SESSIONS', W - M, y2, 7.5, bold, FAINT);
    y2 -= 15;
    for (const p of artifact.projects.slice(0, 16)) {
      d2.text(p.name.slice(0, 30), M, y2, 10, font, INK);
      d2.text(p.tools.map((tt) => TOOL_LABEL[tt] ?? tt).join(', '), 250, y2, 8.5, font, FAINT);
      d2.right(num(p.codeBlocks), W - M - 88, y2, 9, font, MUTED);
      d2.right(String(p.sessions), W - M, y2, 9, font, MUTED);
      y2 -= 16;
    }
  }

  y2 -= 18;
  d2.text('WHAT EACH DIMENSION MEASURES', M, y2, 9, bold, FAINT);
  y2 -= 8;
  d2.rule(y2);
  y2 -= 16;
  for (const dim of artifact.dimensions) {
    d2.text(dim.name, M, y2, 10, bold, INK);
    d2.right(`${Math.round(dim.weight * 100)}%`, W - M, y2, 9, font, FAINT);
    y2 -= 12;
    d2.text(DIM_DESC[dim.id] ?? '', M, y2, 8.5, font, MUTED);
    y2 -= 18;
  }
  drawFooter(d2, font, artifact.cliVersion, 2);

  return doc.save();
}

function drawFooter(d: Draw, font: PDFFont, cliVersion: string, pageNo: number): void {
  d.rule(M + 34);
  d.text(
    'Self-attested. Computed locally from your AI-coding tools (Claude Code, Cursor, Codex) — no prompt',
    M,
    M + 22,
    8,
    font,
    FAINT
  );
  d.text(
    'text, code, or file paths leave your machine. Contributes 0 to the verified TrueHire score.',
    M,
    M + 12,
    8,
    font,
    FAINT
  );
  d.text(`truehire CLI v${cliVersion}`, M, M, 8, font, FAINT);
  d.right(`Page ${pageNo} / 2`, W - M, M, 8, font, FAINT);
}
