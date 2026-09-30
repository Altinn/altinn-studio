/**
 * The registry: the ONE place a language file is named.
 *
 * Every file holding user-facing translation text is declared here — which
 * language it holds, how to read it, and which checks apply. The checks in
 * run.mjs consume this table; nothing else lists language files. Two
 * assertions keep the registry honest:
 *
 *   · the coverage check scans the repo with SCAN_PATTERNS and fails on any
 *     match that is neither registered here nor listed in OUT_OF_SCOPE, so a
 *     new language file cannot be silently unchecked;
 *   · the coverage check also fails if the root en-US pass (typos.toml) would
 *     visit a registered file, so this table and typos.toml's excludes cannot
 *     drift apart.
 *
 * Group fields:
 *   name       for reporting
 *   format     how to read the file(s) — see readGroup() in lib.mjs
 *   files      { nb|nn|en: repo-relative path } (single-file formats use
 *              `file` plus format-specific fields instead)
 *   parity     'equal'           every language defines the same keys
 *              'en-subset-of-nb' en is a partial translation by design; every
 *                                en key must still exist in nb, or the
 *                                default-language user is shown a raw key
 *              'none'            nothing to compare (single language)
 *   english    dialect of the en values: 'en-gb' (product text), 'en-us'
 *              (text mimicking an en-US upstream), or null (no en file)
 *   checkKeys  false when the key set is an upstream contract we must not
 *              respell (default true: keys are US-English code contracts)
 *   mayBeEmpty true when zero entries is a legal state, exempting the group
 *              from the did-any-work assertion
 */

export const GROUPS = [
  {
    name: 'app frontend texts',
    format: 'ts-factory',
    files: {
      nb: 'src/common/ts/language/src/texts/nb.ts',
      nn: 'src/common/ts/language/src/texts/nn.ts',
      en: 'src/common/ts/language/src/texts/en.ts',
    },
    parity: 'equal',
    english: 'en-gb',
  },
  {
    // en.json is a partial translation by design: language support for
    // English "is not yet available in the project" and the file "is not
    // maintained" (src/Designer/frontend/AGENTS.md). Keys that exist in en
    // must still exist in nb — Designer always runs with lng 'nb', so a key
    // missing from nb renders as the raw key.
    name: 'Designer frontend',
    format: 'json-flat',
    files: {
      nb: 'src/Designer/frontend/language/src/nb.json',
      en: 'src/Designer/frontend/language/src/en.json',
    },
    parity: 'en-subset-of-nb',
    english: 'en-gb',
  },
  {
    name: 'resourceadm',
    format: 'json-flat',
    files: {
      nb: 'src/Designer/frontend/resourceadm/language/src/nb.json',
      en: 'src/Designer/frontend/resourceadm/language/src/en.json',
    },
    parity: 'en-subset-of-nb',
    english: 'en-gb',
  },
  {
    // An { nb, nn, en } triplet declared inline in code; the rest of
    // constants.js is route constants with no prose. The file is excluded
    // from the root en-US pass, so this entry is what checks its text.
    name: 'Designer default rights description',
    format: 'esm-export',
    file: 'src/Designer/frontend/packages/shared/src/constants.js',
    exportName: 'DEFAULT_RIGHTS_DESCRIPTION',
    parity: 'equal',
    english: 'en-gb',
  },
  {
    name: 'Designer news feed',
    format: 'news',
    files: {
      nb: 'src/Designer/frontend/app-development/features/overview/components/News/NewsContent/news.nb.json',
    },
    parity: 'none',
    english: null,
  },
  // The copy every new app ships with, per template variant: the app title
  // and the rights description shown when delegating access.
  ...['v8', 'v9'].flatMap((variant) => [
    {
      name: `app template metadata (${variant})`,
      format: 'json-paths',
      file: `src/App/template/${variant}/src/App/config/applicationmetadata.json`,
      paths: [
        { path: 'title', langs: ['nb'] },
        { path: 'access.rightDescription', langs: ['nb', 'nn', 'en'] },
      ],
      parity: 'none',
      english: 'en-gb',
    },
    {
      name: `app template texts (${variant})`,
      format: 'text-resource',
      files: { nb: `src/App/template/${variant}/src/App/config/texts/resource.nb.json` },
      parity: 'none',
      english: null,
      mayBeEmpty: true, // ships with "resources": []
    },
  ]),
  {
    // Our 8-key override of Gitea UI strings. Gitea's own UI language is US
    // English, so the en values follow the surrounding product, not ours.
    // The keys belong to Gitea's locale contract.
    name: 'Gitea locale overrides',
    format: 'json-flat',
    files: {
      nb: 'src/gitea/files/locale/custom/locale_nb-NO.json',
      en: 'src/gitea/files/locale/custom/locale_en-US.json',
    },
    parity: 'equal',
    english: 'en-us',
    checkKeys: false,
  },
  {
    // The full Norwegian translation of the Gitea UI (~3800 keys) that
    // Studio ships as "Repositories". Keys are Gitea's, values are ours.
    name: 'Gitea base translation',
    format: 'json-flat',
    files: { nb: 'src/gitea/files/locale/base/locale_nb-NO.json' },
    parity: 'none',
    english: null,
    checkKeys: false,
  },
];

/**
 * Files SCAN_PATTERNS match that deliberately take no part in any check.
 * Every entry needs a reason — an entry without one is a finding.
 */
export const OUT_OF_SCOPE = [
  {
    glob: 'src/test/apps/**',
    reason: 'sample apps used as E2E test targets; their texts are test fixtures',
  },
  {
    glob: 'src/App/backend/test/**',
    reason: 'App backend test data',
  },
  {
    glob: 'src/Designer/backend/tests/**',
    reason:
      'Designer test data, including Gitea API response mocks that share the resource.*.json filename shape',
  },
  {
    glob: 'src/Designer/testdata/**',
    reason: 'Designer test data',
  },
  {
    glob: '**/news.schema.json',
    reason: 'the JSON Schema for the news feed, not the news',
  },
];

/**
 * typos.toml extend-exclude globs that are ALLOWED to match no tracked file.
 * The coverage check fails any dead exclude glob unless it is declared here,
 * and fails a declaration whose glob is live again or gone from the config —
 * so neither the engine excludes nor this list can rot silently. Tracked
 * files are a proxy for what typos actually walks: a glob for gitignored
 * build output matches nothing tracked, yet still does real work in an
 * unclean working tree.
 */
export const PRECAUTIONARY_EXCLUDES = [
  {
    glob: '.git/**',
    reason: 'the git database is never tracked, but typos walks it (ignore-hidden is off)',
  },
  {
    // Not a bare **/bin/**: Rust crates keep real source in src/bin/.
    glob: '**/bin/[Dd]ebug/**',
    reason: 'gitignored .NET build output, present in real working trees',
  },
  {
    glob: '**/bin/[Rr]elease/**',
    reason: 'gitignored .NET build output, present in real working trees',
  },
  {
    glob: '**/obj/**',
    reason: 'gitignored .NET build output, present in real working trees',
  },
  {
    glob: '**/node_modules/**',
    reason: 'gitignored dependencies, present in real working trees',
  },
];

/**
 * Where language files live, by shape. The coverage check runs these over
 * `git ls-files`; anything matched must be registered or in OUT_OF_SCOPE.
 * Inline triplets (constants.js, applicationmetadata.json outside these
 * patterns) cannot be found by glob — they are registry-maintained by hand.
 */
export const SCAN_PATTERNS = [
  'src/common/ts/language/src/texts/*.ts',
  '**/language/src/*.json',
  '**/locale_*.json',
  '**/news.*.json',
  '**/resource.*.json',
  '**/applicationmetadata.json',
];
