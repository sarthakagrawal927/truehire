// Zero-dependency terminal styling. Colors auto-disable when not a TTY or when
// NO_COLOR is set (https://no-color.org).
const enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);

export const bold = wrap('1');
export const dim = wrap('2');
export const green = wrap('32');
export const yellow = wrap('33');
export const red = wrap('31');
export const cyan = wrap('36');

export function heading(text: string): string {
  return `\n${bold(text)}`;
}

/** A small inline 0-100 bar, e.g. ███████░░░ 72. */
export function bar(score: number | null, width = 14): string {
  if (score == null) return dim('— not enough data');
  const filled = Math.round((score / 100) * width);
  return `${'█'.repeat(filled)}${dim('░'.repeat(width - filled))} ${bold(String(score))}`;
}
