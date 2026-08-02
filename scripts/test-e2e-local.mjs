#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  AUTH_SECRET: process.env.AUTH_SECRET || 'truehire-local-e2e-secret-at-least-32-chars',
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID || 'local-e2e-github-id',
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET || 'local-e2e-github-secret',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('pnpm', ['db:migrate:local']);
run('pnpm', ['--filter', 'web', 'test:e2e']);
