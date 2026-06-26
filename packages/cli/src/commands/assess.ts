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

  // ── privacy + next step ──
  process.stdout.write(heading('Privacy'));
  process.stdout.write(
    dim(
      '\n  Only counts and ratios are computed — no prompt text, code, or file\n' +
        '  paths are read or stored. Publishing sends only the summary above.\n'
    )
  );
  process.stdout.write(`\n  Saved to ${cyan(ARTIFACT_PATH)}\n`);
  process.stdout.write(
    `\n${bold('Next:')} get a publish token from your TrueHire dashboard, then run\n` +
      `  ${cyan('truehire publish --token <token>')}\n`
  );
  return 0;
}
