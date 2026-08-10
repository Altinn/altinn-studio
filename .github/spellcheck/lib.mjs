/**
 * Shared machinery for the spell-check runner: reading registry groups,
 * extracting checkable text from values, matching scan globs, fetching the
 * pinned hunspell dictionaries, and invoking the external tools with their
 * exit status inspected rather than assumed.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { DICTIONARY_FILES, rawUrl } from './dictionaries.mjs';

export const REPO_ROOT = resolve(import.meta.dirname, '../..');
const CACHE_DIR = join(import.meta.dirname, '.cache/dictionaries');

/** A harness defect or environment problem — never a spelling finding. */
export class HarnessError extends Error {}

// ------------------------------------------------------------- registry ---

/**
 * Reads one registry group into { lang: Map<key, value> }. Formats that are
 * modules are imported natively (Node strips TS types since 22.6), so the
 * values compared are the values the product ships — there is no parallel
 * parser to fall back out of sync.
 */
export async function readGroup(group, root = REPO_ROOT) {
  const abs = (p) => join(root, p);
  switch (group.format) {
    case 'ts-factory': {
      const out = {};
      for (const [lang, path] of Object.entries(group.files)) {
        const mod = await import(pathToFileURL(abs(path)));
        const factory = mod[lang];
        if (typeof factory !== 'function') {
          throw new HarnessError(`${path}: expected an exported function ${lang}()`);
        }
        out[lang] = toStringMap(path, factory());
      }
      return out;
    }
    case 'json-flat': {
      const out = {};
      for (const [lang, path] of Object.entries(group.files)) {
        out[lang] = toStringMap(path, JSON.parse(readFileSync(abs(path), 'utf8')));
      }
      return out;
    }
    case 'esm-export': {
      const mod = await import(pathToFileURL(abs(group.file)));
      const triplet = mod[group.exportName];
      if (typeof triplet !== 'object' || triplet === null) {
        throw new HarnessError(`${group.file}: expected exported object ${group.exportName}`);
      }
      const out = {};
      for (const [lang, value] of Object.entries(triplet)) {
        out[lang] = new Map([[group.exportName, String(value)]]);
      }
      return out;
    }
    case 'json-paths': {
      const doc = JSON.parse(readFileSync(abs(group.file), 'utf8'));
      const out = {};
      for (const { path, langs } of group.paths) {
        const node = path.split('.').reduce((o, seg) => o?.[seg], doc);
        for (const lang of langs) {
          if (typeof node?.[lang] !== 'string') {
            throw new HarnessError(`${group.file}: expected a string at ${path}.${lang}`);
          }
          (out[lang] ??= new Map()).set(path, node[lang]);
        }
      }
      return out;
    }
    case 'news': {
      const out = {};
      for (const [lang, path] of Object.entries(group.files)) {
        const doc = JSON.parse(readFileSync(abs(path), 'utf8'));
        if (!Array.isArray(doc.news)) throw new HarnessError(`${path}: expected a "news" array`);
        out[lang] = new Map(
          doc.news.flatMap((item, i) => [
            [`news[${i}].title`, String(item.title ?? '')],
            [`news[${i}].content`, String(item.content ?? '')],
          ]),
        );
      }
      return out;
    }
    case 'text-resource': {
      const out = {};
      for (const [lang, path] of Object.entries(group.files)) {
        const doc = JSON.parse(readFileSync(abs(path), 'utf8'));
        if (!Array.isArray(doc.resources)) {
          throw new HarnessError(`${path}: expected a "resources" array`);
        }
        out[lang] = new Map(doc.resources.map((r) => [String(r.id), String(r.value ?? '')]));
      }
      return out;
    }
    default:
      throw new HarnessError(`${group.name}: unknown format '${group.format}'`);
  }
}

function toStringMap(path, obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new HarnessError(`${path}: expected a flat object of key → text`);
  }
  const map = new Map();
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'string') {
      throw new HarnessError(`${path}: value of '${key}' is not a string`);
    }
    map.set(key, value);
  }
  return map;
}

/** The repo-relative path a (group, lang) pair's text lives in. */
export const sourcePath = (group, lang) => group.file ?? group.files[lang];

// ----------------------------------------------------------- extraction ---

/**
 * Every interpolation style in use: i18next {{name}} (and the odd {{0}}),
 * positional {0}, and Gitea's Go-fmt %s/%d/%v/%[1]s.
 */
export const PARAM_RE = /\{\{[\w.]+\}\}|\{\d+\}|%(?:\[\d+\])?[sdv]/g;

export const paramsOf = (text) => (text.match(PARAM_RE) ?? []).sort().join(',');

/**
 * Reduces a UI text value to the words a spell checker should see: no
 * placeholders, no markup, no URLs. Length is not preserved — findings are
 * mapped back by key, never by offset.
 */
export function stripNonProse(value) {
  return value
    .replace(/<[^<>]{1,200}>/g, ' ') // HTML tags, e.g. <br/>, <strong>
    .replace(PARAM_RE, ' ')
    .replace(/\]\((?:[^()\s]{1,300})\)/g, '] ') // markdown link targets
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ') // email addresses
    .replace(/&[a-z]+;/g, ' ') // HTML entities
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------- glob matching ---

/** Converts the registry's limited glob dialect (** and *) to a RegExp. */
export function globToRegExp(glob) {
  const pattern = glob
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      return part.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${pattern}$`);
}

export function trackedFiles(root = REPO_ROOT) {
  const res = spawnSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) throw new HarnessError(`git ls-files failed: ${res.stderr}`);
  const files = res.stdout.split('\0').filter(Boolean);
  if (files.length === 0) throw new HarnessError('git ls-files returned no files');
  return files;
}

// ------------------------------------------------------------ tool runs ---

export function toolAvailable(name) {
  return spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0;
}

/**
 * Runs `typos` and returns its findings, treating the exit status as
 * meaningful: 0 is clean, 2 is "typos found", anything else is a broken
 * config or invocation and fails the harness rather than passing it.
 */
export function runTypos(args, { cwd = REPO_ROOT } = {}) {
  const res = spawnSync('typos', ['--format', 'json', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) {
    throw new HarnessError(
      `could not run typos: ${res.error.message}. Install it with \`brew install typos-cli\`.`,
    );
  }
  const findings = res.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((f) => f.type === 'typo');
  if (res.status !== 0 && res.status !== 2) {
    throw new HarnessError(`typos exited ${res.status}: ${res.stderr.trim() || '(no stderr)'}`);
  }
  if (res.status === 2 && findings.length === 0) {
    throw new HarnessError(`typos reported failure but emitted no findings: ${res.stderr.trim()}`);
  }
  return findings;
}

/** The files a typos config would check — the work-count side of the check. */
export function typosFileList(args, { cwd = REPO_ROOT } = {}) {
  const res = spawnSync('typos', ['--files', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new HarnessError(`typos --files exited ${res.status}: ${res.stderr.trim()}`);
  }
  return res.stdout.split('\n').filter(Boolean);
}

/** Feeds text to `hunspell -l` and returns the distinct words it rejects. */
export function runHunspell(text, dictBases) {
  const res = spawnSync('hunspell', ['-l', '-i', 'UTF-8', '-d', dictBases.join(',')], {
    input: text,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error || res.status !== 0) {
    throw new HarnessError(
      `hunspell failed (${res.error?.message ?? `exit ${res.status}`}): ${res.stderr?.trim() ?? ''}`,
    );
  }
  return new Set(res.stdout.split('\n').filter(Boolean));
}

// ---------------------------------------------------------- dictionaries ---

/**
 * Ensures the pinned dictionaries are in the local cache, fetching and
 * SHA-256-verifying any that are missing. Returns the cache directory.
 * See dictionaries.mjs for why these are fetched rather than vendored.
 */
export async function ensureDictionaries() {
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const [name, { sha256 }] of Object.entries(DICTIONARY_FILES)) {
    const target = join(CACHE_DIR, name);
    if (existsSync(target) && sha256Of(readFileSync(target)) === sha256) continue;
    const url = rawUrl(name);
    const res = await fetch(url);
    if (!res.ok) throw new HarnessError(`fetching ${url} failed: HTTP ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    const actual = sha256Of(body);
    if (actual !== sha256) {
      throw new HarnessError(
        `${name} from ${url} has SHA-256 ${actual}, expected ${sha256} — refusing to use it`,
      );
    }
    writeFileSync(`${target}.tmp`, body);
    renameSync(`${target}.tmp`, target);
  }
  return CACHE_DIR;
}

const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');

// -------------------------------------------------------------- glossary ---

/** Reads a glossary: one term per line, # comments, case-insensitive match. */
export function readGlossary(path) {
  if (!existsSync(path)) throw new HarnessError(`glossary ${path} is missing`);
  const terms = new Set();
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (line === '') continue;
    if (/\s/.test(line)) throw new HarnessError(`${path}: '${line}' is not a single word`);
    terms.add(line.toLowerCase());
  }
  return terms;
}
