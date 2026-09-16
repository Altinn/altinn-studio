#!/usr/bin/env node
/**
 * The version-control-dependent half of `yarn setup`: installing the git hooks
 * and pointing `git blame` at the ignore-revs file CONTRIBUTING.md documents.
 *
 * Both are git-only operations. This repository is also developed in jj
 * workspaces, which have no `.git` directory at all, so every git call in one
 * fails — and before this script that failure took the whole setup down with
 * it, long before it reached the Designer stack it is actually there to bring
 * up. Neither piece is meaningful without git, so in a jj workspace each skips
 * with a message saying what was skipped and why.
 *
 * The probe mirrors `detectVcs` in scripts/spellcheck/lib.mjs: git first, so
 * CI and every colocated jj/git checkout stay on exactly the git code path;
 * jj only where git cannot answer; and a clear error naming both when neither
 * does. The two commands share this file so that probe exists once.
 *
 * Usage: node scripts/vcs-setup.mjs <hooks|blame-ignore-revs>
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');

const VCS_BACKENDS = [
  // Fails outside a work tree, which is precisely the question.
  { name: 'git', probe: ['rev-parse', '--show-toplevel'] },
  { name: 'jj', probe: ['root'] },
];

/** The name of the VCS serving the repository root, or a hard failure. */
function detectVcs() {
  for (const vcs of VCS_BACKENDS) {
    const res = spawnSync(vcs.name, vcs.probe, { cwd: REPO_ROOT, stdio: 'ignore' });
    if (!res.error && res.status === 0) return vcs.name;
  }
  throw new Error(
    `no version control at ${REPO_ROOT}: neither \`git rev-parse --show-toplevel\` nor ` +
      `\`jj root\` succeeded. Install git or jj, or run setup inside a checkout.`,
  );
}

/**
 * Installs the lefthook-managed hooks. lefthook writes them into `.git/hooks`,
 * and jj has no native hook mechanism to write them into instead, so a jj
 * workspace gets no hooks — the checks they run are still available by hand
 * and CI remains the real gate.
 */
function installHooks(vcs) {
  if (vcs !== 'git') {
    console.log(
      'Skipping `lefthook install`: this is a jj workspace with no .git, lefthook installs ' +
        'git hooks, and jj has no hook mechanism to install them into. Run the checks manually ' +
        'when you need them (e.g. `yarn spell:quick`, `yarn codestyle:fix`); CI runs them too.',
    );
    return;
  }
  // Run lefthook's own launcher directly rather than relying on the PATH yarn
  // sets up, so this behaves the same however the script is invoked.
  const launcher = join(REPO_ROOT, 'node_modules', 'lefthook', 'bin', 'index.js');
  if (!existsSync(launcher)) {
    throw new Error(`lefthook is not installed at ${launcher} — run \`yarn install\` first.`);
  }
  const res = spawnSync(process.execPath, [launcher, 'install'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (res.error) throw new Error(`could not run lefthook: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`\`lefthook install\` exited ${res.status}`);
}

/**
 * Configures `git blame` to skip the pure-reformatting commits listed in
 * .git-blame-ignore-revs — the manual step CONTRIBUTING.md asks every
 * contributor to run. The path is repo-relative and git resolves it against
 * the work tree root, so blame works from any subdirectory. Setting the key
 * replaces any previous value, which makes re-running setup a no-op.
 */
function configureBlameIgnoreRevs(vcs) {
  if (vcs !== 'git') {
    console.log(
      'Skipping `git config blame.ignoreRevsFile`: this is a jj workspace with no .git, so ' +
        'there is no git configuration to write and no `git blame` to configure.',
    );
    return;
  }
  const res = spawnSync('git', ['config', 'blame.ignoreRevsFile', '.git-blame-ignore-revs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (res.error) throw new Error(`could not run git: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(`\`git config blame.ignoreRevsFile\` exited ${res.status}: ${res.stderr}`);
  }
  console.log('Configured `git blame` to ignore the revisions in .git-blame-ignore-revs');
}

const COMMANDS = { hooks: installHooks, 'blame-ignore-revs': configureBlameIgnoreRevs };

const command = process.argv[2];
const run = COMMANDS[command];
if (!run) {
  console.error(
    `usage: node scripts/vcs-setup.mjs <${Object.keys(COMMANDS).join('|')}>` +
      (command ? `\nunknown command '${command}'` : ''),
  );
  process.exit(2);
}

try {
  run(detectVcs());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
