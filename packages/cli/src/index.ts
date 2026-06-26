import { parseArgs } from 'node:util';
import { assess } from './commands/assess';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { publish } from './commands/publish';
import { report } from './commands/report';
import { CLI_VERSION } from './config';
import { bold, cyan, dim } from './ui';

const HELP = `${bold('truehire')} ${dim(`v${CLI_VERSION}`)} — your local AI-build profile

${bold('Usage')}
  truehire <command> [options]

${bold('Commands')}
  login             Connect this machine to your TrueHire account (opens browser)
  assess            Scan local AI tools and compute your AI build profile
  report            Generate a PDF report locally (and optionally publish it)
  publish           Publish the profile to your verified TrueHire account
  logout            Disconnect this machine and revoke its token
  help              Show this help
  version           Print the version

${bold('Options')}
  --token <token>   Use an explicit token instead of the stored login

${bold('Privacy')}
  Everything is computed on your machine. Only aggregate counts and ratios
  are produced — never prompt text, code, or file paths. Publishing sends
  only the score summary, bound to your GitHub-verified identity.
`;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const command = argv[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(HELP);
    return 0;
  }
  if (command === 'version' || command === '--version' || command === '-v') {
    process.stdout.write(`${CLI_VERSION}\n`);
    return 0;
  }
  if (command === 'login') {
    return login();
  }
  if (command === 'logout') {
    return logout();
  }
  if (command === 'assess') {
    return assess();
  }
  if (command === 'report') {
    const rest = argv.slice(1);
    const send = rest.includes('--publish')
      ? true
      : rest.includes('--no-publish')
        ? false
        : undefined;
    return report(send);
  }
  if (command === 'publish') {
    const { values } = parseArgs({
      args: argv.slice(1),
      options: { token: { type: 'string' } },
      allowPositionals: false,
    });
    return publish(values.token);
  }

  process.stderr.write(`Unknown command: ${command}\nRun ${cyan('truehire help')} for usage.\n`);
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exitCode = 1;
  });
