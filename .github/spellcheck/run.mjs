#!/usr/bin/env node
/**
 * The spell-check runner. Five independent checks over three languages, one
 * registry (registry.mjs) saying which file is which, and one invariant:
 *
 *     no check may pass without proving it ran.
 *
 * Concretely: every check counts the work it did and fails on zero; tool
 * exit statuses are inspected, never assumed; checks never hide each other
 * (each runs to completion and the exit code is aggregated at the end); and
 * the committed self-test (selftest/) plants one of every defect class and
 * asserts the production configuration flags each one — and nothing else.
 *
 * Checks:
 *   code       en-US over code, comments and docs (typos, typos.toml)
 *   structure  every language defines the same keys, interpolates the same
 *              parameters, and has no empty values
 *   coverage   every language-file-shaped path in the repo is registered or
 *              explicitly out of scope, and every registered file is
 *              excluded from the code pass (no drift between the registry
 *              and typos.toml)
 *   en         British English over English UI text values; US English over
 *              translation keys (typos over extracted copies — fixes are
 *              applied to the real files by key, never by byte offset)
 *   no         bokmål and nynorsk UI text values (hunspell, pinned
 *              LibreOffice dictionaries, glossary.*.txt)
 *
 * Usage:
 *   node .github/spellcheck/run.mjs [check ...]   default: self-test + all
 *   --fix   apply unambiguous en-US and en-GB corrections
 *   --ci    a skipped check fails the run (implied by $CI)
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DICTIONARY_FOR_LANG } from './dictionaries.mjs';
import {
  HarnessError,
  REPO_ROOT,
  ensureDictionaries,
  globToRegExp,
  paramsOf,
  readGlossary,
  readGroup,
  runHunspell,
  runTypos,
  sourcePath,
  stripNonProse,
  toolAvailable,
  trackedFiles,
  typosFileList,
} from './lib.mjs';
import * as realRegistry from './registry.mjs';

const HERE = import.meta.dirname;
const EN_GB_CONFIG = join(HERE, 'typos.values.en-gb.toml');
const EN_US_CONFIG = join(HERE, 'typos.values.en-us.toml');
const ROOT_CONFIG = join(REPO_ROOT, 'typos.toml');

// A check returns { findings, counts } and throws HarnessError when it could
// not do its job. `skip(reason)` marks a check that could not run at all.
const skip = (reason) => ({ skipped: reason, findings: [], counts: '' });
const finding = (file, key, message, line) => ({ file, key, message, line });

// ------------------------------------------------------------ code check ---

function checkCode({ fix }) {
  if (!toolAvailable('typos')) {
    throw new HarnessError('typos is not installed. `brew install typos-cli`');
  }
  const fileCount = typosFileList([]).length;
  if (fileCount < 500) {
    throw new HarnessError(
      `the code pass would only visit ${fileCount} files — typos.toml is broken, not the repo clean`,
    );
  }
  if (fix) runTypos(['--write-changes']);
  const findings = runTypos([]).map((f) =>
    finding(
      f.path,
      undefined,
      `\`${f.typo}\` should be \`${(f.corrections ?? []).join('` or `')}\``,
      f.line_num,
    ),
  );
  return { findings, counts: `${fileCount} files visited` };
}

// ------------------------------------------------------- structure check ---

async function checkStructure({ registry, root }) {
  const findings = [];
  let keyCount = 0;

  for (const group of registry.GROUPS) {
    const langs = await readGroup(group, root);
    const entryCounts = Object.values(langs).map((m) => m.size);
    keyCount += entryCounts.reduce((a, b) => a + b, 0);
    if (!group.mayBeEmpty && entryCounts.some((n) => n === 0)) {
      throw new HarnessError(`${group.name}: a language parsed to zero entries`);
    }

    if (group.parity === 'equal') {
      const union = new Set(Object.values(langs).flatMap((m) => [...m.keys()]));
      for (const [lang, entries] of Object.entries(langs)) {
        for (const key of [...union].filter((k) => !entries.has(k)).sort()) {
          findings.push(
            finding(
              sourcePath(group, lang),
              key,
              `missing key '${key}', which the other languages define`,
            ),
          );
        }
      }
    } else if (group.parity === 'en-subset-of-nb') {
      for (const key of [...langs.en.keys()].filter((k) => !langs.nb.has(k)).sort()) {
        findings.push(
          finding(
            sourcePath(group, 'nb'),
            key,
            `missing key '${key}', which ${sourcePath(group, 'en')} defines — the default-language user is shown the raw key`,
          ),
        );
      }
    }

    // Parameters and emptiness. The reference for parameter comparison is
    // the most complete language, so partial translations are still checked
    // for every key they do define.
    const [refLang] = Object.entries(langs).sort((a, b) => b[1].size - a[1].size)[0];
    for (const [lang, entries] of Object.entries(langs)) {
      for (const [key, text] of entries) {
        if (text.trim() === '') {
          findings.push(finding(sourcePath(group, lang), key, `'${key}' is empty`));
          continue;
        }
        if (lang === refLang) continue;
        const ref = langs[refLang].get(key);
        if (ref === undefined) continue;
        if (paramsOf(text) !== paramsOf(ref)) {
          findings.push(
            finding(
              sourcePath(group, lang),
              key,
              `'${key}' interpolates [${paramsOf(text) || 'nothing'}] but ${refLang} interpolates [${paramsOf(ref) || 'nothing'}]`,
            ),
          );
        }
      }
    }
  }

  if (keyCount === 0) throw new HarnessError('the registry parsed to zero keys');
  return { findings, counts: `${registry.GROUPS.length} groups, ${keyCount} entries compared` };
}

// -------------------------------------------------------- coverage check ---

function checkCoverage({ registry, root }) {
  const findings = [];
  const tracked = trackedFiles(root);
  const registered = new Set(
    registry.GROUPS.flatMap((g) => (g.file ? [g.file] : Object.values(g.files))),
  );

  for (const path of registered) {
    if (!tracked.includes(path)) {
      findings.push(finding(path, undefined, 'registered in registry.mjs but not tracked by git'));
    }
  }

  const patterns = registry.SCAN_PATTERNS.map(globToRegExp);
  const oos = registry.OUT_OF_SCOPE.map((entry) => {
    if (!entry.reason) throw new HarnessError(`out-of-scope '${entry.glob}' has no reason`);
    return { ...entry, re: globToRegExp(entry.glob), hits: 0 };
  });

  let matched = 0;
  for (const path of tracked) {
    if (!patterns.some((re) => re.test(path))) continue;
    matched += 1;
    if (registered.has(path)) continue;
    const exempt = oos.find((e) => e.re.test(path));
    if (exempt) {
      exempt.hits += 1;
      continue;
    }
    findings.push(
      finding(
        path,
        undefined,
        'looks like a language file but is neither registered in registry.mjs nor listed as out of scope',
      ),
    );
  }
  if (matched === 0) {
    throw new HarnessError('SCAN_PATTERNS matched nothing — the patterns have rotted');
  }
  for (const entry of oos.filter((e) => e.hits === 0)) {
    findings.push(finding(entry.glob, undefined, 'stale out-of-scope entry — it exempts nothing'));
  }

  // The registry names a file so the checks here own its text; the code pass
  // must therefore skip it. This assertion is what keeps registry.mjs and
  // typos.toml's excludes from drifting apart.
  const visited = typosFileList(['--force-exclude', ...registered], { cwd: root });
  for (const path of visited) {
    findings.push(
      finding(
        path,
        undefined,
        'registered in registry.mjs but not excluded by typos.toml — its values would be spell-checked as code',
      ),
    );
  }

  return {
    findings,
    counts: `${matched} matched paths, ${registered.size} registered, ${oos.length} out-of-scope rules`,
  };
}

// --------------------------------------------------------- english check ---

async function checkEnglish({ registry, root, fix }) {
  const batches = { 'en-gb': [], 'en-us': [] }; // items: { group, kind, key, text, sourceFile }
  let valueCount = 0;
  let keyCount = 0;

  for (const group of registry.GROUPS) {
    const langs = await readGroup(group, root);
    if (group.english) {
      for (const [key, text] of langs.en ?? []) {
        batches[group.english].push({
          group,
          kind: 'value',
          key,
          text: text.replace(/\s+/g, ' '),
          sourceFile: sourcePath(group, 'en'),
        });
        valueCount += 1;
      }
    }
    if (group.checkKeys !== false) {
      for (const [lang, entries] of Object.entries(langs)) {
        for (const key of entries.keys()) {
          batches['en-us'].push({
            group,
            kind: 'key',
            key,
            text: key,
            sourceFile: sourcePath(group, lang),
          });
          keyCount += 1;
        }
      }
    }
  }
  if (valueCount === 0) throw new HarnessError('no English values were extracted');
  if (keyCount === 0) throw new HarnessError('no translation keys were extracted');

  const findings = [];
  const tmp = mkdtempSync(join(tmpdir(), 'spellcheck-en-'));
  try {
    for (const [dialect, items] of Object.entries(batches)) {
      if (items.length === 0) continue;
      const derived = join(tmp, `${dialect}.txt`);
      writeFileSync(derived, items.map((i) => i.text).join('\n') + '\n');
      const config = dialect === 'en-gb' ? EN_GB_CONFIG : EN_US_CONFIG;
      for (const f of runTypos(['--config', config, derived])) {
        const item = items[f.line_num - 1];
        if (!item) throw new HarnessError(`typos reported line ${f.line_num} outside the extract`);
        findings.push({
          file: item.sourceFile,
          key: item.key,
          line: findKeyLine(root, item.sourceFile, item.key),
          message:
            `${item.kind} of '${item.key}': \`${f.typo}\` should be ` +
            `\`${(f.corrections ?? []).join('` or `')}\`` +
            (item.kind === 'key' ? ' (a key is a code contract — rename it in code too)' : ''),
          fixable: item.kind === 'value' && f.corrections?.length === 1,
          item,
          typo: f.typo,
          correction: f.corrections?.[0],
        });
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  if (fix) {
    let applied = 0;
    for (const f of findings.filter((f) => f.fixable)) {
      if (applyValueFix(root, f.item.sourceFile, f.item.key, f.typo, f.correction)) applied += 1;
    }
    if (applied > 0) console.log(`  applied ${applied} value fix(es) — re-run to verify`);
  }

  return { findings, counts: `${valueCount} values + ${keyCount} keys examined` };
}

const sourceCache = new Map();
function sourceOf(root, file) {
  const abs = join(root, file);
  if (!sourceCache.has(abs)) sourceCache.set(abs, readFileSync(abs, 'utf8'));
  return sourceCache.get(abs);
}

function findKeyLine(root, file, key) {
  const src = sourceOf(root, file);
  for (const probe of [`'${key}'`, `"${key}"`, key]) {
    const idx = src.indexOf(probe);
    if (idx !== -1) return src.slice(0, idx).split('\n').length;
  }
  return undefined;
}

/**
 * Applies one correction inside the VALUE of `key`, located through the real
 * file's syntax — never through byte offsets into a masked copy. Declines
 * (returns false) whenever the edit would be ambiguous.
 */
function applyValueFix(root, file, key, typo, correction) {
  const abs = join(root, file);
  const src = readFileSync(abs, 'utf8');
  const probe = [`'${key}'`, `"${key}"`].find((p) => src.includes(p));
  if (!probe) return false;
  const keyIdx = src.indexOf(probe);
  if (src.indexOf(probe, keyIdx + 1) !== -1) return false; // key text is not unique

  const after = src.slice(keyIdx + probe.length);
  const m = /^\s*:\s*(['"])/.exec(after);
  if (!m) return false;
  const valueStart = keyIdx + key.length + 2 + m[0].length;
  const quote = m[1];
  let valueEnd = valueStart;
  while (valueEnd < src.length && (src[valueEnd] !== quote || src[valueEnd - 1] === '\\')) {
    valueEnd += 1;
  }
  const value = src.slice(valueStart, valueEnd);

  const cased =
    typo[0] === typo[0].toUpperCase()
      ? correction[0].toUpperCase() + correction.slice(1)
      : correction;
  const occurrences = value.split(typo).length - 1;
  if (occurrences !== 1) return false;
  writeFileSync(abs, src.slice(0, valueStart) + value.replace(typo, cased) + src.slice(valueEnd));
  sourceCache.delete(abs);
  return true;
}

// -------------------------------------------------------- norwegian check ---

async function checkNorwegian({ registry, root, ci }) {
  if (!toolAvailable('hunspell')) {
    return skip('hunspell is not installed (`brew install hunspell` / `apt install hunspell`)');
  }
  const cacheDir = await ensureDictionaries();

  const findings = [];
  const countsParts = [];
  for (const lang of ['nb', 'nn']) {
    const items = [];
    for (const group of registry.GROUPS) {
      const langs = await readGroup(group, root);
      for (const [key, value] of langs[lang] ?? []) {
        const text = stripNonProse(value);
        if (text !== '') items.push({ sourceFile: sourcePath(group, lang), key, text });
      }
    }
    if (items.length === 0) continue;

    const glossary = readGlossary(join(HERE, `glossary.${lang}.txt`));
    const doc = items.map((i) => i.text).join('\n');
    const wordCount = doc.split(/\s+/).filter(Boolean).length;
    if (wordCount === 0) throw new HarnessError(`${lang}: extracted zero words`);

    const flagged = runHunspell(
      doc,
      DICTIONARY_FOR_LANG[lang].map((d) => join(cacheDir, d)),
    );
    const words = [...flagged]
      .filter((w) => /^[\p{L}'’-]{2,}$/u.test(w))
      .filter((w) => w !== w.toUpperCase()) // acronyms: BPMN, PDF, API
      .filter((w) => !glossary.has(w.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'nb'));

    for (const word of words) {
      const re = new RegExp(
        `(?:^|\\P{L})${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\P{L}|$)`,
        'u',
      );
      const hits = items.filter((i) => re.test(i.text));
      const where = hits
        .slice(0, 3)
        .map((i) => `${i.sourceFile} → '${i.key}'`)
        .join(', ');
      findings.push({
        file: hits[0]?.sourceFile,
        key: hits[0]?.key,
        line: hits[0] ? findKeyLine(root, hits[0].sourceFile, hits[0].key) : undefined,
        message: `${lang}: '${word}' is not in the dictionary or glossary (${hits.length} place(s): ${where}${hits.length > 3 ? ', …' : ''})`,
      });
    }
    countsParts.push(
      `${lang}: ${items.length} values, ~${wordCount} words, ${words.length} distinct flagged`,
    );
  }
  if (countsParts.length === 0) throw new HarnessError('no Norwegian values were extracted');
  void ci;
  return { findings, counts: countsParts.join('; ') };
}

// -------------------------------------------------------------- self-test ---

/**
 * Runs the checks against selftest/fixtures using the PRODUCTION
 * configuration — the real typos.toml, the real dictionaries, the real
 * glossaries — and asserts that every planted defect is flagged and nothing
 * else is. Only the registry is swapped, because the fixture files have to
 * be named somewhere. A failure here means the harness itself is broken.
 */
async function checkSelfTest({ ci }) {
  const { GROUPS, OUT_OF_SCOPE, SCAN_PATTERNS, EXPECTED } = await import('./selftest/registry.mjs');
  const registry = { GROUPS, OUT_OF_SCOPE, SCAN_PATTERNS };
  const failures = [];
  let assertions = 0;

  const assertFindings = (name, actual, expectedKey) => {
    const expected = EXPECTED[expectedKey];
    assertions += expected.length + actual.length;
    const hay = (f) => `${f.file ?? ''} ${f.message}`;
    for (const marker of expected) {
      if (!actual.some((f) => hay(f).includes(marker))) {
        failures.push(finding('(self-test)', undefined, `${name} did not flag: ${marker}`));
      }
    }
    for (const f of actual) {
      if (!expected.some((marker) => hay(f).includes(marker))) {
        failures.push(
          finding('(self-test)', undefined, `${name} flagged something unplanted: ${f.message}`),
        );
      }
    }
  };

  // The code pass, over fixtures copied OUTSIDE the excluded selftest path so
  // the production typos.toml actually looks at them.
  const tmp = mkdtempSync(join(tmpdir(), 'spellcheck-selftest-'));
  try {
    cpSync(join(HERE, 'selftest/fixtures/code'), tmp, { recursive: true });
    const visited = typosFileList(['--config', ROOT_CONFIG, tmp], { cwd: tmp });
    if (visited.length === 0) {
      failures.push(finding('(self-test)', undefined, 'the code pass visited no fixture files'));
    }
    const codeFindings = runTypos(['--config', ROOT_CONFIG, tmp], { cwd: tmp }).map((f) =>
      finding(
        f.path,
        undefined,
        `\`${f.typo}\` should be \`${(f.corrections ?? []).join('` or `')}\``,
      ),
    );
    assertFindings('code', codeFindings, 'code');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const structure = await checkStructure({ registry, root: REPO_ROOT });
  assertFindings('structure', structure.findings, 'structure');

  const coverage = checkCoverage({ registry, root: REPO_ROOT });
  assertFindings('coverage', coverage.findings, 'coverage');

  const english = await checkEnglish({ registry, root: REPO_ROOT, fix: false });
  assertFindings('en', english.findings, 'en');

  const norwegian = await checkNorwegian({ registry, root: REPO_ROOT, ci });
  if (norwegian.skipped) {
    if (ci) failures.push(finding('(self-test)', undefined, `no: skipped (${norwegian.skipped})`));
    else console.log(`  ⚠ self-test of the Norwegian check skipped: ${norwegian.skipped}`);
  } else {
    assertFindings('no', norwegian.findings, 'no');
  }

  return { findings: failures, counts: `${assertions} assertions over planted fixtures` };
}

// ------------------------------------------------------------------ main ---

const CHECKS = {
  'self-test': (ctx) => checkSelfTest(ctx),
  code: (ctx) => checkCode(ctx),
  structure: (ctx) => checkStructure(ctx),
  coverage: (ctx) => checkCoverage(ctx),
  en: (ctx) => checkEnglish(ctx),
  no: (ctx) => checkNorwegian(ctx),
};

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const ci = args.includes('--ci') || process.env.CI === 'true';
  const names = args.filter((a) => !a.startsWith('--'));
  for (const name of names) {
    if (!CHECKS[name]) {
      console.error(`unknown check '${name}' — one of: ${Object.keys(CHECKS).join(', ')}`);
      process.exit(64);
    }
  }
  const toRun = names.length > 0 ? names : Object.keys(CHECKS);
  const ctx = { registry: realRegistry, root: REPO_ROOT, fix, ci };

  const results = [];
  for (const name of toRun) {
    console.log(`▶ ${name}`);
    try {
      const res = await CHECKS[name](ctx);
      results.push({ name, ...res });
      report(name, res, ci);
    } catch (err) {
      if (!(err instanceof HarnessError)) throw err;
      results.push({ name, error: err.message, findings: [], counts: '' });
      console.log(`  ✗ HARNESS ERROR: ${err.message}`);
      if (ci) console.log(`::error title=spellcheck ${name}::${err.message}`);
    }
  }

  console.log('\nSummary');
  let exitCode = 0;
  for (const r of results) {
    let status;
    if (r.error) [status, exitCode] = ['HARNESS ERROR', 1];
    else if (r.skipped && ci)
      [status, exitCode] = [`SKIPPED (${r.skipped}) — a skip fails in CI`, 1];
    else if (r.skipped) status = `SKIPPED (${r.skipped})`;
    else if (r.findings.length > 0) [status, exitCode] = [`${r.findings.length} finding(s)`, 1];
    else status = 'ok';
    console.log(
      `  ${r.error || r.findings.length || (r.skipped && ci) ? '✗' : r.skipped ? '⚠' : '✓'} ${r.name.padEnd(10)} ${status}${r.counts ? `  [${r.counts}]` : ''}`,
    );
  }
  process.exit(exitCode);
}

function report(name, res, ci) {
  if (res.skipped) {
    console.log(`  ⚠ SKIPPED: ${res.skipped}`);
    return;
  }
  const MAX = 40;
  for (const f of res.findings.slice(0, MAX)) {
    console.log(`  ${f.file}${f.line ? `:${f.line}` : ''}: ${f.message}`);
  }
  if (res.findings.length > MAX) console.log(`  … and ${res.findings.length - MAX} more`);
  if (ci) {
    for (const f of res.findings.slice(0, 10)) {
      const loc = f.file ? `file=${f.file},` : '';
      const line = f.line ? `line=${f.line},` : '';
      console.log(
        `::error ${loc}${line}title=spellcheck ${name}::${f.message.replaceAll('\n', ' ')}`,
      );
    }
  }
  console.log(
    `  ${res.findings.length === 0 ? '✓ ok' : `✗ ${res.findings.length} finding(s)`}  [${res.counts}]`,
  );
}

await main();
