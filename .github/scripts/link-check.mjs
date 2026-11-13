import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Checks that the web links in Markdown files work.
//
// Usage: node .github/scripts/link-check.mjs <file or folder> [...]
//
// It reads every Markdown file under the paths it gets, and checks the web links outside code. A URL in code is a
// value to write, a namespace or an example, not a link. A link fails when it answers 404 or 410, or when its host does
// not exist or refuses the connection. Other answers, such as 403, 429, 5xx or a timeout, are warnings, since they say
// little about whether the page exists.
//
// Relative links are checked elsewhere: in the Studio Assistant's skills by its unit tests, and in the docs by
// agents-docs-validate.mjs.

// A fence closes on a line of the same character, at least as long as the one that opened it, with nothing after it.
const FENCED_CODE = /^[ \t]*((`|~)\2{2,})[^\n]*\n[\s\S]*?^[ \t]*\1\2*[ \t]*$/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const WEB_URL = /https?:\/\/[^\s<>"'`)\]]+/g;
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

function report(level, message, file) {
  (level === 'error' ? errors : warnings).push(message);
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

// Each URL, with the files that link to it, in the order of `files`.
function webLinks(files) {
  const links = new Map();
  for (const file of files) {
    for (const [raw] of proseOf(fs.readFileSync(file, 'utf8')).matchAll(WEB_URL)) {
      const url = raw.replace(/[.,;:!?]+$/, '').split('#')[0];
      let host;
      try {
        host = new URL(url).hostname;
      } catch {
        report('warning', `${file}: ${url} is not a valid URL`, file);
        continue;
      }
      if (PLACEHOLDER.test(url) || SKIPPED_HOSTS.has(host) || EXAMPLE_HOST.test(host)) continue;
      if (!links.has(url)) links.set(url, new Set());
      links.get(url).add(file);
    }
  }
  return links;
}

async function fetchStatus(url) {
  let reason = 'no answer';
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (attempt > 0) await delay(2000 * attempt);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      await response.body?.cancel();
      if (!RETRY_STATUSES.has(response.status) || attempt + 1 === ATTEMPTS) {
        return { status: response.status };
      }
    } catch (error) {
      const code = error.cause?.code;
      if (NO_HOST.has(code))
        return { status: null, reason: `cannot connect: ${code}`, noHost: true };
      reason = code ?? error.name ?? String(error);
    }
  }
  return { status: null, reason };
}

async function checkWebLinks(files) {
  const links = webLinks(files);
  const urls = [...links.keys()].sort();
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
  for (const url of urls) {
    const { status, reason, noHost } = results.get(url);
    if (status !== null && status < 400) continue;
    const isBroken = status === 404 || status === 410 || noHost;
    if (isBroken) broken += 1;
    const linkedFrom = [...links.get(url)];
    report(
      isBroken ? 'error' : 'warning',
      `${url} ${isBroken ? 'is broken' : 'could not be checked'} (${status ?? reason}), linked from ${linkedFrom.join(', ')}`,
      linkedFrom[0],
    );
  }
  return { checked: urls.length, broken };
}

const targets = process.argv.slice(2);
const missing = targets.filter((target) => !fs.existsSync(target));
if (targets.length === 0 || missing.length > 0) {
  console.error(
    missing.length
      ? `${missing.join(', ')} does not exist`
      : 'Name the Markdown files or folders to check.',
  );
  process.exit(2);
}
const files = markdownFiles(targets);
if (files.length === 0) {
  console.error('Found no Markdown files.');
  process.exit(2);
}

const { checked, broken } = await checkWebLinks(files);
const summary = `Checked ${checked} web links in ${files.length} Markdown files: ${broken} broken.`;
console.log(summary);
for (const message of warnings) console.log(`warning: ${message}`);
for (const message of errors) console.log(`error: ${message}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Links\n\n${summary}\n`);
}
process.exit(errors.length > 0 ? 1 : 0);
