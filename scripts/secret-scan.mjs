#!/usr/bin/env node
// Minimal pre-commit secret scan. Blocks commits if any staged file matches.
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) process.exit(0);

const patterns = [
  { name: "GitHub token",          re: /\bghp_[A-Za-z0-9]{30,}\b/ },
  { name: "GitHub OAuth secret",   re: /\bgho_[A-Za-z0-9]{30,}\b/ },
  { name: "GitHub app key",        re: /-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----/ },
  { name: "Generic API key",       re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: "AWS access key",        re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Slack token",           re: /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/ },
  { name: "NextAuth secret inline",re: /NEXTAUTH_SECRET\s*=\s*["'`](?!process\.env)[A-Za-z0-9+/=]{16,}/ },
  { name: "DB url with password",  re: /\b(?:postgres|mysql|libsql):\/\/[^:\s]+:[^@\s]{4,}@/ },
];

let fail = 0;
for (const f of files) {
  let body;
  try { body = readFileSync(f, "utf8"); } catch { continue; }
  for (const p of patterns) {
    if (p.re.test(body)) {
      console.error(`🔒 ${p.name} pattern in ${f}`);
      fail++;
    }
  }
}
if (fail) {
  console.error(`\nSecret scan blocked commit — ${fail} match(es). Move to .env (ignored) or .env.example (empty).`);
  process.exit(1);
}
process.exit(0);
