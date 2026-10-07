import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Validates the AGENTS.md hierarchy (see /AGENTS.md "Conventions across the repo"):
//   1. Single instruction file — AGENTS.md is the only agent-guidance file, read directly by
//      every agent, so a CLAUDE.md anywhere in the repository is a regression.
//   2. Links — every relative markdown link inside an AGENTS.md resolves to a real path.
//   3. Coverage — every tracked top-level directory and every tracked directory directly
//      under src/ is mentioned in the root AGENTS.md repository map.

const ROOT_DOC = 'AGENTS.md';
// Directories that intentionally have no entry in the root map.
const COVERAGE_EXEMPT = new Set(['node_modules']);

const errors = [];

function gitListFiles(...patterns) {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...patterns],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  return out.split('\n').filter(Boolean);
}

function gitListDirs(treeish) {
  const out = execFileSync('git', ['ls-tree', '-d', '--name-only', treeish], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return out.split('\n').filter(Boolean);
}

// --- 1. Single instruction file ---

const agentsFiles = gitListFiles('AGENTS.md', '**/AGENTS.md');
const claudeFiles = gitListFiles('CLAUDE.md', '**/CLAUDE.md');

for (const file of claudeFiles) {
  errors.push(
    `${file}: CLAUDE.md is no longer used — put the guidance in ${path.join(path.dirname(file), 'AGENTS.md')}, which every agent reads directly`,
  );
}

// --- 2. Links ---

const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)\)/g;

for (const file of agentsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(LINK_PATTERN)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const linkPath = target.split('#')[0];
    // Leading "/" means repo-root-relative (GitHub semantics), not doc-relative.
    const resolved = linkPath.startsWith('/')
      ? linkPath.slice(1)
      : path.join(path.dirname(file), linkPath);
    if (!fs.existsSync(resolved)) {
      errors.push(`${file}: broken link "${target}" (resolved to ${resolved})`);
    }
  }
}

// --- 3. Root map coverage ---

if (!fs.existsSync(ROOT_DOC)) {
  errors.push(`${ROOT_DOC}: missing`);
} else {
  const rootDoc = fs.readFileSync(ROOT_DOC, 'utf8');
  const trackedDirs = [...gitListDirs('HEAD'), ...gitListDirs('HEAD:src').map((d) => `src/${d}`)];
  for (const dir of trackedDirs) {
    const name = path.basename(dir);
    if (COVERAGE_EXEMPT.has(name) || name.startsWith('.')) continue;
    const mentioned = new RegExp(
      `(^|[\\s\`\\[/(])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\`\\]/).,]|$)`,
      'm',
    ).test(rootDoc);
    if (!mentioned) {
      errors.push(`${ROOT_DOC}: tracked directory "${dir}" is not mentioned in the repository map`);
    }
  }
}

// --- Report ---

if (errors.length > 0) {
  console.error(`AGENTS.md validation failed with ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nSee the "Conventions across the repo" section of /AGENTS.md.');
  process.exit(1);
}

console.log(`AGENTS.md validation passed (${agentsFiles.length} AGENTS.md files checked).`);
