import { spawnSync } from 'node:child_process';

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
