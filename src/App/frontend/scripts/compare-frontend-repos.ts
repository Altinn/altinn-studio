#!/usr/bin/env npx tsx

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

const CHANGE_THRESHOLD = 50;
const FOLDER_COLLAPSE_THRESHOLD = 60;

const args = process.argv.slice(2);
const command = args[0];
const mode = command === 'verify' ? 'verify' : command === 'update' || command === undefined ? 'update' : undefined;

if (!mode) {
  console.error('Usage: tsx scripts/compare-frontend-repos.ts [update|verify]');
  process.exit(2);
}

const frontendDir = resolve(__dirname, '..');
const legacyDir = resolve(frontendDir, '../../../../app-frontend-react');
const outputFile = join(frontendDir, 'monorepo-changed-paths.txt');

const skipExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.gz',
  '.zip',
  '.tar',
  '.pdf',
]);

function getTrackedFiles(repoDir: string): string[] {
  return execFileSync('git', ['ls-files'], {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })
    .trim()
    .split('\n')
    .filter(Boolean);
}

function countChangedLines(legacyPath: string, frontendPath: string): { changed: number; total: number } {
  const legacyContent = readFileSync(legacyPath, 'utf8');
  const frontendContent = readFileSync(frontendPath, 'utf8');

  if (legacyContent === frontendContent) {
    return { changed: 0, total: Math.max(legacyContent.split('\n').length, 1) };
  }

  try {
    execFileSync('diff', ['--unified=0', legacyPath, frontendPath], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { changed: 0, total: Math.max(legacyContent.split('\n').length, 1) };
  } catch (error: unknown) {
    const { status, stdout } = error as { status?: number; stdout?: string };

    if (status !== 1) {
      throw error;
    }

    // Intentionally only count removed legacy lines, not insert-only changes in the monorepo.
    const changed = (stdout ?? '').split('\n').filter((line) => /^-[^-]/.test(line)).length;

    return { changed, total: Math.max(legacyContent.split('\n').length, 1) };
  }
}

function collectChangedPaths(): string[] {
  if (!existsSync(legacyDir)) {
    throw new Error(`Legacy frontend repo not found: ${legacyDir}`);
  }

  // Intentionally only scan legacy-tracked files. Monorepo-only additions are not included in this report.
  const legacyFiles = getTrackedFiles(legacyDir).filter(
    (file) => !skipExtensions.has(file.slice(file.lastIndexOf('.'))),
  );
  const significantFiles = new Set<string>();
  const deletedFiles = new Set<string>();
  const dirTotals = new Map<string, number>();
  const dirChanged = new Map<string, number>();

  for (const relPath of legacyFiles) {
    const dir = dirname(relPath);
    dirTotals.set(dir, (dirTotals.get(dir) ?? 0) + 1);

    const frontendPath = join(frontendDir, relPath);
    if (!existsSync(frontendPath)) {
      deletedFiles.add(relPath);
      dirChanged.set(dir, (dirChanged.get(dir) ?? 0) + 1);
      continue;
    }

    const legacyPath = join(legacyDir, relPath);
    const { changed, total } = countChangedLines(legacyPath, frontendPath);
    const percentChanged = Math.round((changed * 100) / Math.max(total, 1));

    if (percentChanged >= CHANGE_THRESHOLD) {
      significantFiles.add(relPath);
      dirChanged.set(dir, (dirChanged.get(dir) ?? 0) + 1);
    }
  }

  const collapsedDirs = [...dirTotals.entries()]
    .filter(([dir, total]) => {
      const changed = dirChanged.get(dir) ?? 0;
      return changed >= 2 && Math.round((changed * 100) / total) >= FOLDER_COLLAPSE_THRESHOLD;
    })
    .map(([dir]) => dir)
    .sort((a, b) => a.split('/').length - b.split('/').length)
    .filter((dir, index, dirs) => !dirs.slice(0, index).some((parent) => dir.startsWith(`${parent}/`)));

  const isCovered = (relPath: string) => {
    const dir = dirname(relPath);
    return collapsedDirs.some((collapsedDir) => dir === collapsedDir || dir.startsWith(`${collapsedDir}/`));
  };

  return [
    ...collapsedDirs.map((dir) => `${dir}/`),
    ...[...significantFiles].filter((path) => !isCovered(path)),
    ...[...deletedFiles].filter((path) => !isCovered(path)),
  ].sort();
}

function toFileContent(paths: string[]): string {
  return `${paths.join('\n')}\n`;
}

const expectedContent = toFileContent(collectChangedPaths());

if (mode === 'verify') {
  if (!existsSync(outputFile) || readFileSync(outputFile, 'utf8') !== expectedContent) {
    console.error(`${outputFile} is out of date. Run: tsx scripts/compare-frontend-repos.ts update`);
    process.exit(1);
  }

  process.exit(0);
}

writeFileSync(outputFile, expectedContent);
