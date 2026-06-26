import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/index.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: true,
  // Bundle the workspace scorer into the published artifact so the npm package
  // is self-contained (it must NOT depend on the private @truehire/core pkg).
  noExternal: [/@truehire\/core/],
  // Native module — keep external; the cursor adapter lazy-imports it and
  // degrades gracefully if it can't load.
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
});
