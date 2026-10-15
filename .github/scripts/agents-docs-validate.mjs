import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Validates the documentation structure described in docs/development/documentation.md:
//   1. AGENTS.md is the only agent instruction file, so a CLAUDE.md is a regression.
//   2. Every directory with an AGENTS.md also has a README.md.
//   3. AGENTS.md files use plain Markdown links, not harness-specific imports such as `@README.md`.
//   4. Skills live only in agents/skills/.
//   5. Relative links in AGENTS.md, README.md and docs/ files resolve.
//   6. docs/README.md links every file under docs/.
//   7. The root AGENTS.md repository map mentions every tracked top-level directory and every
//      tracked directory directly under src/.

const ROOT_DOC = 'AGENTS.md';
const DOCS_INDEX = 'docs/README.md';
const SKILLS_DIR = 'agents/skills/';
// Directories that intentionally have no entry in the root map.
const COVERAGE_EXEMPT = new Set(['node_modules']);

const errors = [];

function gitListFiles(...patterns) {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...patterns],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  // A file deleted in the working tree is still listed by --cached until the deletion is staged.
  return out.split('\n').filter((file) => file && fs.existsSync(file));
}

function gitListDirs(treeish) {
  const out = execFileSync('git', ['ls-tree', '-d', '--name-only', treeish], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return out.split('\n').filter(Boolean);
}

// Text outside fenced code blocks, so examples in code are not checked as links.
function proseOf(content) {
  return content.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
}

const agentsFiles = gitListFiles('AGENTS.md', '**/AGENTS.md');

// --- 1. Single instruction file ---

for (const file of gitListFiles('CLAUDE.md', '**/CLAUDE.md')) {
  errors.push(
    `${file}: CLAUDE.md is no longer used — put the guidance in ${path.join(path.dirname(file), 'AGENTS.md')}, which every agent reads directly`,
  );
}

// --- 2. README next to AGENTS.md ---

for (const file of agentsFiles) {
  const readme = path.join(path.dirname(file), 'README.md');
  if (!fs.existsSync(readme)) {
    errors.push(`${file}: no ${readme} next to it — move what people also need into a README`);
  }
}

// --- 3. No harness-specific imports ---

for (const file of agentsFiles) {
  const lines = proseOf(fs.readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, index) => {
    if (/^\s*@\S+\s*$/.test(line)) {
      errors.push(
        `${file}:${index + 1}: "${line.trim()}" is a harness-specific import — use a Markdown link`,
      );
    }
  });
}

// --- 4. Skills only in agents/skills/ ---

for (const file of gitListFiles('SKILL.md', '**/SKILL.md')) {
  if (!file.startsWith(SKILLS_DIR)) {
    errors.push(`${file}: skills live in ${SKILLS_DIR} — move it there`);
  }
}

// --- 5. Links ---

const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function resolveLink(file, target) {
  const linkPath = decodeURI(target.split('#')[0]);
  // Leading "/" means repo-root-relative (GitHub semantics), not doc-relative.
  return linkPath.startsWith('/') ? linkPath.slice(1) : path.join(path.dirname(file), linkPath);
}

const linkedFiles = [
  ...agentsFiles,
  ...gitListFiles('README.md', '**/README.md'),
  ...gitListFiles('docs/**/*.md'),
];

for (const file of new Set(linkedFiles)) {
  const content = proseOf(fs.readFileSync(file, 'utf8'));
  for (const match of content.matchAll(LINK_PATTERN)) {
    const target = match[1];
    if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    const resolved = resolveLink(file, target);
    if (!fs.existsSync(resolved)) {
      errors.push(`${file}: broken link "${target}" (resolved to ${resolved})`);
    }
  }
}

// --- 6. docs/ index ---

if (!fs.existsSync(DOCS_INDEX)) {
  errors.push(`${DOCS_INDEX}: missing`);
} else {
  const indexed = new Set();
  for (const match of proseOf(fs.readFileSync(DOCS_INDEX, 'utf8')).matchAll(LINK_PATTERN)) {
    indexed.add(path.normalize(resolveLink(DOCS_INDEX, match[1])));
  }
  for (const file of gitListFiles('docs/**')) {
    if (file === DOCS_INDEX || indexed.has(path.normalize(file))) continue;
    errors.push(`${file}: not linked from ${DOCS_INDEX}`);
  }
}

// --- 7. Root map coverage ---

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
  console.error(`Documentation validation failed with ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nSee docs/development/documentation.md.');
  process.exit(1);
}

console.log(
  `Documentation validation passed (${agentsFiles.length} AGENTS.md files, ${new Set(linkedFiles).size} files checked for links).`,
);
