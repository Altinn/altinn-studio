/**
 * Which version control system a checkout uses, read off the marker at its
 * root: `.git` (a directory, or a file in a worktree) is git — which is also
 * what a colocated jj checkout gets — and `.jj` alone is a jj workspace.
 * Markers rather than `git rev-parse`, because that succeeds from anywhere
 * under an unrelated git repository, such as a dotfiles-managed home directory.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function detectVcs(root) {
  if (existsSync(join(root, '.git'))) return 'git';
  if (existsSync(join(root, '.jj'))) return 'jj';
  throw new Error(`${root} is neither a git nor a jj checkout: no .git or .jj at its root`);
}
