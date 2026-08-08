#!/usr/bin/env node
/**
 * Checks the language files themselves, rather than ignoring the Norwegian ones.
 *
 * Each language gets the check that suits it:
 *
 *   en   spelling, in British English — handled by spellcheck-ui-text.mjs
 *   nb   \
 *   nn    >  the structural checks below, which hold for every language
 *   en   /
 *
 * Norwegian is deliberately not spell-checked. It compounds freely — `kodeliste`,
 * `kodelisten` and `kodelister` are all correct — and the available hunspell
 * dictionaries flag every compound, around 11% of all words. A usable gate would
 * need a several-hundred-word allow-list, which is the kind of exception list this
 * setup exists to avoid. What can be checked exactly, with no false positives, is
 * that the languages agree with each other:
 *
 *   1. Key parity      — a key missing from one language shows that user a raw key.
 *   2. Parameter parity — if the English text interpolates {0}, so must nb and nn,
 *                         or the value is silently dropped for those users.
 *   3. Non-empty        — an empty translation renders as nothing.
 *
 * Run: yarn lang:check
 */

import { readFileSync } from 'node:fs';

/**
 * `keyParity: false` where one language is a partial translation by design —
 * Designer's en.json is not maintained (see src/Designer/frontend/AGENTS.md), so
 * only the checks that apply to shared keys run there.
 */
const GROUPS = [
  {
    name: 'app-libs/language',
    keyParity: true,
    files: {
      nb: 'app-libs/language/src/texts/nb.ts',
      nn: 'app-libs/language/src/texts/nn.ts',
      en: 'app-libs/language/src/texts/en.ts',
    },
  },
  {
    name: 'Designer frontend',
    keyParity: false,
    files: {
      nb: 'src/Designer/frontend/language/src/nb.json',
      en: 'src/Designer/frontend/language/src/en.json',
    },
  },
  {
    name: 'resourceadm',
    keyParity: false,
    files: {
      nb: 'src/Designer/frontend/resourceadm/language/src/nb.json',
      en: 'src/Designer/frontend/resourceadm/language/src/en.json',
    },
  },
];

/** Reads a language file into a Map of key -> text, for both JSON and TS modules. */
function readEntries(path) {
  const src = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return new Map(Object.entries(JSON.parse(src)));
  // A TS module may wrap a long value onto the following line, and quotes the
  // value with " when the text itself contains an apostrophe.
  const flat = src.replace(/\n\s+/g, ' ');
  const entry = /'([^']+)'\s*:\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
  return new Map([...flat.matchAll(entry)].map((m) => [m[1], m[2] ?? m[3]]));
}

// Two interpolation styles are in use: {0} in app-libs, and i18next's {{name}}
// in Designer. Both are compared by the exact set of placeholders they contain.
const PARAMETER = /\{\{?[\w.]+\}?\}/g;
const parametersOf = (text) => [...(text.match(PARAMETER) ?? [])].sort().join(',');

const problems = [];

for (const { name, files, keyParity } of GROUPS) {
  const langs = Object.fromEntries(Object.entries(files).map(([l, p]) => [l, readEntries(p)]));
  const reference = langs.en;

  if (keyParity) {
    const union = new Set(Object.values(langs).flatMap((m) => [...m.keys()]));
    for (const [lang, entries] of Object.entries(langs)) {
      const missing = [...union].filter((k) => !entries.has(k)).sort();
      for (const key of missing) {
        problems.push(`${files[lang]}: missing key '${key}', which the other languages define`);
      }
    }
  }

  for (const [lang, entries] of Object.entries(langs)) {
    for (const [key, text] of entries) {
      if (text.trim() === '') {
        problems.push(`${files[lang]}: '${key}' is empty`);
        continue;
      }
      if (lang === 'en') continue;
      const english = reference.get(key);
      if (english === undefined) continue;
      if (parametersOf(text) !== parametersOf(english)) {
        problems.push(
          `${files[lang]}: '${key}' interpolates [${parametersOf(text) || 'nothing'}] ` +
            `but the English text interpolates [${parametersOf(english) || 'nothing'}]`,
        );
      }
    }
  }

  console.log(`${name}: ${Object.keys(files).join('/')} checked`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
  if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}

console.log('Language files agree');
