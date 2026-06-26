import fs from 'node:fs';
import readline from 'node:readline/promises';
import { loadOrBuildArtifact } from '../artifact';
import { REPORT_PATH, TRUEHIRE_DIR } from '../config';
import { generateReport } from '../report';
import { bold, cyan, dim, green } from '../ui';
import { publish } from './publish';

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * `truehire report [--publish|--no-publish]` — render a local PDF report and
 * optionally send it to the TrueHire profile.
 */
export async function report(send: boolean | undefined): Promise<number> {
  process.stdout.write(dim('Building your AI build report…\n'));
  const artifact = await loadOrBuildArtifact();
  const pdf = await generateReport(artifact);

  fs.mkdirSync(TRUEHIRE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, pdf);
  process.stdout.write(`\n${green('✓ Report saved')} to ${cyan(REPORT_PATH)}\n`);

  // Decide whether to publish: explicit flag wins; otherwise ask if interactive.
  const wantSend =
    send ??
    (process.stdin.isTTY ? await confirm('\nSend it to your TrueHire profile now? [y/N] ') : false);

  if (wantSend) {
    process.stdout.write('\n');
    return publish();
  }
  process.stdout.write(`\n${bold('To send it later:')} ${cyan('truehire publish')}\n`);
  return 0;
}
