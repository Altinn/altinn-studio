import { spawnSync } from 'node:child_process';

// This script outputs the number of typescript errors when using the strict settings in the tsconfig-strict.json file.
// It is used in the CI pipeline to check that the number of strict errors does not increase. Then end goal is to get rid of all strict errors and enable the strict settings in the main tsconfig.json file.
const result = spawnSync('tsc', ['--project', 'tsconfig-strict.json', '--pretty', 'false'], {
  encoding: 'utf-8',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const errorCount = output.match(/\berror TS\d+:/g)?.length ?? 0;

process.stdout.write(`${errorCount.toString()}\n`);

process.exit(0);
