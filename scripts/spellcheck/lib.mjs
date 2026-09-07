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

// -------------------------------------------- Norwegian string classifier ---

/**
 * Signals that a text is Norwegian: a Nordic letter, or a function word that
 * does not occur in English prose. The list lives here rather than in the
 * engine config so it is unit-tested by the self-test, and its work is
 * visible: the code check counts how many of these words decide
 * classifications on every run. The count is telemetry, not a gate — an
 * unused signal word masks nothing, so pruning is a deliberate maintenance
 * act, never something a stale finding forces onto an unrelated PR.
 *
 * A dictionary-based classifier (Ordbank forms minus the en_GB word list)
 * is deliberately NOT used: the two languages share too much orthography,
 * so it over-classifies English and technical strings ('dialog', 'header'
 * and short infrastructure names all read as Norwegian-only words) — and
 * over-classification silently hides English typos. This list errs the
 * other way: a missed Norwegian string produces visible findings, never
 * silent acceptance.
 */
export const NORWEGIAN_SIGNAL_WORDS = new Set([
  'ikke',
  'som',
  'og',
  'til',
  'av',
  'med',
  'kan',
  'skal',
  'du',
  'deg',
  'din',
  'ditt',
  'dine',
  'har',
  'eller',
  'dette',
  'denne',
  'alle',
  'ingen',
  'hvis',
  'noen',
  'skjema',
  'tekst',
  'modell',
  'adresse',
  'periode',
  'respons',
  'signatur',
  'parallell',
  'designet',
  'aktive',
  'sist',
  'appen',
  'selv',
  'ned',
  'noe',
  'lik',
]);

/**
 * True when the text reads as Norwegian; matched signal words are added to
 * `usedSignals` so the caller can prove which list entries do real work.
 */
export function isNorwegianText(text, usedSignals) {
  const nordic = /[æøåÆØÅ]/.test(text);
  // A long unbroken run means data (base64, JWKs, tokens), not prose — and
  // data trivially contains two-letter "words" like og/av between digits.
  // Norwegian prose without a single Nordic letter AND with such a run does
  // not happen; a blob must never count as Norwegian.
  if (!nordic && /[A-Za-z0-9+/=_-]{30,}/.test(text)) return false;
  let matched = false;
  for (const word of text.toLowerCase().split(/[^a-zæøå]+/)) {
    if (NORWEGIAN_SIGNAL_WORDS.has(word)) {
      matched = true;
      usedSignals?.add(word);
    }
  }
  return nordic || matched;
}

/**
 * The string-literal spans of one source line, as byte ranges into `buf`
 * (typos reports byte offsets — see surroundingIdentifier). A span opens at
 * a quote (', ", or `), a backslash escapes exactly one character, and the
 * span closes only at the SAME quote, so two different strings on one line
 * can never be bridged into one span. An unterminated quote (an apostrophe
 * in prose) opens no span. Multi-line literals are the deliberate,
 * documented gap: everything here is scoped to one line, because a span
 * that crosses lines can swallow code between two strings.
 */
export function stringSpans(buf) {
  const spans = [];
  const isQuote = (b) => b === 0x22 || b === 0x27 || b === 0x60;
  let i = 0;
  while (i < buf.length) {
    if (!isQuote(buf[i])) {
      i += 1;
      continue;
    }
    const quote = buf[i];
    let j = i + 1;
    while (j < buf.length && buf[j] !== quote) j += buf[j] === 0x5c ? 2 : 1;
    if (j >= buf.length) {
      i += 1; // unterminated — plain text, not a string
      continue;
    }
    spans.push({ start: i + 1, end: j });
    i = j + 1;
  }
  return spans;
}

/**
 * Splits typos findings into three piles by CONTEXT, before any policy is
 * applied:
 *
 *   norwegian  inside a string literal that reads as Norwegian — a string
 *              containing Norwegian IS Norwegian, not misspelled English. A
 *              Norwegian word in an identifier, in markup text or in prose
 *              is NOT classified and stays a finding. The deliberate cost:
 *              an English typo inside a string that also reads as Norwegian
 *              is missed.
 *   data       inside a contiguous run of 30+ base64ish characters (JWKs,
 *              tokens, hashes) — data is not words, wherever it occurs.
 *   pattern    the tail of a word whose first letter(s) sit in a bracket
 *              expression — `*.[Pp]ublish.xml` — where typos sees the word
 *              without its first letter. A character class is glob/regex
 *              syntax, not spelling.
 *   kept       everything else; a finding.
 *
 * Every classified pile is counted so its work is visible on every run,
 * and `usedSignals` names the signal words that matched — the caller's
 * evidence for stale-checking NORWEGIAN_SIGNAL_WORDS.
 */
export function classifyFindings(findings, readLine) {
  const kept = [];
  const usedSignals = new Set();
  let norwegian = 0;
  let data = 0;
  let pattern = 0;
  for (const f of findings) {
    const cls = classify(f, readLine, usedSignals);
    if (cls === 'norwegian') norwegian += 1;
    else if (cls === 'data') data += 1;
    else if (cls === 'pattern') pattern += 1;
    else kept.push(f);
  }
  return { kept, norwegian, data, pattern, usedSignals };
}

// A bracket expression directly before the token: `[Pp]` in `*.[Pp]ublish.xml`.
const BRACKET_CLASS_BEFORE = /\[[A-Za-z]{2,}\]$/;

function classify(f, readLine, usedSignals) {
  if (f.line_num === undefined) return 'finding'; // a file-name finding
  const line = readLine(f.path.replace(/^\.\//, ''), f.line_num);
  if (line === undefined) return 'finding';
  const buf = Buffer.from(line, 'utf8');
  const tok = Buffer.from(f.typo, 'utf8');
  if (!buf.subarray(f.byte_offset, f.byte_offset + tok.length).equals(tok)) return 'finding';

  // The bytes before the token are ASCII when they form a bracket class, so
  // a byte-space slice is safe here.
  if (BRACKET_CLASS_BEFORE.test(buf.subarray(0, f.byte_offset).toString('latin1'))) {
    return 'pattern';
  }

  // The contiguous data-shaped run around the token. No natural word — in
  // either language — reaches 30 characters unbroken by spaces or
  // punctuation outside this set.
  const isData = (b) =>
    (b >= 0x30 && b <= 0x39) ||
    (b >= 0x41 && b <= 0x5a) ||
    (b >= 0x61 && b <= 0x7a) ||
    b === 0x2b || // +
    b === 0x2f || // /
    b === 0x3d || // =
    b === 0x5f || // _
    b === 0x2d; // -
  let s = f.byte_offset;
  let e = f.byte_offset + tok.length;
  while (s > 0 && isData(buf[s - 1])) s -= 1;
  while (e < buf.length && isData(buf[e])) e += 1;
  if (e - s >= 30) return 'data';

  const span = stringSpans(buf).find(
    (sp) => f.byte_offset >= sp.start && f.byte_offset + tok.length <= sp.end,
  );
  if (span && isNorwegianText(buf.subarray(span.start, span.end).toString('utf8'), usedSignals)) {
    return 'norwegian';
  }
  return 'finding';
}

// ------------------------------------------------------- glob matching ---

/**
 * Converts the registry's limited glob dialect to a RegExp: `**`, `*`, and
 * `[…]` character classes (typos.toml uses `[Tt]est[Dd]ata`).
 */
export function globToRegExp(glob) {
  const pattern = glob
    .split(/(\*\*\/|\*\*|\*|\[[A-Za-z0-9_-]+\])/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      if (/^\[[A-Za-z0-9_-]+\]$/.test(part)) return part;
      return part.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${pattern}$`);
}

/**
 * The extend-exclude globs of a typos config. A deliberately minimal parser
 * — the file is ours and hand-formatted; comments are stripped before the
 * strings are read so a quoted word in prose cannot become a phantom rule.
 * Zero globs means the parse broke, never a clean config.
 */
export function typosTomlExcludes(configPath) {
  const m = /^extend-exclude\s*=\s*\[([\s\S]*?)^\]/m.exec(readFileSync(configPath, 'utf8'));
  if (!m) throw new HarnessError(`${configPath}: no extend-exclude block found`);
  const globs = [...m[1].replace(/#[^\n]*/g, '').matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  if (globs.length === 0) {
    throw new HarnessError(`${configPath}: extend-exclude parsed to zero globs`);
  }
  return globs;
}

/**
 * Engine-config rot detection: every extend-exclude glob must match at least
 * one tracked file, or be declared precautionary (with a reason) in
 * registry.mjs. Tracked files are a proxy for what typos walks — a glob for
 * gitignored build output matches nothing tracked yet still does real work
 * in an unclean working tree, which is exactly what a precautionary
 * declaration records. Declarations rot-check in both directions: one whose
 * glob is live is unnecessary, one whose glob left typos.toml is stale.
 */
export function excludeLiveness(globs, declarations, tracked) {
  const problems = [];
  const declared = new Map();
  for (const d of declarations) {
    if (!d.reason) throw new HarnessError(`precautionary exclude '${d.glob}' has no reason`);
    declared.set(d.glob, d);
  }
  for (const glob of globs) {
    // A slashless glob matches basenames at any depth (gitignore-style).
    const re = globToRegExp(glob.includes('/') ? glob : `**/${glob}`);
    const alive = tracked.some((p) => re.test(p));
    if (declared.has(glob)) {
      declared.delete(glob);
      if (alive) {
        problems.push(
          `'${glob}' is declared precautionary but matches tracked files — drop the declaration`,
        );
      }
    } else if (!alive) {
      problems.push(
        `extend-exclude '${glob}' matches no tracked file — dead rule; remove it or declare it precautionary in registry.mjs`,
      );
    }
  }
  for (const d of declared.values()) {
    problems.push(
      `precautionary declaration for '${d.glob}' matches no rule in typos.toml — stale, remove it`,
    );
  }
  return problems;
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
 * Parses the suppression registry's text format: '#' comment and blank
 * lines are free; a section is one or more @directive lines followed by one
 * token per line, each token becoming an entry with the section's scope. A
 * directive after a token line starts a NEW section — nothing is inherited,
 * every section states its own scope. Reasons are ordinary comments, next
 * to the section or the token they explain. Directives:
 *
 *   @paths <glob> <glob> …     allowed anywhere in matching files
 *   @identifiers <Name> …      allowed only as/inside these exact
 *                              identifiers (narrow with @paths if needed)
 *   @identifier-part           allowed inside any LONGER identifier within
 *                              @paths; the bare word stays enforced
 *
 * Scope completeness (exactly one style) is enforced by compileSuppressions
 * on the parsed entries.
 */
export function parseSuppressions(text, name) {
  const entries = [];
  let section = null;
  let sealed = true; // no open section yet
  text.split('\n').forEach((raw, i) => {
    const where = `${name}:${i + 1}`;
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    if (line.startsWith('@')) {
      if (sealed) {
        section = {};
        sealed = false;
      }
      const [directive, ...args] = line.split(/\s+/);
      if (directive === '@paths') {
        if (args.length === 0) throw new HarnessError(`${where}: @paths needs globs`);
        section.paths = args;
      } else if (directive === '@identifiers') {
        if (args.length === 0) throw new HarnessError(`${where}: @identifiers needs names`);
        section.identifiers = args;
      } else if (directive === '@identifier-part') {
        section.identifierPart = true;
      } else {
        throw new HarnessError(`${where}: unknown directive '${directive}'`);
      }
      return;
    }
    const token = line.replace(/#.*/, '').trim();
    if (/\s/.test(token)) throw new HarnessError(`${where}: a token is a single word`);
    if (section === null) throw new HarnessError(`${where}: token before any @directives`);
    sealed = true;
    entries.push({ token, ...section });
  });
  if (!sealed) throw new HarnessError(`${name}: trailing @directives with no tokens`);
  if (entries.length === 0) throw new HarnessError(`${name}: no suppressions parsed`);
  return entries;
}

/** Reads and parses the suppression registry file. */
export function readSuppressions(path) {
  if (!existsSync(path)) throw new HarnessError(`suppression registry ${path} is missing`);
  return parseSuppressions(readFileSync(path, 'utf8'), path);
}

/**
 * Validates suppression entries and compiles their globs. Each entry must
 * carry a token plus exactly one scope style:
 * `identifiers` (optionally narrowed by paths), `identifierPart` (requires
 * paths), or bare `paths`.
 */
export function compileSuppressions(entries) {
  return entries.map((e, i) => {
    const where = `suppression #${i} ('${e.token ?? '?'}')`;
    if (!e.token) {
      throw new HarnessError(`${where} needs a token`);
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

// -------------------------------------------------------- key declarations ---

/**
 * Parses the per-key declaration registry (keys.txt): facts about specific
 * translation entries that the checks cannot infer. Same text grammar as
 * suppressions.txt — '#' comment and blank lines are free; a section is one
 * or more @directive lines followed by one key per line; a directive after a
 * key starts a NEW section, nothing is inherited. Directives:
 *
 *   @files <glob> <glob> …   which language files the keys live in (required)
 *   @empty                   the value may be deliberately empty
 *   @key-contract            the KEY's spelling is a code contract the en
 *                            check must accept; the value stays checked
 *   @language <nb|nn>        the VALUE is deliberately in this language —
 *                            it is checked with that language's dictionary
 *                            instead of the file's own
 *
 * Unlike suppressions.txt, a file with no entries is legal: the harness
 * ships the format before any product entry needs it, and zero declarations
 * only makes the checks stricter, never blinder.
 */
export function parseKeyDeclarations(text, name) {
  const entries = [];
  let section = null;
  let sealed = true; // no open section yet
  text.split('\n').forEach((raw, i) => {
    const where = `${name}:${i + 1}`;
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    if (line.startsWith('@')) {
      if (sealed) {
        section = {};
        sealed = false;
      }
      const [directive, ...args] = line.split(/\s+/);
      if (directive === '@files') {
        if (args.length === 0) throw new HarnessError(`${where}: @files needs globs`);
        section.files = args;
      } else if (directive === '@empty') {
        section.kind = assignKind(section, 'empty', where);
      } else if (directive === '@key-contract') {
        section.kind = assignKind(section, 'key-contract', where);
      } else if (directive === '@language') {
        if (args.length !== 1 || !['nb', 'nn'].includes(args[0])) {
          throw new HarnessError(`${where}: @language needs exactly one of: nb, nn`);
        }
        section.kind = assignKind(section, 'language', where);
        section.lang = args[0];
      } else {
        throw new HarnessError(`${where}: unknown directive '${directive}'`);
      }
      return;
    }
    const key = line.replace(/\s+#.*/, '').trim();
    if (/\s/.test(key)) throw new HarnessError(`${where}: a key is a single token`);
    if (section === null) throw new HarnessError(`${where}: key before any @directives`);
    sealed = true;
    entries.push({ key, ...section });
  });
  if (!sealed) throw new HarnessError(`${name}: trailing @directives with no keys`);
  return entries;
}

function assignKind(section, kind, where) {
  if (section.kind !== undefined) {
    throw new HarnessError(`${where}: a section declares exactly one of @empty/@key-contract/@language`);
  }
  return kind;
}

/** Reads and parses the key-declaration registry file. */
export function readKeyDeclarations(path) {
  if (!existsSync(path)) throw new HarnessError(`key-declaration registry ${path} is missing`);
  return parseKeyDeclarations(readFileSync(path, 'utf8'), path);
}

/**
 * Validates key-declaration entries and compiles their globs. Each entry
 * must carry a key, exactly one declaration kind, and a @files scope.
 */
export function compileKeyDeclarations(entries) {
  return entries.map((e, i) => {
    const where = `key declaration #${i} ('${e.key ?? '?'}')`;
    if (!e.key) throw new HarnessError(`${where} needs a key`);
    if (!e.kind) throw new HarnessError(`${where} declares no kind (@empty/@key-contract/@language)`);
    if (!e.files) throw new HarnessError(`${where} declares no @files scope`);
    return { ...e, res: e.files.map(globToRegExp), hits: 0 };
  });
}

/**
 * The declaration of `kind` covering `key` in `file`, or undefined. Does NOT
 * count a hit — the caller decides what counts as the entry doing work (a
 * matched @language entry that does not actually re-route, for example,
 * rescued nothing and must read as stale).
 */
export function findKeyDeclaration(compiled, kind, file, key) {
  return compiled.find((e) => e.kind === kind && e.key === key && e.res.some((r) => r.test(file)));
}

/** Entries of `kind` that did no work, for stale reporting on full runs. */
export function staleKeyDeclarations(compiled, kind) {
  return compiled.filter((e) => e.kind === kind && e.hits === 0);
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
 * ASCII, which keeps the expansion exact even on lines with non-ASCII text
 * (a UTF-16 string index would drift past the first Nordic letter). A
 * file-name finding has no line; its identifier is the basename stem.
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
