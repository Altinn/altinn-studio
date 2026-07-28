import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Finds the .git directory for this checkout, starting from this project and walking upwards.
 * Handles both the standalone repo layout (.git directly in the frontend directory), the
 * monorepo layout (.git at the repository root) and git worktrees (where .git is a file
 * containing a `gitdir: <path>` pointer).
 */
function findGitDir(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, '.git');
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
      const content = fs.readFileSync(candidate, 'utf-8');
      const match = content.match(/^gitdir: (.+)$/m);
      if (match) {
        return path.resolve(dir, match[1].trim());
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Reads the currently checked out git branch. Re-read on every request so that switching
 * branches while the dev server is running is reflected immediately.
 */
function readCurrentBranch(): string {
  try {
    const gitDir = findGitDir(import.meta.dirname);
    if (!gitDir) {
      return 'unknown-branch';
    }
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim();
    const match = head.match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : 'unknown-branch';
  } catch {
    return 'unknown-branch';
  }
}

/**
 * Adds two headers to every dev-server response:
 * - `Access-Control-Allow-Origin: *`, because the app page (served by the app backend through
 *   LocalTest) loads our script, modules and schemas from a different origin.
 * - `X-Altinn-Frontend-Branch: <branch>`, which LocalTest uses to detect that a local dev
 *   server is running (and to display which branch it serves).
 */
export function devServerHeadersPlugin(): Plugin {
  return {
    name: 'altinn:dev-server-headers',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Altinn-Frontend-Branch', readCurrentBranch());
        next();
      });
    },
  };
}
