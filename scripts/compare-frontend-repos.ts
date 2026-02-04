#!/usr/bin/env npx tsx
/**
 * compare-frontend-repos.ts
 *
 * Compares src/App/frontend (monorepo) with ../app-frontend-react (legacy repo).
 * Lists files and folders that have changed significantly (>=50% of lines) in the
 * monorepo copy. New files (only in monorepo) are ignored.
 *
 * Output: a list of paths (files and collapsed folders) suitable for use in a
 * commit-hook in the legacy repo.
 *
 * Usage: npx tsx scripts/compare-frontend-repos.ts [--threshold 50] [--folder-collapse 60]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';

// --- Config ---
const args = process.argv.slice(2);
function getArg(name: string, fallback: number): number {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? Number(args[idx + 1]) : fallback;
}

const THRESHOLD = getArg('threshold', 50);
const FOLDER_COLLAPSE = getArg('folder-collapse', 60);

const SCRIPT_DIR = __dirname;
const MONO_DIR = resolve(SCRIPT_DIR, '../src/App/frontend');
const LEGACY_DIR = resolve(SCRIPT_DIR, '../../app-frontend-react');

// Binary extensions to skip (diff doesn't make sense for these)
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.gz', '.zip', '.tar', '.pdf',
]);

// --- Helpers ---
function getGitBranch(dir: string): string {
  try {
    return execSync(`git -C "${dir}" rev-parse --abbrev-ref HEAD`, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** Get all tracked files in a git repo (respects .gitignore) */
function getTrackedFiles(repoDir: string): string[] {
  const output = execSync('git ls-files', { cwd: repoDir, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return output.trim().split('\n').filter(Boolean);
}

function countChangedLines(legacyPath: string, monoPath: string): { changed: number; total: number } {
  const legacyContent = readFileSync(legacyPath, 'utf8');
  const monoContent = readFileSync(monoPath, 'utf8');

  if (legacyContent === monoContent) {
    return { changed: 0, total: legacyContent.split('\n').length };
  }

  try {
    const diffOutput = execSync(
      `diff --unified=0 "${legacyPath}" "${monoPath}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    // If diff returns 0, files are identical
    return { changed: 0, total: legacyContent.split('\n').length };
  } catch (err: any) {
    // diff exits with 1 when files differ
    if (err.status === 1) {
      const output: string = err.stdout || '';
      // Only count removed/changed lines (starting with -) from the legacy file.
      // This gives "what % of the original was modified" and caps at 100%.
      const changedLines = output
        .split('\n')
        .filter((line: string) => /^-[^-]/.test(line))
        .length;
      const totalLines = Math.max(legacyContent.split('\n').length, 1);
      return { changed: changedLines, total: totalLines };
    }
    // Other error
    return { changed: 0, total: 1 };
  }
}

// --- Main ---
function main() {
  // Verify branches
  for (const [label, dir] of [['Monorepo', MONO_DIR], ['Legacy', LEGACY_DIR]] as const) {
    const branch = getGitBranch(dir);
    if (branch !== 'main') {
      console.error(`ERROR: ${label} repo (${dir}) is on branch '${branch}', expected 'main'`);
      process.exit(1);
    }
  }

  console.log(`Monorepo frontend: ${MONO_DIR}`);
  console.log(`Legacy repo:       ${LEGACY_DIR}`);
  console.log(`Change threshold:  ${THRESHOLD}%`);
  console.log(`Folder collapse:   ${FOLDER_COLLAPSE}% of files in a directory`);
  console.log();

  // Get tracked files from legacy repo (respects .gitignore)
  console.log('Scanning files...');
  const allLegacyFiles = getTrackedFiles(LEGACY_DIR);
  // Filter out binary files
  const legacyFiles = allLegacyFiles.filter((f) => {
    const ext = f.slice(f.lastIndexOf('.'));
    return !SKIP_EXTENSIONS.has(ext);
  });

  // Compare each file
  const compared = new Set<string>();              // all files present in both repos
  const significantFiles = new Map<string, number>(); // relpath -> change %
  const deletedFiles = new Set<string>();           // files in legacy but removed in monorepo

  for (const relpath of legacyFiles) {
    const monoFile = join(MONO_DIR, relpath);
    if (!existsSync(monoFile)) {
      deletedFiles.add(relpath);
      continue;
    }

    compared.add(relpath);

    const legacyFile = join(LEGACY_DIR, relpath);
    const { changed, total } = countChangedLines(legacyFile, monoFile);
    const pct = Math.round((changed * 100) / Math.max(total, 1));

    if (pct >= THRESHOLD) {
      significantFiles.set(relpath, pct);
    }
  }

  console.log(`Compared ${compared.size} files, ${significantFiles.size} significantly changed, ${deletedFiles.size} deleted in monorepo.`);
  console.log();

  // --- Directory stats ---
  // "total" = all legacy files (compared + deleted), "significant" = changed + deleted
  const dirTotal = new Map<string, number>();
  const dirSignificant = new Map<string, number>();

  for (const relpath of compared) {
    const dir = dirname(relpath);
    dirTotal.set(dir, (dirTotal.get(dir) || 0) + 1);
  }
  for (const relpath of deletedFiles) {
    const dir = dirname(relpath);
    dirTotal.set(dir, (dirTotal.get(dir) || 0) + 1);
    dirSignificant.set(dir, (dirSignificant.get(dir) || 0) + 1);
  }
  for (const relpath of significantFiles.keys()) {
    const dir = dirname(relpath);
    dirSignificant.set(dir, (dirSignificant.get(dir) || 0) + 1);
  }

  // Determine which directories to collapse
  const collapsedDirs = new Map<string, { sig: number; total: number }>();
  for (const [dir, total] of dirTotal) {
    const sig = dirSignificant.get(dir) || 0;
    if (sig < 2) continue;
    const pct = Math.round((sig * 100) / total);
    if (pct >= FOLDER_COLLAPSE) {
      collapsedDirs.set(dir, { sig, total });
    }
  }

  // Remove child dirs absorbed by parent dirs (shallowest first)
  const sortedCollapsed = [...collapsedDirs.keys()].sort(
    (a, b) => a.split('/').length - b.split('/').length
  );
  const absorbed = new Set<string>();

  for (const dir of sortedCollapsed) {
    if (absorbed.has(dir)) continue;
    // Mark all descendants as absorbed
    for (const other of sortedCollapsed) {
      if (other !== dir && other.startsWith(dir + '/')) {
        absorbed.add(other);
      }
    }
  }
  for (const dir of absorbed) {
    collapsedDirs.delete(dir);
  }

  // --- Build output ---
  const outputLines: string[] = [];

  for (const [dir, { sig, total }] of collapsedDirs) {
    outputLines.push(`${dir}/  (${sig}/${total} files significantly changed)`);
  }

  const isCovered = (relpath: string) => {
    const filedir = dirname(relpath);
    return [...collapsedDirs.keys()].some(
      (cdir) => filedir === cdir || filedir.startsWith(cdir + '/')
    );
  };

  for (const [relpath, pct] of significantFiles) {
    if (!isCovered(relpath)) {
      outputLines.push(`${relpath}  (${pct}% changed)`);
    }
  }

  for (const relpath of deletedFiles) {
    if (!isCovered(relpath)) {
      outputLines.push(`${relpath}  (deleted in monorepo)`);
    }
  }

  outputLines.sort();

  console.log('=== Significantly changed paths (monorepo vs legacy) ===');
  console.log();
  for (const line of outputLines) {
    console.log(`  ${line}`);
  }
  console.log();
  console.log(`Total: ${outputLines.length} entries`);

  // --- Machine-readable output ---
  const machinePaths = outputLines.map((line) => line.split('  ')[0]);
  const machineFile = join(SCRIPT_DIR, 'changed-paths.txt');
  const machineContent = [
    '# Auto-generated by compare-frontend-repos.ts',
    '# Files and folders significantly changed in the monorepo frontend',
    '# relative to the legacy app-frontend-react repo.',
    `# Generated: ${new Date().toISOString()}`,
    '',
    ...machinePaths,
    '',
  ].join('\n');

  writeFileSync(machineFile, machineContent);
  console.log();
  console.log(`Machine-readable list written to: ${machineFile}`);
}

main();
