// Cross-compile standalone binaries with `bun build --compile`.
// Bun can target every platform from one machine. `better-sqlite3` is excluded
// (the Cursor adapter uses Bun's built-in `bun:sqlite` in the compiled binary).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const TARGETS = [
  ['bun-darwin-arm64', 'truehire-darwin-arm64'],
  ['bun-darwin-x64', 'truehire-darwin-x64'],
  ['bun-linux-x64', 'truehire-linux-x64'],
  ['bun-linux-arm64', 'truehire-linux-arm64'],
  ['bun-windows-x64', 'truehire-windows-x64.exe'],
];

mkdirSync('dist', { recursive: true });
for (const [target, out] of TARGETS) {
  console.log(`→ ${out}`);
  execFileSync(
    'bun',
    [
      'build',
      'src/index.ts',
      '--compile',
      '--external',
      'better-sqlite3',
      `--target=${target}`,
      '--outfile',
      `dist/${out}`,
    ],
    { stdio: 'inherit' }
  );
}
console.log('✓ built', TARGETS.length, 'binaries in dist/');
