#!/usr/bin/env node
/**
 * Usage: node scripts/vcs-setup.mjs <hooks|blame-ignore-revs>
 *
 * The git-only steps of `yarn setup`, skipped with a note in a jj workspace,
 * which has no .git for lefthook or `git config` to write into.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { detectVcs } from './vcs.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');

const STEPS = {
  hooks: ['lefthook', 'install'],
  'blame-ignore-revs': ['git', 'config', 'blame.ignoreRevsFile', '.git-blame-ignore-revs'],
};

const step = STEPS[process.argv[2]];
if (!step) {
  console.error(`usage: node scripts/vcs-setup.mjs <${Object.keys(STEPS).join('|')}>`);
  process.exitCode = 2;
} else {
  try {
    if (detectVcs(REPO_ROOT) === 'jj') {
      console.log(`jj workspace (no .git): skipping \`${step.join(' ')}\`.`);
    } else {
      const [command, ...args] = step;
      const res = spawnSync(command, args, {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32', // lefthook is a .cmd shim there
      });
      if (res.error) throw new Error(`could not run ${command}: ${res.error.message}`);
      if (res.status !== 0) throw new Error(`\`${step.join(' ')}\` exited ${res.status}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
