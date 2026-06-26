import fs from 'node:fs';
import { buildArtifact } from '../artifact';
import { ARTIFACT_PATH, TRUEHIRE_DIR } from '../config';
import { bar, bold, cyan, dim, green, heading, yellow } from '../ui';

const FIDELITY_LABEL: Record<string, string> = {
  deep: green('deep'),
  counts: yellow('counts'),
  presence: dim('presence'),
};

/** `truehire assess` — scan locally, write the artifact, print a summary. */
export async function assess(): Promise<number> {
  process.stdout.write(dim('Scanning local AI tools (Claude Code, Cursor, Codex)…\n'));
  const { artifact, results } = await buildArtifact();

  fs.mkdirSync(TRUEHIRE_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);

  // ── tools detected ──
  process.stdout.write(heading('Tools detected'));
  let any = false;
  for (const r of results) {
    if (r.detected) {
      any = true;
      const note = r.note ? dim(`  (${r.note})`) : '';
      process.stdout.write(
        `\n  ${green('✓')} ${bold(r.tool)}  ${FIDELITY_LABEL[r.fidelity]}${note}`
      );
    } else {
      process.stdout.write(`\n  ${dim('·')} ${dim(`${r.tool}  not found`)}`);
    }
  }
  if (!any) {
    process.stdout.write(
      `\n\n${yellow('No AI tool logs found.')} Use Claude Code, Cursor, or Codex first, then re-run.\n`
    );
    return 1;
  }

  // ── scores ──
  process.stdout.write(heading('AI Build Index (self-attested)'));
  process.stdout.write(`\n  ${bold('Composite')}        ${bar(artifact.composite)}\n`);
  for (const d of artifact.dimensions) {
    process.stdout.write(`  ${d.name.padEnd(16)} ${bar(d.score)}\n`);
  }
  process.stdout.write(
    `\n  ${dim('Data completeness')} ${Math.round(artifact.dataCompleteness * 100)}%\n`
  );

  // ── top projects ──
  if (artifact.projects.length > 0) {
    const total = artifact.signals.projectCount ?? artifact.projects.length;
    process.stdout.write(heading(`Top projects · AI used across ${total} projects`));
    for (const p of artifact.projects.slice(0, 8)) {
      process.stdout.write(
        `\n  ${bold(p.name.slice(0, 24).padEnd(24))} ${String(p.sessions).padStart(4)} sessions  ${dim(p.tools.join(', '))}`
      );
    }
    process.stdout.write('\n');
  }

  // ── privacy + next step ──
  process.stdout.write(heading('Privacy'));
  process.stdout.write(
    dim(
      '\n  Computed locally. Project names and paths stay on your machine —\n' +
        '  publishing sends only counts, ratios and scores (never prompt text,\n' +
        '  code, or file paths).\n'
    )
  );
  process.stdout.write(`\n  Saved to ${cyan(ARTIFACT_PATH)}\n`);
  process.stdout.write(
    `\n${bold('Next:')} ${cyan('truehire login')} (once), then ${cyan('truehire publish')}.\n`
  );
  return 0;
}
