import { exec } from 'node:child_process';
import os from 'node:os';
import { API_BASE, CLI_AUTH_POLL, CLI_AUTH_START } from '../config';
import { saveToken } from '../credentials';
import { bold, cyan, dim, green, red } from '../ui';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${cmd} "${url}"`, () => {
    /* best effort — the URL is also printed */
  });
}

type StartResp = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  intervalSeconds?: number;
};
type PollResp = { status: string; token?: string };

/** `truehire login` — browser-pairing device flow; stores a long-lived token. */
export async function login(): Promise<number> {
  const label = `${os.userInfo().username}@${os.hostname()}`;

  let start: StartResp;
  try {
    const res = await fetch(CLI_AUTH_START, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    start = (await res.json()) as StartResp;
  } catch (e) {
    process.stdout.write(`${red('Could not start login:')} ${(e as Error).message}\n`);
    return 1;
  }

  process.stdout.write(
    `\n${bold('Confirm this code in your browser:')}  ${cyan(start.userCode)}\n` +
      `${dim('Opening')} ${cyan(start.verificationUrl)}\n` +
      `${dim('(if it doesn’t open, paste that URL into your browser)')}\n\n` +
      `${dim('Waiting for approval…')}\n`
  );
  // TRUEHIRE_NO_BROWSER lets headless/CI environments skip auto-opening.
  if (!process.env.TRUEHIRE_NO_BROWSER) openBrowser(start.verificationUrl);

  const interval = Math.max(1, start.intervalSeconds ?? 3) * 1000;
  const deadline = Date.parse(start.expiresAt) || Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    await sleep(interval);
    let poll: PollResp;
    try {
      const res = await fetch(CLI_AUTH_POLL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceCode: start.deviceCode }),
      });
      poll = (await res.json()) as PollResp;
    } catch {
      continue; // transient — keep polling
    }
    if (poll.status === 'granted' && poll.token) {
      saveToken(poll.token, API_BASE);
      process.stdout.write(
        `\n${green('✓ Logged in.')} You can now run ${cyan('truehire publish')}.\n`
      );
      return 0;
    }
    if (poll.status === 'denied') {
      process.stdout.write(`\n${red('Login was denied.')}\n`);
      return 1;
    }
    if (poll.status === 'expired') break;
  }

  process.stdout.write(`\n${red('Login timed out.')} Run ${cyan('truehire login')} again.\n`);
  return 1;
}
