import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function main(): Promise<void> {
  const contractPath = '../../common/ts/layout-contract';
  const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--untracked-files=all', '--', contractPath]);

  if (stdout) {
    process.stderr.write('Generated layout contract is not up to date:\n');
    process.stderr.write(stdout);
    process.exitCode = 1;
  }
}

void main();
