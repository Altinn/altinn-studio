// Copies the built app-frontend bundle into the Designer backend wwwroot so a locally-run backend
// (DEVELOP_BACKEND=1) can serve it for v9 previews, mirroring what the Dockerfile does for the docker
// stack. Run via `yarn build-app-frontend-bundle` (builds first), or directly if the bundle is built.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = path.join(repoRoot, 'src', 'App', 'frontend', 'dist');
const targetDir = path.join(
  repoRoot,
  'src',
  'Designer',
  'backend',
  'src',
  'Designer',
  'wwwroot',
  'altinn-app-frontend',
);

if (!fs.existsSync(sourceDir)) {
  console.error(
    `App frontend bundle not found at ${sourceDir}.\n` +
      'Build it first with `yarn workspace app-frontend-react build` (or run `yarn build-app-frontend-bundle`).',
  );
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied app-frontend bundle:\n  from ${sourceDir}\n  to   ${targetDir}`);