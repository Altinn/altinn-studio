// Copies the built Altinn app-frontend bundle into the Designer backend wwwroot so a locally-run
// Designer backend (DEVELOP_BACKEND=1) can serve it for v9 app previews.
//
// In production (and the full docker stack) the Designer Dockerfile builds src/App/frontend and copies
// its dist into wwwroot/altinn-app-frontend/. When running the Designer backend directly, wwwroot comes
// from the source tree and does not contain the bundle, so v9 previews would fail to load app-frontend.
// This script mirrors the Dockerfile copy for local development.
//
// Usage (from the repo root): `yarn build-app-frontend-bundle` (builds the bundle first, then copies),
// or `node src/Designer/development/copy-app-frontend-bundle.mjs` if the bundle is already built.

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