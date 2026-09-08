/**
 * The self-test's registry and its expectations.
 *
 * The self-test swaps ONLY this registry — the checks, the root typos.toml,
 * the dictionaries and the glossaries are the production ones, because a
 * self-test that runs a parallel configuration proves nothing about the
 * configuration that guards the repository.
 *
 * EXPECTED lists one marker per planted defect. The self-test fails when a
 * marker goes unflagged (the check is blind) AND when a finding matches no
 * marker (the check over-reports) — the fixtures otherwise contain only
 * text every check must accept: valid compounds (kodelisten), English
 * loanwords (dashboard), glossary terms (Altinn, Maskinporten).
 */

const LANG = 'scripts/spellcheck/selftest/fixtures/lang';

export const GROUPS = [
  {
    name: 'self-test fixtures',
    format: 'json-flat',
    files: {
      nb: `${LANG}/fixture-nb.json`,
      nn: `${LANG}/fixture-nn.json`,
      en: `${LANG}/fixture-en.json`,
    },
    parity: 'equal',
    english: 'en-gb',
  },
];

export const OUT_OF_SCOPE = [
  {
    glob: `${LANG}/out-of-scope.nb.json`,
    reason: 'exercises the exemption path: matched, unregistered, excused',
  },
];

export const SCAN_PATTERNS = [`${LANG}/*.json`];

/**
 * A second registry for the coverage arms the standard fixtures cannot
 * exercise: README.md is tracked and NOT excluded by typos.toml (the drift
 * arm must flag it), ghost.json does not exist (the untracked arm), and the
 * out-of-scope glob matches nothing (the stale arm). The fixture files are
 * registered so the scan pattern's matches are all accounted for.
 */
export const DRIFT_REGISTRY = {
  GROUPS: [
    {
      name: 'drift plant — a registered file the code pass still visits',
      format: 'json-flat',
      files: { en: 'README.md' },
      parity: 'none',
      english: null,
    },
    {
      name: 'untracked plant',
      format: 'json-flat',
      files: { nb: `${LANG}/ghost-does-not-exist.json` },
      parity: 'none',
      english: null,
    },
    {
      name: 'the real fixtures, so the scan pattern is fully accounted for',
      format: 'json-flat',
      files: {
        nb: `${LANG}/fixture-nb.json`,
        nn: `${LANG}/fixture-nn.json`,
        en: `${LANG}/fixture-en.json`,
        no: `${LANG}/out-of-scope.nb.json`,
        en2: `${LANG}/unregistered.nb.json`,
      },
      parity: 'none',
      english: null,
    },
  ],
  OUT_OF_SCOPE: [{ glob: `${LANG}/never-matches-*.json`, reason: 'stale plant' }],
  SCAN_PATTERNS: [`${LANG}/*.json`],
};

/**
 * applyValueFix scenarios, asserted byte for byte on throwaway copies. Two
 * easy-to-regress failure modes are pinned: a value that merely MENTIONS
 * another key must not be edited in its place, and a value ending in an
 * escaped backslash must not derail the quote scan. The scenario text lives
 * here, inside the excluded selftest directory, so the planted British
 * spellings are not themselves reported by the code pass.
 */
export const FIX_SCENARIOS = [
  {
    name: 'fixes the flagged value and only it, ignoring a decoy mention',
    file: [
      `{`,
      `  "docs.example": "Skriv 'k.a': 'some colors here' i filen",`,
      `  "k.a": "Choose your colors wisely"`,
      `}`,
    ].join('\n'),
    key: 'k.a',
    typo: 'colors',
    correction: 'colours',
    want: [
      `{`,
      `  "docs.example": "Skriv 'k.a': 'some colors here' i filen",`,
      `  "k.a": "Choose your colours wisely"`,
      `}`,
    ].join('\n'),
  },
  {
    name: 'survives a value ending in an escaped backslash',
    file: [`{`, `  "path": "C:\\\\",`, `  "b": "the color"`, `}`].join('\n'),
    key: 'b',
    typo: 'color',
    correction: 'colour',
    want: [`{`, `  "path": "C:\\\\",`, `  "b": "the colour"`, `}`].join('\n'),
  },
  {
    name: 'preserves capitalization and handles TS wrapped values',
    file: [
      `export function en() {`,
      `  return {`,
      `    'x.y':`,
      `      "Color it isn't",`,
      `  };`,
      `}`,
    ].join('\n'),
    key: 'x.y',
    typo: 'Color',
    correction: 'colour',
    want: [
      `export function en() {`,
      `  return {`,
      `    'x.y':`,
      `      "Colour it isn't",`,
      `  };`,
      `}`,
    ].join('\n'),
  },
  {
    name: 'declines when the key is defined twice',
    file: [`{`, `  "dup": "color one",`, `  "dup": "color two"`, `}`].join('\n'),
    key: 'dup',
    typo: 'color',
    correction: 'colour',
    want: false,
  },
  {
    name: 'declines when the typo occurs twice in the value',
    file: [`{`, `  "k": "color and color"`, `}`].join('\n'),
    key: 'k',
    typo: 'color',
    correction: 'colour',
    want: false,
  },
];

/**
 * Classifier scenarios, run as unit cases against synthetic lines (the
 * table quotes flaggable tokens, so it must live in this excluded path).
 * `cases` rows are [path, typo, expected classification, description];
 * offsets are derived by indexOf, so the lines must be ASCII and contain
 * each referenced typo exactly once at its intended position.
 */
export const CLASSIFIER_SCENARIOS = {
  lines: {
    'a.ts': `const t = 'Velg adresse her';`, // Norwegian string
    'b.ts': `const p = ['Dette er ikke alt', "the colour token"];`, // pairing
    'c.ts': `const adresseFelt = 'Skriv inn tekst';`, // identifier vs string
    'd.md': `don't classify adresse after an unpaired apostrophe`,
    'e.ts': `const s = 'han sa \\'adresse\\' til alle'; colour();`, // escapes
    'f.yaml': `n: uCI86gU5og9MxiTN7qKUvZmAgXBaEfGhIjKlMnOpQrStUv`, // blob
    'g.gitignore': `*.[Pp]ublish.xml`, // bracket expression
    'h.md': `the [Pp]ublish.xml pattern and a colour`, // bracket class must not shield the rest of the line
  },
  cases: [
    ['g.gitignore', 'ublish', 'pattern', 'a word tail right after a bracket expression'],
    ['h.md', 'colour', 'finding', 'a word elsewhere on a line that has a bracket expression'],
    ['a.ts', 'adresse', 'norwegian', 'a typo inside a Norwegian string'],
    ['b.ts', 'colour', 'finding', 'an English string next to a Norwegian one'],
    ['c.ts', 'adresse', 'finding', 'an identifier on a line with a Norwegian string'],
    ['d.md', 'adresse', 'finding', 'prose after an unpaired apostrophe'],
    ['e.ts', 'colour', 'finding', 'code after a string with escaped quotes'],
    ['e.ts', 'adresse', 'norwegian', 'a token inside escaped quotes within the string'],
    ['f.yaml', 'Ba', 'data', 'a token inside a bare base64 blob'],
  ],
};

export const EXPECTED = {
  // Production typos.toml over copies of fixtures/code/ placed outside the
  // excluded selftest path, findings run through the Norwegian-string
  // classifier exactly as in checkCode.
  code: [
    '`recieve` should be `receive`',
    '`colour` should be `color`',
    '`behaviour` should be `behavior`',
    '`recieved` should be `received`',
    '`accomodate` should be `accommodate`', // in an English string beside a Norwegian one
  ],
  // The plants the classifier must remove (they must NOT appear above), but
  // count — proving typos flagged them and the classifier, not an exclude,
  // removed them. Norwegian: `flavour` plus the Norwegian words `som` and
  // `alle`, which typos itself flags as English typos — the exact class the
  // classifier exists for. Data: `recieve` embedded in a 30+ character run.
  // Pattern: `ublish` in the fixture .gitignore's `*.[Pp]ublish.xml`.
  codeClassified: { norwegian: 3, data: 1, pattern: 1 },
  structure: [
    "missing key 'planted.missing_in_nn'",
    "'planted.empty_in_nb' is empty",
    "'planted.param_mismatch' interpolates",
    "'planted.duplicate' is defined 2 times",
    // fixtures/keys.txt: planted.empty_ok is declared and must NOT appear
    // above; the ghost entry matches nothing and must read as stale.
    "@empty for 'planted.ghost_empty'",
  ],
  coverage: ['unregistered.nb.json'],
  coverageDrift: [
    'README.md', // registered but not excluded by typos.toml → drift
    'ghost-does-not-exist.json', // registered but not tracked
    'never-matches', // out-of-scope rule that exempts nothing
  ],
  en: [
    '`color` should be `colour`',
    '`organization` should be `organisation`',
    '`recieve` should be `receive`',
    "key of 'planted.colour_key'",
    // fixtures/keys.txt: planted.organisation_key_ok is a declared key
    // contract and must NOT appear above; the ghost entry must read as stale.
    "@key-contract for 'planted.ghost_key'",
  ],
  // planted.nynorsk_ok re-routes its nb value to the nn pipeline via
  // fixtures/keys.txt — 'eg'/'ikkje' appearing under nb here would mean the
  // re-route silently stopped working.
  no: ["nb: 'Gateadrese'", "nn: 'Gateadrese'"],
};
