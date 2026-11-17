import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Validates the documentation structure described in docs/documentation.md:
//   1. AGENTS.md is the only agent instruction file, so a CLAUDE.md is a regression.
//   2. Every directory with an AGENTS.md also has a README.md.
//   3. AGENTS.md files use plain Markdown links, not harness-specific imports such as `@README.md`.
//   4. Skills live only in agents/_skills/, apart from the Studio Assistant's own.
//   5. Relative links in the root docs, AGENTS.md, README.md and docs/ files resolve.
//   6. Every docs/ folder has a README.md that links each doc in it, directly or through a link to a folder that
//      holds it. Images and generated files need no link.

const DOCS_DIR = 'docs';
const INDEX_EXEMPT = /\.(png|jpe?g|gif|webp)$|\.generated\./;
const SKILLS_DIRS = ['agents/_skills/', 'src/AI/assistant/agents/skills/'];

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

// --- 4. Skills only in agents/_skills/ ---

for (const file of gitListFiles('SKILL.md', '**/SKILL.md')) {
  if (!SKILLS_DIRS.some((dir) => file.startsWith(dir))) {
    errors.push(`${file}: skills live in ${SKILLS_DIRS[0]} — move it there`);
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
  ...gitListFiles('CONTRIBUTING.md', 'GLOSSARY.md'),
  ...agentsFiles,
  ...gitListFiles('README.md', '**/README.md'),
  // Without the glob magic, "*" also matches "/", so these include subfolders.
  ...gitListFiles('docs/*.md', '*/docs/*.md').filter((file) => !INDEX_EXEMPT.test(file)),
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

// --- 6. docs/ indexes ---

// The docs/ folder a file belongs to: the deepest folder named docs on its path.
function docsDirOf(file) {
  const parts = path.dirname(file).split('/');
  const index = parts.lastIndexOf(DOCS_DIR);
  return index === -1 ? null : parts.slice(0, index + 1).join('/');
}

const docsByDir = new Map();
for (const file of gitListFiles('docs/**', '**/docs/**')) {
  const dir = docsDirOf(file);
  if (!dir || INDEX_EXEMPT.test(file) || file === path.join(dir, 'README.md')) continue;
  if (!docsByDir.has(dir)) docsByDir.set(dir, []);
  docsByDir.get(dir).push(file);
}

for (const [dir, files] of docsByDir) {
  const index = path.join(dir, 'README.md');
  if (!fs.existsSync(index)) {
    errors.push(`${index}: missing — every docs/ folder has a README that links its docs`);
    continue;
  }
  const linked = [];
  for (const match of proseOf(fs.readFileSync(index, 'utf8')).matchAll(LINK_PATTERN)) {
    if (/^([a-z][a-z0-9+.-]*:|#)/i.test(match[1])) continue;
    linked.push(path.normalize(resolveLink(index, match[1])).replace(/\/$/, ''));
  }
  for (const file of files) {
    const covered = linked.some((target) => file === target || file.startsWith(`${target}/`));
    if (!covered) errors.push(`${file}: not linked from ${index}`);
  }
}

// --- Report ---

if (errors.length > 0) {
  console.error(`Documentation validation failed with ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nSee docs/documentation.md.');
  process.exit(1);
}

console.log(
  `Documentation validation passed (${agentsFiles.length} AGENTS.md files, ${new Set(linkedFiles).size} files checked for links).`,
);
