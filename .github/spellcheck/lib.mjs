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

import { DICTIONARY_FILES, ORDBANK_FILES, ordbankUrl, rawUrl } from './dictionaries.mjs';

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
export async function ensureDictionaries({ offline = false } = {}) {
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const [name, { sha256 }] of Object.entries(DICTIONARY_FILES)) {
    const target = join(CACHE_DIR, name);
    if (existsSync(target) && sha256Of(readFileSync(target)) === sha256) continue;
    if (offline) {
      throw new HarnessError(`${name} is not cached — run \`yarn spell:check\` once to fetch it`);
    }
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

/**
 * Ensures the Norsk Ordbank full-form word set for a language is cached and
 * returns it. The pinned tarball is fetched and SHA-256-verified, the
 * full-form table (ISO-8859-1, tab-separated, OPPSLAG in column 3) is
 * extracted once, and the processed word list is kept next to the
 * dictionaries. See dictionaries.mjs for why this supplements hunspell.
 */
export async function ensureOrdbank(lang, { offline = false } = {}) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const { path, sha256, fullformFile } = ORDBANK_FILES[lang];
  const processed = join(CACHE_DIR, `fullforms.${lang}.txt`);
  const tarball = join(CACHE_DIR, path);

  if (!existsSync(processed)) {
    if (!existsSync(tarball) || sha256Of(readFileSync(tarball)) !== sha256) {
      if (offline) {
        throw new HarnessError(`${path} is not cached — run \`yarn spell:check\` once to fetch it`);
      }
      const url = ordbankUrl(lang);
      const res = await fetch(url);
      if (!res.ok) throw new HarnessError(`fetching ${url} failed: HTTP ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      const actual = sha256Of(body);
      if (actual !== sha256) {
        throw new HarnessError(
          `${path} from ${url} has SHA-256 ${actual}, expected ${sha256} — refusing to use it`,
        );
      }
      writeFileSync(`${tarball}.tmp`, body);
      renameSync(`${tarball}.tmp`, tarball);
    }
    const tar = spawnSync('tar', ['-xzf', tarball, '-C', CACHE_DIR, fullformFile]);
    if (tar.status !== 0) {
      throw new HarnessError(`extracting ${path} failed: ${tar.stderr?.toString().trim()}`);
    }
    const rows = readFileSync(join(CACHE_DIR, fullformFile), 'latin1').split('\n');
    const forms = new Set();
    for (const row of rows.slice(1)) {
      const form = row.split('\t')[2];
      if (form) forms.add(form);
    }
    if (forms.size < 100_000) {
      throw new HarnessError(
        `${fullformFile} parsed to only ${forms.size} forms — format changed?`,
      );
    }
    writeFileSync(`${processed}.tmp`, [...forms].join('\n'));
    renameSync(`${processed}.tmp`, processed);
  }

  const forms = new Set(readFileSync(processed, 'utf8').split('\n').filter(Boolean));
  if (forms.size < 100_000) {
    throw new HarnessError(`${processed} holds only ${forms.size} forms — delete it and re-run`);
  }
  return forms;
}

// ------------------------------------------------------------ suppressions ---

/**
 * Validates suppression entries and compiles their globs. Each entry must
 * carry token, kind and reason, plus exactly one scope style:
 * `identifiers` (optionally narrowed by paths), `identifierPart` (requires
 * paths), or bare `paths`.
 */
export function compileSuppressions(entries) {
  return entries.map((e, i) => {
    const where = `suppression #${i} ('${e.token ?? '?'}')`;
    if (!e.token || !e.kind || !e.reason) {
      throw new HarnessError(`${where} needs token, kind and reason`);
    }
    if (e.identifiers && e.identifierPart) {
      throw new HarnessError(`${where} cannot combine identifiers and identifierPart`);
    }
    if (e.identifierPart && !e.paths) {
      throw new HarnessError(`${where} uses identifierPart and must declare paths`);
    }
    if (!e.identifiers && !e.identifierPart && !e.paths) {
      throw new HarnessError(`${where} declares no scope at all`);
    }
    return { ...e, res: (e.paths ?? ['**']).map(globToRegExp), hits: 0 };
  });
}

/**
 * Splits typos findings into kept and suppressed, and reports which entries
 * did no work. A suppression only ever narrows: a token outside its declared
 * scope, or inside an identifier it does not name, stays a finding.
 * `readLine(path, lineNum)` supplies source lines for identifier scoping.
 */
export function partitionFindings(findings, compiled, readLine, { staleCheck = true } = {}) {
  const kept = [];
  for (const f of findings) {
    const path = f.path.replace(/^\.\//, '');
    const entry = compiled.find(
      (e) =>
        e.token === f.typo && e.res.some((r) => r.test(path)) && scopeMatches(e, f, path, readLine),
    );
    if (entry) entry.hits += 1;
    else kept.push(f);
  }
  const stale = staleCheck ? compiled.filter((e) => e.hits === 0) : [];
  return { kept, suppressedCount: findings.length - kept.length, stale };
}

function scopeMatches(entry, f, path, readLine) {
  if (!entry.identifiers && !entry.identifierPart) return true;
  const ident = surroundingIdentifier(f, path, readLine);
  if (ident === undefined) return false; // can't prove scope — keep the finding
  if (entry.identifiers) return entry.identifiers.includes(ident);
  return ident.length > f.typo.length;
}

/**
 * The identifier around a finding. typos reports a BYTE offset into the
 * line, so the expansion works in byte space — identifier characters are
 * ASCII, which makes the expansion exact even on lines with non-ASCII text
 * (the previous harness's UTF-16-index bug class). A file-name finding has
 * no line; its identifier is the basename stem.
 */
function surroundingIdentifier(f, path, readLine) {
  if (f.line_num === undefined) {
    return (path.split('/').pop() ?? '').split('.')[0];
  }
  const line = readLine(path, f.line_num);
  if (line === undefined) return undefined;
  const buf = Buffer.from(line, 'utf8');
  const tok = Buffer.from(f.typo, 'utf8');
  const off = f.byte_offset;
  if (!buf.subarray(off, off + tok.length).equals(tok)) return undefined;
  const isIdent = (b) =>
    (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || b === 0x5f;
  let s = off;
  let e = off + tok.length;
  while (s > 0 && isIdent(buf[s - 1])) s -= 1;
  while (e < buf.length && isIdent(buf[e])) e += 1;
  return buf.subarray(s, e).toString('utf8');
}

/** A cached line reader over real files, for partitionFindings. */
export function fileLineReader(root) {
  const cache = new Map();
  return (path, lineNum) => {
    if (!cache.has(path)) {
      try {
        cache.set(path, readFileSync(join(root, path), 'utf8').split('\n'));
      } catch {
        cache.set(path, null);
      }
    }
    return cache.get(path)?.[lineNum - 1];
  };
}

// -------------------------------------------------------- fix application ---

const sourceCache = new Map();

export function sourceOf(root, file) {
  const abs = join(root, file);
  if (!sourceCache.has(abs)) sourceCache.set(abs, readFileSync(abs, 'utf8'));
  return sourceCache.get(abs);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Line-anchored `'key':` / `"key":` occurrences. Anchoring to the start of a
 * line is what keeps a value that merely MENTIONS a key (e.g. documentation
 * text quoting another entry) from being mistaken for the entry itself.
 */
const keyMatches = (src, key) => [
  ...src.matchAll(new RegExp(`^[ \\t]*(['"])${escapeRe(key)}\\1[ \\t]*:`, 'gm')),
];

/** The 1-based line a key is defined on, for annotations. Best effort. */
export function findKeyLine(root, file, key) {
  const src = sourceOf(root, file);
  let idx = keyMatches(src, key)[0]?.index;
  if (idx === undefined && /^[A-Za-z_$][\w$]*$/.test(key)) {
    // esm-export keys are identifiers, not quoted properties.
    idx = src.search(new RegExp(`\\b${escapeRe(key)}\\b`));
  }
  if (idx === undefined || idx === -1) return undefined;
  return src.slice(0, idx).split('\n').length;
}

/**
 * Applies one correction inside the VALUE of `key`, locating it through the
 * real file's syntax — never through byte offsets into a masked copy.
 * Declines (returns false) whenever the edit would be ambiguous: key absent
 * or defined twice, value not a simple quoted literal on one line, or the
 * typo not occurring exactly once in the value.
 */
export function applyValueFix(root, file, key, typo, correction) {
  const abs = join(root, file);
  const src = readFileSync(abs, 'utf8');
  const matches = keyMatches(src, key);
  if (matches.length !== 1) return false;

  const afterKey = matches[0].index + matches[0][0].length;
  const q = /^\s*(['"])/.exec(src.slice(afterKey, afterKey + 40));
  if (!q) return false;
  const valueStart = afterKey + q[0].length;
  const quote = q[1];

  // Scan to the closing quote. `\` always escapes exactly one character, so
  // skipping two keeps backslash parity right (`\\"` really closes); a raw
  // newline means this is not the single-line literal we expect.
  let end = valueStart;
  while (end < src.length && src[end] !== '\n' && src[end] !== quote) {
    end += src[end] === '\\' ? 2 : 1;
  }
  if (src[end] !== quote) return false;

  const value = src.slice(valueStart, end);
  if (value.split(typo).length - 1 !== 1) return false;
  const cased =
    typo[0] === typo[0].toUpperCase()
      ? correction[0].toUpperCase() + correction.slice(1)
      : correction;
  writeFileSync(abs, src.slice(0, valueStart) + value.replace(typo, cased) + src.slice(end));
  sourceCache.delete(abs);
  return true;
}

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
