const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/**
 * The short hash of the commit the checkout is on, used as the tag for the
 * locally built Designer images (the `${COMMIT:-latest}` tags in
 * src/Designer/compose.yaml).
 */
module.exports = () => {
  let command;
  if (fs.existsSync(path.join(REPO_ROOT, '.git'))) {
    command = ['git', 'rev-parse', '--short', 'HEAD'];
  } else if (fs.existsSync(path.join(REPO_ROOT, '.jj'))) {
    // `@-` is what jj points git HEAD at in a colocated checkout.
    command = [
      'jj',
      'log',
      '--no-graph',
      '--ignore-working-copy',
      '-r',
      '@-',
      '-T',
      'commit_id.short()',
    ];
  } else {
    throw new Error(`${REPO_ROOT} is neither a git nor a jj checkout: no .git or .jj at its root`);
  }

  const [executable, ...args] = command;
  const res = spawnSync(executable, args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (res.error) throw new Error(`could not run ${executable}: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(`\`${command.join(' ')}\` exited ${res.status}: ${res.stderr.trim()}`);
  }
  const hash = res.stdout.trim();
  if (!hash) throw new Error(`\`${command.join(' ')}\` printed no commit hash`);
  return hash;
};
