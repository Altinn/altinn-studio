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

const LANG = '.github/spellcheck/selftest/fixtures/lang';

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

export const EXPECTED = {
  // Production typos.toml over copies of fixtures/code/ placed outside the
  // excluded selftest path.
  code: [
    '`recieve` should be `receive`',
    '`colour` should be `color`',
    '`behaviour` should be `behavior`',
    '`recieved` should be `received`',
  ],
  structure: [
    "missing key 'planted.missing_in_nn'",
    "'planted.empty_in_nb' is empty",
    "'planted.param_mismatch' interpolates",
  ],
  coverage: ['unregistered.nb.json'],
  en: [
    '`color` should be `colour`',
    '`organization` should be `organisation`',
    '`recieve` should be `receive`',
    "key of 'planted.colour_key'",
  ],
  no: ["nb: 'Gateadrese'", "nn: 'Gateadrese'"],
};
