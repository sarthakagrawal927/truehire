#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const tmp = mkdtempSync(join(tmpdir(), "truehire-e2e-"));
const dbPath = join(tmp, "truehire.db");
const env = {
  ...process.env,
  AUTH_SECRET: process.env.AUTH_SECRET || "truehire-local-e2e-secret-at-least-32-chars",
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID || "local-e2e-github-id",
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET || "local-e2e-github-secret",
  DATABASE_URL: `file:${dbPath}`,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  run("pnpm", ["db:migrate"]);
  run("pnpm", ["--filter", "web", "test:e2e"]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
