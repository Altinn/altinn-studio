const path = require('path');
const { spawnSync } = require('child_process');

const REPO_DIR = path.resolve(__dirname, '..', '..');

/**
 * The short hash of the revision the checkout is on, used as the tag for the
 * locally built Designer images (see the `${COMMIT:-latest}` tags in
 * src/Designer/compose.yaml).
 *
 * The backend probe mirrors `detectVcs` in scripts/spellcheck/lib.mjs — git
 * first, so CI and every colocated jj/git checkout stay on exactly the git
 * code path, jj only where git cannot answer at all. It is duplicated rather
 * than imported because that harness is ESM and this file is CommonJS.
 *
 * On the jj side the working copy *is* commit `@`, so `@` is the revision you
 * are on, the direct analogue of git's HEAD. `--ignore-working-copy` keeps
 * this probe read-only like `git rev-parse` — without it, merely building the
 * images would make jj take a working-copy snapshot and its lock. The cost is
 * that edits made since the last jj command are not reflected in the hash,
 * which for a local image tag is the right trade.
 */
const VCS_BACKENDS = [
  {
    name: 'git',
    probe: ['rev-parse', '--show-toplevel'],
    hash: ['rev-parse', '--short', 'HEAD'],
  },
  {
    name: 'jj',
    probe: ['root'],
    hash: ['log', '--no-graph', '--ignore-working-copy', '-r', '@', '-T', 'commit_id.short()'],
  },
];

module.exports = () => {
  for (const vcs of VCS_BACKENDS) {
    const probe = spawnSync(vcs.name, vcs.probe, { cwd: REPO_DIR, stdio: 'ignore' });
    if (probe.error || probe.status !== 0) continue;

    const res = spawnSync(vcs.name, vcs.hash, { cwd: REPO_DIR, encoding: 'utf8' });
    if (res.error) throw new Error(`could not run ${vcs.name}: ${res.error.message}`);
    if (res.status !== 0) {
      throw new Error(
        `\`${vcs.name} ${vcs.hash.join(' ')}\` exited ${res.status}: ${res.stderr.trim()}`,
      );
    }
    const hash = res.stdout.trim();
    if (!hash) throw new Error(`\`${vcs.name} ${vcs.hash.join(' ')}\` printed no commit hash`);
    return hash;
  }

  throw new Error(
    `no version control at ${REPO_DIR}: neither \`git rev-parse --show-toplevel\` nor ` +
      `\`jj root\` succeeded. Install git or jj, or run setup inside a checkout.`,
  );
};
