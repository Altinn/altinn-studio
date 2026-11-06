import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';

// Checks that the links in Markdown files work.
//
// Usage: node .github/scripts/link-check.mjs [--root-marker NAME] [--no-web] <file or folder> [...]
//
// It reads every Markdown file under the paths it gets, and checks the links outside code. A URL in code is a value
// to write, a namespace or an example, not a link.
//
// - A relative link must point to a file or folder that exists. It resolves from the file's folder, or from the
//   repository root when it starts with "/". With --root-marker, it may also resolve from the nearest folder above
//   the file that holds a file with that name. Agent Skills need --root-marker SKILL.md, since the specification
//   resolves their links from the skill's root.
// - A web link fails when it answers 404 or 410, or when its host does not exist or refuses the connection. Other
//   answers, such as 403, 429, 5xx or a timeout, are warnings, since they say little about whether the page exists.

const FENCED_CODE = /^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const INLINE_LINK = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE_DEFINITION = /^[ \t]{0,3}\[[^\]]+\]:[ \t]*<?(\S+?)>?(?:[ \t]|$)/gm;
const WEB_URL = /https?:\/\/[^\s<>"'`)\]]+/g;
const NOT_A_FILE = /^(?:[a-z][a-z0-9+.-]*:|#)/i;
// URLs with these are templates or examples, such as https://{org}.apps.altinn.no/<path>.
const PLACEHOLDER = /[{}<>*]|\.\.\.|…/;
const SKIPPED_HOSTS = new Set(['localhost', '127.0.0.1', 'local.altinn.cloud']);
const EXAMPLE_HOST = /(^|\.)example\.[a-z]+$/;

// Requests to docs pages usually take a second or two. Twenty seconds allows for a slow host, and three attempts let
// a passing 429 or 5xx clear before the check gives up on a URL.
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
// Enough to finish a few hundred links in seconds without looking like a burst to the hosts.
const CONCURRENCY = 8;
const USER_AGENT = 'altinn-studio-link-check (+https://github.com/Altinn/altinn-studio)';
const NO_HOST = new Set(['ENOTFOUND', 'ECONNREFUSED']);

const errors = [];
const warnings = [];

function report(list, level, message, file) {
  list.push(message);
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::${level} file=${file}::${message}`);
}

function markdownFiles(paths) {
  const files = new Set();
  for (const target of paths) {
    if (fs.statSync(target).isDirectory()) {
      for (const entry of fs.readdirSync(target, { recursive: true })) {
        const file = path.join(target, entry);
        if (file.endsWith('.md') && fs.statSync(file).isFile()) files.add(file);
      }
    } else if (target.endsWith('.md')) {
      files.add(target);
    }
  }
  return [...files].sort();
}

function proseOf(text) {
  return text.replace(FENCED_CODE, '').replace(INLINE_CODE, '');
}

function markerRoot(file, marker) {
  if (!marker) return null;
  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, marker))) return dir;
    if (dir === path.dirname(dir)) return null;
  }
}

function checkRelativeLinks(files, marker) {
  let count = 0;
  for (const file of files) {
    const text = proseOf(fs.readFileSync(file, 'utf8'));
    const root = markerRoot(file, marker);
    const targets = [...text.matchAll(INLINE_LINK), ...text.matchAll(REFERENCE_DEFINITION)].map(
      (match) => match[1],
    );
    for (const target of targets) {
      if (NOT_A_FILE.test(target)) continue;
      const linked = target.split('#')[0].split('?')[0];
      if (!linked) continue;
      count += 1;
      const candidates = linked.startsWith('/')
        ? [path.join(process.cwd(), linked)]
        : [path.join(path.dirname(file), linked), ...(root ? [path.join(root, linked)] : [])];
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        report(errors, 'error', `${file}: link to missing file ${target}`, file);
      }
    }
  }
  return count;
}

function webLinks(files) {
  const links = new Map();
  for (const file of files) {
    for (const [raw] of proseOf(fs.readFileSync(file, 'utf8')).matchAll(WEB_URL)) {
      const url = raw.replace(/[.,;:!?]+$/, '').split('#')[0];
      let host;
      try {
        host = new URL(url).hostname;
      } catch {
        report(warnings, 'warning', `${file}: ${url} is not a valid URL`, file);
        continue;
      }
      if (PLACEHOLDER.test(url) || SKIPPED_HOSTS.has(host) || EXAMPLE_HOST.test(host)) continue;
      if (!links.has(url)) links.set(url, []);
      links.get(url).push(file);
    }
  }
  return links;
}

// The final status after redirects, or null and the reason when no answer came.
async function fetchStatus(url) {
  let reason = 'no answer';
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      await response.body?.cancel();
      if (RETRY_STATUSES.has(response.status) && attempt + 1 < ATTEMPTS) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      return { status: response.status };
    } catch (error) {
      const code = error.cause?.code;
      if (NO_HOST.has(code))
        return { status: null, reason: `cannot connect: ${code}`, noHost: true };
      reason = code ?? error.name ?? String(error);
      await delay(2000 * (attempt + 1));
    }
  }
  return { status: null, reason };
}

async function checkWebLinks(files) {
  const links = webLinks(files);
  const urls = [...links.keys()];
  const results = new Map();
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await fetchStatus(url));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  let broken = 0;
  for (const url of urls.sort()) {
    const { status, reason, noHost } = results.get(url);
    if (status !== null && status < 400) continue;
    const where = [...new Set(links.get(url))].sort().join(', ');
    if (status === 404 || status === 410 || noHost) {
      broken += 1;
      report(
        errors,
        'error',
        `${url} is broken (${status ?? reason}), linked from ${where}`,
        links.get(url)[0],
      );
    } else {
      report(
        warnings,
        'warning',
        `${url} could not be checked (${status ?? reason}), linked from ${where}`,
        links.get(url)[0],
      );
    }
  }
  return { checked: urls.length, broken };
}

const { values, positionals } = parseArgs({
  options: { 'root-marker': { type: 'string' }, 'no-web': { type: 'boolean' } },
  allowPositionals: true,
});
const missing = positionals.filter((target) => !fs.existsSync(target));
if (positionals.length === 0 || missing.length > 0) {
  console.error(
    missing.length
      ? `${missing.join(', ')} does not exist`
      : 'Name the Markdown files or folders to check.',
  );
  process.exit(2);
}
const files = markdownFiles(positionals);
if (files.length === 0) {
  console.error('Found no Markdown files.');
  process.exit(2);
}

const relative = checkRelativeLinks(files, values['root-marker']);
const summary = [`Checked ${relative} relative links in ${files.length} Markdown files.`];
if (!values['no-web']) {
  const { checked, broken } = await checkWebLinks(files);
  summary.push(`Checked ${checked} web links: ${broken} broken.`);
}

for (const line of summary) console.log(line);
for (const message of warnings) console.log(`warning: ${message}`);
for (const message of errors) console.log(`error: ${message}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Links\n\n${summary.join('\n')}\n`);
}
process.exit(errors.length > 0 ? 1 : 0);
