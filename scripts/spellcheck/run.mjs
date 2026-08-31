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
 *              explicitly out of scope, every registered file is excluded
 *              from the code pass (no drift between the registry and
 *              typos.toml), and every typos.toml exclude still matches
 *              something or is declared precautionary (no dead engine rules)
 *   en         British English over English UI text values; US English over
 *              translation keys (typos over extracted copies — fixes are
 *              applied to the real files by key, never by byte offset)
 *   no         bokmål and nynorsk UI text values (hunspell, pinned
 *              LibreOffice dictionaries, glossary.*.txt)
 *
 * Usage:
 *   node scripts/spellcheck/run.mjs [check ...]     default: self-test + all
 *   node scripts/spellcheck/run.mjs quick [files…]  changed files only, for
 *           the inner dev loop and the pre-commit hook; never fetches
 *           dictionaries. `yarn spell:quick`.
 *   --fix   apply unambiguous corrections through the suppression registry
 *           (never `typos --write-changes`, which cannot see it). The code
 *           pass edits misspelled identifiers too — a semantic change.
 *           Always review the diff before committing.
 *   --ci    a skipped check fails the run (implied by $CI)
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DICTIONARY_FOR_LANG } from './dictionaries.mjs';
import {
  HarnessError,
  NORWEGIAN_SIGNAL_WORDS,
  REPO_ROOT,
  applyValueFix,
  classifyFindings,
  compileKeyDeclarations,
  compileSuppressions,
  ensureDictionaries,
  ensureOrdbank,
  excludeLiveness,
  fileLineReader,
  findKeyDeclaration,
  findKeyLine,
  globToRegExp,
  paramsOf,
  parseKeyDeclarations,
  partitionFindings,
  parseSuppressions,
  readGlossary,
  readGroup,
  readKeyDeclarations,
  readSuppressions,
  runHunspell,
  runTypos,
  sourcePath,
  staleKeyDeclarations,
  stripNonProse,
  toolAvailable,
  trackedFiles,
  typosFileList,
  typosTomlExcludes,
} from './lib.mjs';
import * as realRegistry from './registry.mjs';

const HERE = import.meta.dirname;
const EN_GB_CONFIG = join(HERE, 'typos.values.en-gb.toml');
const EN_US_CONFIG = join(HERE, 'typos.values.en-us.toml');
const ROOT_CONFIG = join(REPO_ROOT, 'typos.toml');
const KEYS_PATH = join(HERE, 'keys.txt');
const KEYS_LABEL = 'scripts/spellcheck/keys.txt';

// A check returns { findings, counts } and throws HarnessError when it could
// not do its job. `skip(reason)` marks a check that could not run at all.
const skip = (reason) => ({ skipped: reason, findings: [], counts: '' });
const finding = (file, key, message, line) => ({ file, key, message, line });

// ------------------------------------------------------------ code check ---

function checkCode({ fix, root }) {
  if (!toolAvailable('typos')) {
    throw new HarnessError('typos is not installed. `brew install typos-cli`');
  }
  const fileCount = typosFileList([]).length;
  if (fileCount < 500) {
    throw new HarnessError(
      `the code pass would only visit ${fileCount} files — typos.toml is broken, not the repo clean`,
    );
  }
  const compiled = compileSuppressions(readSuppressions(join(HERE, 'suppressions.txt')));
  const readLine = fileLineReader(root);
  // Context first (a Norwegian string is not English at all), policy second
  // (a suppression is an accepted English-context spelling).
  const {
    kept: unclassified,
    norwegian,
    data,
    pattern,
    usedSignals,
  } = classifyFindings(runTypos([]), readLine);
  const { kept, suppressedCount, stale } = partitionFindings(unclassified, compiled, readLine);

  // Config-health findings first: a stale suppression is an actionable
  // defect that must not drown in the backlog. Signal-word usage is counted
  // (see the summary) but deliberately NOT gated: a word's "usage" depends
  // on which typos findings happen to sit nearby, so gating it would block
  // unrelated PRs over harness internals — and an unused signal word masks
  // nothing, unlike a stale suppression or glossary entry. Pruning the list
  // is a deliberate maintenance act guided by the count.
  const findings = stale.map((e) =>
    finding(
      'scripts/spellcheck/suppressions.txt',
      undefined,
      `suppression for '${e.token}' matched nothing — stale entry, remove it`,
    ),
  );
  const applied = fix ? applyCodeFixes(root, kept) : 0;
  for (const f of kept) {
    findings.push(
      finding(
        f.path,
        undefined,
        `\`${f.typo}\` should be \`${(f.corrections ?? []).join('` or `')}\`` +
          (f.line_num === undefined ? ' (in the file name)' : ''),
        f.line_num,
      ),
    );
  }
  if (applied > 0) console.log(`  applied ${applied} fix(es) — re-run to verify`);
  return {
    findings,
    counts:
      `${fileCount} files visited, ${norwegian} in Norwegian strings ` +
      `(${usedSignals.size}/${NORWEGIAN_SIGNAL_WORDS.size} signal words at work), ${data} in data runs, ` +
      `${pattern} after bracket expressions, ` +
      `${suppressedCount} finding(s) suppressed by ${compiled.length} scoped rules`,
  };
}

/**
 * Applies unambiguous corrections directly — `typos --write-changes` is
 * never used, because it cannot see the suppression registry and would
 * "fix" wire-contract spellings. A fix is applied only when the typo has a
 * single correction and occurs exactly once on its line; file-name findings
 * are never auto-renamed.
 */
function applyCodeFixes(root, kept) {
  let applied = 0;
  const byFile = new Map();
  for (const f of kept) {
    if (f.line_num === undefined || (f.corrections ?? []).length !== 1) continue;
    const path = f.path.replace(/^\.\//, '');
    if (!byFile.has(path)) byFile.set(path, []);
    byFile.get(path).push(f);
  }
  for (const [path, fixes] of byFile) {
    const abs = join(root, path);
    const lines = readFileSync(abs, 'utf8').split('\n');
    let touched = false;
    for (const f of fixes) {
      const line = lines[f.line_num - 1];
      if (line === undefined || line.split(f.typo).length - 1 !== 1) continue;
      lines[f.line_num - 1] = line.replace(f.typo, f.corrections[0]);
      touched = true;
      applied += 1;
    }
    if (touched) writeFileSync(abs, lines.join('\n'));
  }
  return applied;
}

// ------------------------------------------------------- structure check ---

async function checkStructure({ registry, root, keysPath = KEYS_PATH, staleCheck = true }) {
  const keyDecls = compileKeyDeclarations(readKeyDeclarations(keysPath));
  const findings = [];
  let keyCount = 0;

  for (const group of registry.GROUPS) {
    const langs = await readGroup(group, root);
    const entryCounts = Object.values(langs).map((m) => m.size);
    keyCount += entryCounts.reduce((a, b) => a + b, 0);
    if (!group.mayBeEmpty && entryCounts.some((n) => n === 0)) {
      throw new HarnessError(`${group.name}: a language parsed to zero entries`);
    }

    // A duplicated key parses last-wins and silently drops a translation, so
    // the parsed Maps can never see it — scan the raw JSON for it instead.
    // (The TS files don't need this: a duplicate object-literal property is
    // a compile error, enforced by their own builds.)
    if (group.format === 'json-flat' || group.format === 'text-resource') {
      for (const path of Object.values(group.files)) {
        for (const [key, n] of duplicateJsonKeys(join(root, path), group.format)) {
          findings.push(
            finding(path, key, `'${key}' is defined ${n} times — only the last value survives`),
          );
        }
      }
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
          const declared = findKeyDeclaration(keyDecls, 'empty', sourcePath(group, lang), key);
          if (declared) {
            declared.hits += 1;
          } else {
            findings.push(finding(sourcePath(group, lang), key, `'${key}' is empty`));
          }
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
  if (staleCheck) {
    // Config-health first, like every other registry: an @empty declaration
    // whose key no longer exists or is no longer empty licenses nothing.
    findings.unshift(
      ...staleKeyDeclarations(keyDecls, 'empty').map((e) =>
        finding(
          KEYS_LABEL,
          undefined,
          `@empty for '${e.key}' matched no empty value — stale entry, remove it`,
        ),
      ),
    );
  }
  return { findings, counts: `${registry.GROUPS.length} groups, ${keyCount} entries compared` };
}

/** Keys (or text-resource ids) defined more than once in one JSON file. */
function duplicateJsonKeys(absPath, format) {
  const seen = new Map();
  if (format === 'text-resource') {
    for (const r of JSON.parse(readFileSync(absPath, 'utf8')).resources ?? []) {
      seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
    }
  } else {
    // Flat files, one `"key":` per line — count line-anchored occurrences.
    for (const m of readFileSync(absPath, 'utf8').matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) {
      seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
    }
  }
  return [...seen].filter(([, n]) => n > 1);
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

  const patterns = registry.SCAN_PATTERNS.map((glob) => ({
    glob,
    re: globToRegExp(glob),
    hits: 0,
  }));
  const oos = registry.OUT_OF_SCOPE.map((entry) => {
    if (!entry.reason) throw new HarnessError(`out-of-scope '${entry.glob}' has no reason`);
    return { ...entry, re: globToRegExp(entry.glob), hits: 0 };
  });

  let matched = 0;
  for (const path of tracked) {
    const hit = patterns.filter((p) => p.re.test(path));
    if (hit.length === 0) continue;
    for (const p of hit) p.hits += 1;
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
  // Rot is per pattern, not just global: one pattern can silently die (a
  // directory restructure) while the others keep `matched` comfortably high.
  for (const p of patterns.filter((p) => p.hits === 0)) {
    findings.push(finding(p.glob, undefined, 'scan pattern matches nothing — it has rotted'));
  }
  for (const entry of oos.filter((e) => e.hits === 0)) {
    findings.push(finding(entry.glob, undefined, 'stale out-of-scope entry — it exempts nothing'));
  }

  // The registry names a file so the checks here own its text; the code pass
  // must therefore skip it. This assertion is what keeps registry.mjs and
  // typos.toml's excludes from drifting apart. Only existing files are
  // probed — a registry typo is already reported as untracked above, and
  // typos errors on paths that do not exist.
  const probeable = [...registered].filter((p) => tracked.includes(p));
  const visited =
    probeable.length === 0 ? [] : typosFileList(['--force-exclude', ...probeable], { cwd: root });
  for (const path of visited) {
    findings.push(
      finding(
        path,
        undefined,
        'registered in registry.mjs but not excluded by typos.toml — its values would be spell-checked as code',
      ),
    );
  }

  // Engine-config liveness: typos.toml's excludes rot exactly the way scan
  // patterns do (a directory rename kills a glob silently), so every glob
  // must match a tracked file or carry a precautionary declaration.
  const excludes = typosTomlExcludes(join(root, 'typos.toml'));
  for (const problem of excludeLiveness(excludes, registry.PRECAUTIONARY_EXCLUDES ?? [], tracked)) {
    findings.push(finding('typos.toml', undefined, problem));
  }

  return {
    findings,
    counts:
      `${matched} matched paths, ${registered.size} registered, ` +
      `${oos.length} out-of-scope rules, ${excludes.length} engine excludes checked`,
  };
}

// --------------------------------------------------------- english check ---

async function checkEnglish({ registry, root, fix, keysPath = KEYS_PATH, staleCheck = true }) {
  const keyDecls = compileKeyDeclarations(readKeyDeclarations(keysPath));
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
      // A key is one code contract however many languages define it — check
      // it once, reported against the first language that has it.
      const seen = new Set();
      for (const [lang, entries] of Object.entries(langs)) {
        for (const key of entries.keys()) {
          if (seen.has(key)) continue;
          seen.add(key);
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
        if (item.kind === 'key') {
          // A key spelling can be a contract (an ISO code, a name keyed by a
          // wire value) — declared per key, and only the KEY: the value of a
          // declared key is still checked like any other.
          const declared = findKeyDeclaration(keyDecls, 'key-contract', item.sourceFile, item.key);
          if (declared) {
            declared.hits += 1;
            continue;
          }
        }
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

  if (staleCheck) {
    findings.unshift(
      ...staleKeyDeclarations(keyDecls, 'key-contract').map((e) =>
        finding(
          KEYS_LABEL,
          undefined,
          `@key-contract for '${e.key}' rescued no flagged key — stale entry, remove it`,
        ),
      ),
    );
  }
  return { findings, counts: `${valueCount} values + ${keyCount} keys examined` };
}

// -------------------------------------------------------- norwegian check ---

async function checkNorwegian({
  registry,
  root,
  offline = false,
  staleCheck = true,
  keysPath = KEYS_PATH,
}) {
  if (!toolAvailable('hunspell')) {
    return skip('hunspell is not installed (`brew install hunspell` / `apt install hunspell`)');
  }
  const cacheDir = await ensureDictionaries({ offline });

  const findings = [];
  // Glossary-health findings are reported FIRST — a stale or redundant
  // entry is an actionable config defect and must never drown in the word
  // backlog below the display cap.
  const configFindings = [];
  const countsParts = [];

  // The shared glossary holds language-neutral tokens (names, identifiers,
  // formats) accepted in both languages; each per-language glossary holds
  // Norwegian words. Like suppressions, entries must earn their keep: one
  // that no longer rescues any flagged word is reported as stale (only on a
  // full run — a scoped run proves nothing about unrelated entries), and a
  // per-language entry duplicating a shared one is redundant.
  const shared = readGlossary(join(HERE, 'glossary.shared.txt'));
  const usedShared = new Set();
  // A language the registry declares must produce values: without this, a
  // registry change that empties one language would skip its pass silently
  // while the other keeps the check green — work must be proven per language.
  const declared = new Set(
    registry.GROUPS.filter((g) => !g.mayBeEmpty)
      .flatMap((g) => Object.keys(g.files ?? {}))
      .filter((l) => l === 'nb' || l === 'nn'),
  );
  // Values are gathered up front so a @language declaration can re-route one
  // to the other language's pipeline: a deliberately nynorsk value inside a
  // bokmål file is checked AS nynorsk — with the nynorsk dictionary and
  // glossary — never merely skipped.
  const keyDecls = compileKeyDeclarations(readKeyDeclarations(keysPath));
  const itemsByLang = { nb: [], nn: [] };
  for (const group of registry.GROUPS) {
    const langs = await readGroup(group, root);
    for (const lang of ['nb', 'nn']) {
      for (const [key, value] of langs[lang] ?? []) {
        const text = stripNonProse(value);
        if (text === '') continue;
        const file = sourcePath(group, lang);
        const declared = findKeyDeclaration(keyDecls, 'language', file, key);
        // Only an actual re-route counts as the entry working: declaring a
        // value to be in the language of its own file rescues nothing.
        if (declared && declared.lang !== lang) declared.hits += 1;
        itemsByLang[declared?.lang ?? lang].push({ sourceFile: file, key, text });
      }
    }
  }
  if (staleCheck) {
    for (const e of staleKeyDeclarations(keyDecls, 'language')) {
      configFindings.push(
        finding(
          KEYS_LABEL,
          undefined,
          `@language ${e.lang} for '${e.key}' re-routed nothing — stale entry, remove it`,
        ),
      );
    }
  }

  for (const lang of ['nb', 'nn']) {
    const items = itemsByLang[lang];
    if (items.length === 0) {
      if (declared.has(lang)) {
        throw new HarnessError(`${lang}: the registry declares files but no values were extracted`);
      }
      continue;
    }

    const glossary = readGlossary(join(HERE, `glossary.${lang}.txt`));
    for (const term of [...glossary].filter((t) => shared.has(t)).sort()) {
      configFindings.push(
        finding(
          `scripts/spellcheck/glossary.${lang}.txt`,
          undefined,
          `'${term}' is already in glossary.shared.txt — redundant entry, remove it`,
        ),
      );
    }
    const usedOwn = new Set();
    const fullforms = await ensureOrdbank(lang, { offline });
    const doc = items.map((i) => i.text).join('\n');
    const wordCount = doc.split(/\s+/).filter(Boolean).length;
    if (wordCount === 0) throw new HarnessError(`${lang}: extracted zero words`);

    const flagged = runHunspell(
      doc,
      DICTIONARY_FOR_LANG[lang].map((d) => join(cacheDir, d)),
    );
    // A word is accepted by ANY of: the hunspell dictionary (which is what
    // handles compounds), the Norsk Ordbank full-form list (which covers the
    // frozen dictionary's gaps — see dictionaries.mjs), or the glossaries.
    // Deliberately unchecked: tokens with digits or other non-letters (the
    // first filter) and ALL-CAPS tokens (acronyms — BPMN, PDF); a shouted or
    // digit-bearing misspelling is invisible here.
    const words = [...flagged]
      .filter((w) => /^[\p{L}'’-]{2,}$/u.test(w))
      .filter((w) => w !== w.toUpperCase())
      .filter((w) => !fullforms.has(w) && !fullforms.has(w.toLowerCase()))
      .filter((w) => {
        const lc = w.toLowerCase();
        if (glossary.has(lc)) return (usedOwn.add(lc), false);
        if (shared.has(lc)) return (usedShared.add(lc), false);
        return true;
      })
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
    if (staleCheck) {
      for (const term of [...glossary].filter((t) => !usedOwn.has(t)).sort()) {
        configFindings.push(
          finding(
            `scripts/spellcheck/glossary.${lang}.txt`,
            undefined,
            `'${term}' no longer rescues any flagged ${lang} word — stale entry, remove it`,
          ),
        );
      }
    }
    countsParts.push(
      `${lang}: ${items.length} values, ~${wordCount} words, ${words.length} distinct flagged, ` +
        `${usedOwn.size}/${glossary.size} glossary terms at work`,
    );
  }
  if (countsParts.length === 0) throw new HarnessError('no Norwegian values were extracted');
  countsParts.push(`shared glossary: ${usedShared.size}/${shared.size} terms at work`);
  if (staleCheck) {
    // Shared terms are alive when either language needed them.
    for (const term of [...shared].filter((t) => !usedShared.has(t)).sort()) {
      configFindings.push(
        finding(
          'scripts/spellcheck/glossary.shared.txt',
          undefined,
          `'${term}' no longer rescues any flagged word — stale entry, remove it`,
        ),
      );
    }
  }
  return { findings: [...configFindings, ...findings], counts: countsParts.join('; ') };
}

// ------------------------------------------------------------ quick check ---

/**
 * Fast feedback for the inner dev loop and the pre-commit hook: only the
 * given files (default: everything changed relative to HEAD, plus staged and
 * untracked), only the checks that can run instantly. The Norwegian pass
 * runs offline-only — it never fetches dictionaries here.
 */
async function checkQuick(ctx, fileArgs) {
  const root = ctx.root;
  const files = (fileArgs.length > 0 ? fileArgs : gitChangedFiles(root))
    .map((f) => f.replace(/^\.\//, ''))
    .filter((f) => existsSync(join(root, f)));
  if (files.length === 0) {
    return { findings: [], counts: 'no changed files to check' };
  }

  // The code pass, scoped. --force-exclude keeps typos.toml's excludes
  // authoritative even for explicitly named files.
  const compiled = compileSuppressions(readSuppressions(join(HERE, 'suppressions.txt')));
  const readLine = fileLineReader(root);
  const {
    kept: unclassified,
    norwegian,
    data,
    pattern,
  } = classifyFindings(runTypos(['--force-exclude', ...files], { cwd: root }), readLine);
  const { kept, suppressedCount } = partitionFindings(unclassified, compiled, readLine, {
    staleCheck: false, // a scoped run proves nothing about unrelated entries
  });
  const findings = kept.map((f) =>
    finding(
      f.path,
      undefined,
      `\`${f.typo}\` should be \`${(f.corrections ?? []).join('` or `')}\``,
      f.line_num,
    ),
  );

  // Language-file checks, only for the groups the changed files belong to.
  const fileSet = new Set(files);
  const affected = ctx.registry.GROUPS.filter((g) =>
    (g.file ? [g.file] : Object.values(g.files)).some((p) => fileSet.has(p)),
  );
  const notes = [];
  if (affected.length > 0) {
    const subset = { GROUPS: affected };
    // staleCheck off throughout: a scoped run proves nothing about entries
    // whose keys live in unaffected groups.
    const structure = await checkStructure({ registry: subset, root, staleCheck: false });
    findings.push(...structure.findings);
    if (affected.some((g) => g.english || g.checkKeys !== false)) {
      const english = await checkEnglish({ registry: subset, root, fix: false, staleCheck: false });
      findings.push(...english.findings);
    }
    if (affected.some((g) => Object.keys(g.files ?? {}).some((l) => l === 'nb' || l === 'nn'))) {
      try {
        const norwegian = await checkNorwegian({
          registry: subset,
          root,
          offline: true,
          staleCheck: false, // a scoped run proves nothing about unrelated entries
        });
        if (norwegian.skipped) notes.push(`norwegian skipped: ${norwegian.skipped}`);
        else findings.push(...norwegian.findings);
      } catch (err) {
        if (!(err instanceof HarnessError)) throw err;
        notes.push(`norwegian skipped: ${err.message}`);
      }
    }
  }
  for (const note of notes) console.log(`  ⚠ ${note}`);

  return {
    findings,
    counts:
      `${files.length} file(s), ${norwegian + data + pattern} classified, ${suppressedCount} suppressed` +
      (affected.length > 0 ? `, ${affected.length} language group(s)` : ''),
  };
}

function gitChangedFiles(root) {
  const out = new Set();
  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'],
    ['ls-files', '-o', '--exclude-standard'],
  ]) {
    const res = spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (res.status !== 0) throw new HarnessError(`git ${args[0]} failed: ${res.stderr}`);
    for (const f of res.stdout.split('\n').filter(Boolean)) out.add(f);
  }
  return [...out];
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
  const {
    GROUPS,
    OUT_OF_SCOPE,
    SCAN_PATTERNS,
    EXPECTED,
    DRIFT_REGISTRY,
    FIX_SCENARIOS,
    CLASSIFIER_SCENARIOS,
  } = await import('./selftest/registry.mjs');
  // The engine-exclude declarations are production policy, not fixture data
  // — they ride along so the liveness arm of the coverage check proves the
  // REAL typos.toml clean, while its defect arms run as unit scenarios.
  const { PRECAUTIONARY_EXCLUDES } = realRegistry;
  const registry = { GROUPS, OUT_OF_SCOPE, SCAN_PATTERNS, PRECAUTIONARY_EXCLUDES };
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
    const visited = typosFileList(['--config', ROOT_CONFIG, '.'], { cwd: tmp });
    if (visited.length === 0) {
      failures.push(finding('(self-test)', undefined, 'the code pass visited no fixture files'));
    }
    // The classifier runs here exactly as in checkCode: the fixture plants
    // typos inside a Norwegian string and inside a data run (must be
    // classified away, and the counts prove typos saw them at all) next to
    // one in an English string on a line that also holds a Norwegian string
    // (must survive).
    const {
      kept: codeKept,
      norwegian,
      data,
      pattern,
    } = classifyFindings(
      runTypos(['--config', ROOT_CONFIG, '.'], { cwd: tmp }),
      fileLineReader(tmp),
    );
    assertions += 3;
    const want = EXPECTED.codeClassified;
    if (norwegian !== want.norwegian || data !== want.data || pattern !== want.pattern) {
      failures.push(
        finding(
          '(self-test)',
          undefined,
          `code: expected ${want.norwegian} Norwegian / ${want.data} data / ${want.pattern} pattern ` +
            `classification(s), got ${norwegian} / ${data} / ${pattern}`,
        ),
      );
    }
    const codeFindings = codeKept.map((f) =>
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

  // The fixture key declarations ride along like the fixture registry does:
  // each declaration kind is planted next to a live defect of the same
  // class, so the checks prove they honor a declaration without going
  // blind, plus one stale entry per kind whose check runs stale detection.
  const fixtureKeys = join(HERE, 'selftest/fixtures/keys.txt');

  const structure = await checkStructure({ registry, root: REPO_ROOT, keysPath: fixtureKeys });
  assertFindings('structure', structure.findings, 'structure');

  const coverage = checkCoverage({ registry, root: REPO_ROOT });
  assertFindings('coverage', coverage.findings, 'coverage');

  const english = await checkEnglish({
    registry,
    root: REPO_ROOT,
    fix: false,
    keysPath: fixtureKeys,
  });
  assertFindings('en', english.findings, 'en');

  // staleCheck off: against fixture values alone, nearly every production
  // glossary term would read as stale. (@language staleness is covered by
  // the keyDeclarationFailures unit block instead.)
  const norwegian = await checkNorwegian({
    registry,
    root: REPO_ROOT,
    staleCheck: false,
    keysPath: fixtureKeys,
  });
  if (norwegian.skipped) {
    if (ci) failures.push(finding('(self-test)', undefined, `no: skipped (${norwegian.skipped})`));
    else console.log(`  ⚠ self-test of the Norwegian check skipped: ${norwegian.skipped}`);
  } else {
    assertFindings('no', norwegian.findings, 'no');
  }

  // The coverage arms the standard fixtures cannot reach: a registered file
  // the code pass would still visit (drift), a registered path that does not
  // exist (untracked), and an out-of-scope rule that exempts nothing
  // (stale). DRIFT_REGISTRY plants one of each.
  const drift = checkCoverage({
    registry: { ...DRIFT_REGISTRY, PRECAUTIONARY_EXCLUDES },
    root: REPO_ROOT,
  });
  assertFindings('coverage-drift', drift.findings, 'coverageDrift');

  // The engine-exclude liveness logic, on synthetic globs: every defect arm
  // (dead rule, unnecessary declaration, stale declaration) plus the two
  // legal states, without planting dead rules in the production config.
  for (const failure of excludeLivenessFailures()) {
    failures.push(finding('(self-test)', undefined, `exclude liveness: ${failure}`));
    assertions += 1;
  }
  assertions += 5;

  // The fix path — the only code that writes to product files — asserted on
  // throwaway copies, byte for byte.
  for (const failure of fixPathFailures(FIX_SCENARIOS)) {
    failures.push(finding('(self-test)', undefined, failure));
    assertions += 1;
  }
  assertions += FIX_SCENARIOS.length;

  // The classifier, on synthetic lines: delimiter pairing, escapes, data
  // runs, and the spans it must never invent.
  for (const failure of classifierFailures(CLASSIFIER_SCENARIOS)) {
    failures.push(finding('(self-test)', undefined, `classifier: ${failure}`));
    assertions += 1;
  }
  assertions += CLASSIFIER_SCENARIOS.cases.length;

  // The suppression text format, on synthetic documents: section grammar,
  // scope reset between sections, and every parse error.
  for (const failure of suppressionParserFailures()) {
    failures.push(finding('(self-test)', undefined, `suppression parser: ${failure}`));
    assertions += 1;
  }
  assertions += 6;

  // The suppression logic, on synthetic findings: path scoping, identifier
  // scoping (both directions), and stale detection.
  for (const failure of suppressionFailures()) {
    failures.push(finding('(self-test)', undefined, `suppressions: ${failure}`));
    assertions += 1;
  }
  assertions += 5;

  // The key-declaration format and matcher, on synthetic documents: section
  // grammar, every parse and compile error, kind/scope matching, and stale
  // detection.
  for (const failure of keyDeclarationFailures()) {
    failures.push(finding('(self-test)', undefined, `key declarations: ${failure}`));
    assertions += 1;
  }
  assertions += 17;

  return { findings: failures, counts: `${assertions} assertions over planted fixtures` };
}

/**
 * The classifier must only ever drop a finding that provably sits inside a
 * properly paired, same-line string literal reading as Norwegian, or inside
 * a data run — never one in an identifier, in an English string, or in a
 * pseudo-span opened by a prose apostrophe. The scenario table lives in
 * selftest/registry.mjs — it necessarily quotes flaggable tokens, and the
 * selftest path is excluded from the code pass.
 */
function classifierFailures({ lines, cases }) {
  const failures = [];
  const readLine = (path) => lines[path];
  for (const [path, typo, want, what] of cases) {
    // The fixture lines are ASCII, so indexOf is the byte offset.
    const find = { path, line_num: 1, byte_offset: lines[path].indexOf(typo), typo };
    const { norwegian, data, pattern, usedSignals } = classifyFindings([find], readLine);
    const got =
      norwegian === 1 ? 'norwegian' : data === 1 ? 'data' : pattern === 1 ? 'pattern' : 'finding';
    if (got !== want) failures.push(`expected ${want} but got ${got} for ${what}`);
    if (got === 'norwegian' && usedSignals.size === 0) {
      failures.push(`classification of ${what} recorded no signal-word usage`);
    }
  }
  return failures;
}

/**
 * The liveness contract on typos.toml's excludes: a dead glob is a finding
 * unless declared precautionary; a declaration is itself a finding when its
 * glob is live (unnecessary) or absent from the config (stale); and a
 * declaration without a reason breaks the harness rather than passing.
 */
function excludeLivenessFailures() {
  const failures = [];
  const problems = excludeLiveness(
    ['src/**', '*.dead', 'gen/**'],
    [
      { glob: 'gen/**', reason: 'planted: allowed to be silent' },
      { glob: 'src/**', reason: 'planted: unnecessary — the glob is live' },
      { glob: 'ghost/**', reason: 'planted: stale — no such rule' },
    ],
    ['src/a.cs', 'docs/readme.md'],
  );
  const expect = (fragment, why) => {
    if (!problems.some((p) => p.includes(fragment))) failures.push(`did not flag ${why}`);
  };
  expect(`'*.dead' matches no tracked file`, 'a dead undeclared glob');
  expect(`'src/**' is declared precautionary but matches`, 'an unnecessary declaration');
  expect(`declaration for 'ghost/**' matches no rule`, 'a stale declaration');
  if (problems.length !== 3) {
    failures.push(`expected exactly 3 problems, got ${problems.length}: ${problems.join(' | ')}`);
  }
  try {
    excludeLiveness(['a/**'], [{ glob: 'a/**' }], []);
    failures.push('a declaration without a reason was accepted');
  } catch (err) {
    if (!(err instanceof HarnessError)) throw err;
  }
  return failures;
}

/**
 * The registry's text format must parse exactly: tokens inherit their
 * section's directives and nothing from earlier sections, and every
 * malformed document is rejected rather than silently narrowed.
 */
function suppressionParserFailures() {
  const failures = [];
  const doc = [
    '# first section',
    '@identifier-part',
    '@paths a/** b/**',
    'Tokena',
    'tokenb  # trailing note',
    '',
    '# second section',
    '@identifiers SomeName',
    'Tokenc',
  ].join('\n');
  const entries = parseSuppressions(doc, '(synthetic)');
  const want = [
    { token: 'Tokena', identifierPart: true, paths: ['a/**', 'b/**'] },
    { token: 'tokenb', identifierPart: true, paths: ['a/**', 'b/**'] },
    { token: 'Tokenc', identifiers: ['SomeName'] },
  ];
  if (JSON.stringify(entries) !== JSON.stringify(want)) {
    failures.push(`parsed ${JSON.stringify(entries)}`);
  }
  const rejects = [
    ['orphan token', 'Tokena'],
    ['unknown directive', '@reason retired\nTokena'],
    ['empty @paths', '@paths\nTokena'],
    ['empty @identifiers', '@identifiers\nTokena'],
    ['trailing directives', '@paths a/**\nTokena\n@identifier-part'],
  ];
  for (const [what, text] of rejects) {
    try {
      parseSuppressions(text, '(synthetic)');
      failures.push(`accepted a document with ${what}`);
    } catch (err) {
      if (!(err instanceof HarnessError)) throw err;
    }
  }
  return failures;
}

/**
 * The suppression matcher must narrow, never widen: a token outside its
 * declared paths or inside an unlisted identifier stays a finding, and an
 * entry that matches nothing is reported as stale.
 */
function suppressionFailures() {
  const failures = [];
  const entries = compileSuppressions([
    { token: 'Suppressme', paths: ['docs/allowed/**'] },
    { token: 'Contracted', identifiers: ['ContractedField'] },
    { token: 'Phantom', paths: ['**'] },
  ]);
  const lines = {
    'docs/allowed/a.md': 'the Suppressme word',
    'docs/other/b.md': 'the Suppressme word',
    'src/c.cs': 'var ContractedField = 1;',
    'src/d.md': 'the Contracted value',
  };
  const f = (path, byte_offset, typo) => ({ path, line_num: 1, byte_offset, typo });
  const { kept, suppressedCount, stale } = partitionFindings(
    [
      f('docs/allowed/a.md', 4, 'Suppressme'), // in scope → suppressed
      f('docs/other/b.md', 4, 'Suppressme'), // outside paths → kept
      f('src/c.cs', 4, 'Contracted'), // inside listed identifier → suppressed
      f('src/d.md', 4, 'Contracted'), // bare word → kept
    ],
    entries,
    (path) => lines[path],
  );
  if (suppressedCount !== 2) failures.push(`expected 2 suppressed, got ${suppressedCount}`);
  if (kept.some((k) => k.path === 'docs/allowed/a.md' || k.path === 'src/c.cs')) {
    failures.push('suppressed a finding it should not have kept, or vice versa');
  }
  if (!kept.some((k) => k.path === 'docs/other/b.md')) {
    failures.push('a token outside its declared paths was not kept');
  }
  if (!kept.some((k) => k.path === 'src/d.md')) {
    failures.push('a bare word outside its identifier scope was not kept');
  }
  if (stale.length !== 1 || stale[0].token !== 'Phantom') {
    failures.push('the planted stale entry was not detected');
  }
  return failures;
}

/**
 * The key-declaration format (keys.txt) must parse exactly, reject every
 * malformed document, and match by kind within its @files scope; an entry
 * that did no work must read as stale. An empty document is legal — the
 * format ships before any product entry needs it, and zero declarations
 * only makes the checks stricter.
 */
function keyDeclarationFailures() {
  const failures = [];
  const doc = [
    '# empties',
    '@files a/*.json',
    '@empty',
    'some.key',
    'other.key  # trailing note',
    '',
    '@language nn',
    '@files b/nb.json',
    'routed.key',
  ].join('\n');
  const entries = parseKeyDeclarations(doc, '(synthetic)');
  const want = [
    { key: 'some.key', files: ['a/*.json'], kind: 'empty' },
    { key: 'other.key', files: ['a/*.json'], kind: 'empty' },
    { key: 'routed.key', kind: 'language', lang: 'nn', files: ['b/nb.json'] },
  ];
  if (JSON.stringify(entries) !== JSON.stringify(want)) {
    failures.push(`parsed ${JSON.stringify(entries)}`);
  }
  if (parseKeyDeclarations('# comments only\n', '(synthetic)').length !== 0) {
    failures.push('an entry appeared out of a comment-only document');
  }

  const rejects = [
    ['orphan key', 'some.key'],
    ['unknown directive', '@keys x\nsome.key'],
    ['two kinds in one section', '@empty\n@key-contract\n@files a\nk'],
    ['a bad @language argument', '@language sv\n@files a\nk'],
    ['a missing @language argument', '@language\n@files a\nk'],
    ['empty @files', '@files\nk'],
    ['trailing directives', '@files a\n@empty\nk\n@empty'],
    ['whitespace in a key', '@files a\n@empty\nnot a.key'],
  ];
  for (const [what, text] of rejects) {
    try {
      parseKeyDeclarations(text, '(synthetic)');
      failures.push(`accepted a document with ${what}`);
    } catch (err) {
      if (!(err instanceof HarnessError)) throw err;
    }
  }

  const compileRejects = [
    ['no kind', [{ key: 'k', files: ['a'] }]],
    ['no @files scope', [{ key: 'k', kind: 'empty' }]],
    ['no key', [{ kind: 'empty', files: ['a'] }]],
  ];
  for (const [what, entryList] of compileRejects) {
    try {
      compileKeyDeclarations(entryList);
      failures.push(`compiled an entry with ${what}`);
    } catch (err) {
      if (!(err instanceof HarnessError)) throw err;
    }
  }

  const compiled = compileKeyDeclarations([{ key: 'k.e', kind: 'empty', files: ['x/*.json'] }]);
  const hit = findKeyDeclaration(compiled, 'empty', 'x/nb.json', 'k.e');
  if (!hit) failures.push('a declaration in scope did not match');
  if (findKeyDeclaration(compiled, 'empty', 'y/nb.json', 'k.e')) {
    failures.push('a declaration matched outside its @files scope');
  }
  if (findKeyDeclaration(compiled, 'key-contract', 'x/nb.json', 'k.e')) {
    failures.push('a declaration matched a different kind');
  }
  if (staleKeyDeclarations(compiled, 'empty').length !== 1) {
    failures.push('an entry that did no work was not reported as stale');
  }
  return failures;
}

function fixPathFailures(scenarios) {
  const failures = [];
  const dir = mkdtempSync(join(tmpdir(), 'spellcheck-fix-'));
  try {
    for (const [i, s] of scenarios.entries()) {
      const name = `fix-${i}.json`;
      writeFileSync(join(dir, name), s.file);
      const applied = applyValueFix(dir, name, s.key, s.typo, s.correction);
      const got = readFileSync(join(dir, name), 'utf8');
      if (s.want === false) {
        if (applied || got !== s.file) failures.push(`fix path: should have declined: ${s.name}`);
      } else if (!applied || got !== s.want) {
        failures.push(`fix path: wrong result for: ${s.name}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return failures;
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

// process.exitCode (never process.exit) everywhere below: a forced exit can
// end the process while piped stdout still has pending writes, truncating
// the very summary that explains the failure.
async function main() {
  // Native TS type stripping and import.meta.dirname both need this floor;
  // without the guard the failure is a cryptic ERR_UNKNOWN_FILE_EXTENSION.
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18)) {
    console.error(
      `Node ${process.versions.node} is too old for the spell-check runner (need ≥ 22.18).`,
    );
    process.exitCode = 64;
    return;
  }

  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const ci = args.includes('--ci') || process.env.CI === 'true';
  const names = args.filter((a) => !a.startsWith('--'));
  const ctx = { registry: realRegistry, root: REPO_ROOT, fix, ci };

  // `quick <files…>` is its own fast path: everything after the command is a
  // file list (the pre-commit hook passes staged files), not check names.
  if (names[0] === 'quick') {
    console.log('▶ quick');
    try {
      const res = await checkQuick(ctx, names.slice(1));
      report('quick', res, ci);
      process.exitCode = res.findings.length > 0 ? 1 : 0;
    } catch (err) {
      if (!(err instanceof HarnessError)) throw err;
      console.log(`  ✗ HARNESS ERROR: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  for (const name of names) {
    if (!CHECKS[name]) {
      console.error(`unknown check '${name}' — one of: quick, ${Object.keys(CHECKS).join(', ')}`);
      process.exitCode = 64;
      return;
    }
  }
  const toRun = names.length > 0 ? names : Object.keys(CHECKS);

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
  if (exitCode === 1) {
    console.log(`
How to fix: prefer correcting the spelling. Deliberate exceptions are
declared in scripts/spellcheck/ — suppressions.txt (WRONG spellings that
are contracts, scoped to where they are load-bearing), glossary.nb/nn/
shared.txt (CORRECT words the dictionaries lack; shared = language-neutral
tokens only), keys.txt (per-key @empty / @key-contract / @language). Each
file's header documents its grammar; every entry is stale-checked, so an
entry that stops doing work becomes a finding itself. Conventions: root
AGENTS.md, "Spelling and language". Never run bare typos or
typos --write-changes — use yarn spell:quick / spell:check / spell:fix.`);
  }
  process.exitCode = exitCode;
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
