import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { values } = parseArgs({
  options: {
    serviceOwner: { type: 'string' },
  },
});

const now = new Date();
const startOfYesterday = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
);
const endOfYesterday = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 1,
);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mainScript = path.join(scriptDir, 'fetchLlmCosts.js');

const args = [
  mainScript,
  '--from',
  startOfYesterday.toISOString(),
  '--to',
  endOfYesterday.toISOString(),
];

if (values.serviceOwner) {
  args.push('--serviceOwner', values.serviceOwner);
}

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

process.exit(result.status ?? 0);
