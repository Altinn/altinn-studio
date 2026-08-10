/**
 * The hunspell dictionaries the Norwegian spell check runs against.
 *
 * These are the LibreOffice Norwegian dictionaries (derived from Norsk
 * Ordbank), pinned to an immutable commit of LibreOffice/dictionaries and
 * verified by SHA-256 on every fetch. The `no/` directory has not changed
 * since 2018, so the pin is stable.
 *
 * The dictionaries are licensed GPL-2.0, which is why they are fetched into a
 * git-ignored cache (.github/spellcheck/.cache/) rather than vendored into
 * this MIT-licensed repository. They are tooling data consumed by hunspell at
 * check time and are not distributed with any product artifact.
 *
 * en_GB is loaded alongside the Norwegian dictionaries so English loanwords
 * in Norwegian UI text ("dashboard", "token") are not reported.
 */

export const DICTIONARY_SOURCE = {
  repository: 'https://github.com/LibreOffice/dictionaries',
  commit: 'f2ff99058268502bdcf4cad25c1ca2935ad8aa7d',
  license: 'GPL-2.0 (dictionaries only; fetched, never committed)',
};

export const DICTIONARY_FILES = {
  'nb_NO.aff': {
    path: 'no/nb_NO.aff',
    sha256: '68265c84eebd06d77031947c6c3e49de4c1e211cfcfed675f8d8dc63517df096',
  },
  'nb_NO.dic': {
    path: 'no/nb_NO.dic',
    sha256: 'b06ec5e56356d97165109abe914f162f1350ebebadfc5f89c2207b6e676c2316',
  },
  'nn_NO.aff': {
    path: 'no/nn_NO.aff',
    sha256: '462705808519ff8f16a91ad8b21001b3e8a5c1cb21747777a91a9877fc2dfdae',
  },
  'nn_NO.dic': {
    path: 'no/nn_NO.dic',
    sha256: 'a2853488ad8696c817a642dafe666d8d7286e8b7bfcbae606d126b61311236ee',
  },
  'en_GB.aff': {
    path: 'en/en_GB.aff',
    sha256: '0fd6ed120ef28957847d98ba5149b117e27116cf81b5aa36208453f6755a36fd',
  },
  'en_GB.dic': {
    path: 'en/en_GB.dic',
    sha256: '04e90f34f5263bf26780e9c4a442e9ad16584e227af49ddd1b3b21b01df5b29c',
  },
};

/** hunspell -d arguments (base path without extension), per language. */
export const DICTIONARY_FOR_LANG = {
  nb: ['nb_NO', 'en_GB'],
  nn: ['nn_NO', 'en_GB'],
};

export const rawUrl = (file) =>
  `https://raw.githubusercontent.com/LibreOffice/dictionaries/${DICTIONARY_SOURCE.commit}/${DICTIONARY_FILES[file].path}`;
