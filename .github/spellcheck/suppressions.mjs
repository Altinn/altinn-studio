/**
 * The suppression registry for the code (en-US) pass: every spelling that
 * typos flags but this repository accepts, each scoped to where it is
 * actually load-bearing and carrying the reason why.
 *
 * This replaces typos.toml's global `extend-identifiers`/`extend-words` and
 * most of its per-directory excludes. Those mechanisms are repo-wide: a bare
 * `organisation` entry also licensed the word in every ADR, comment and
 * future file (measured: 1,132 suppressed findings, ~80% of the old
 * allowlist's effect), and a whole-directory exclude hid real typos as
 * collateral (`decryped` in Fiks, `chekcbox` in e2e). Here, the same
 * misspelling OUTSIDE an entry's scope is still reported — and an entry that
 * no longer matches anything is itself reported as stale, so the registry
 * cannot quietly rot.
 *
 * Entry shape — `token` (the exact word typos reports), `reason`, `kind`,
 * and exactly one scope:
 *   identifiers: [...]     the token is allowed only where the surrounding
 *                          identifier is one of these, anywhere in the repo
 *                          (optionally narrowed with paths)
 *   identifierPart: true   the token is allowed inside any LONGER identifier
 *                          within `paths` — for contract families too big to
 *                          enumerate; the bare word stays enforced
 *   paths: [...]           the token is allowed anywhere in matching files
 *
 * Fixing is preferred to suppressing. Add an entry only for a spelling that
 * genuinely cannot change (someone else's API, a wire contract, foreign-
 * language content the engine cannot classify), and scope it as tightly as
 * the blast data allows.
 */

export const SUPPRESSIONS = [
  // ------------------------------------------------ platform wire contracts
  {
    // Altinn Platform (Storage/Register) spells its DTO members the British
    // way, and our SDK surface is built around them: OrganisationNumber,
    // OrganisationOrPersonIdentifier, GetOrganisationNumber, … 30+ derived
    // identifiers and growing. Enumerating them would churn on every PR, so
    // the whole family is allowed inside identifiers in the contract-adjacent
    // trees. The bare word is NOT suppressed anywhere: prose, comments, docs
    // and any standalone `organisation` variable are enforced, which the old
    // config's bare-word allowlist silently was not (1,132 findings).
    token: 'Organisation',
    identifierPart: true,
    paths: [
      'src/App/backend/**',
      'src/App/frontend/**',
      'src/Designer/backend/**',
      'src/Designer/frontend/**',
      'src/Runtime/localtest/**',
    ],
    kind: 'contract',
    reason:
      'Altinn Platform Storage/Register DTO member spelling, mirrored through the SDK surface',
  },
  {
    token: 'organisation',
    identifierPart: true,
    paths: [
      'src/App/backend/**',
      'src/App/frontend/**',
      'src/Designer/backend/**',
      'src/Designer/frontend/**',
      'src/Runtime/localtest/**',
    ],
    kind: 'contract',
    reason: 'camelCase counterparts of the Storage/Register DTO members (organisationNumber, …)',
  },
  {
    token: 'Organisations',
    identifierPart: true,
    paths: ['src/App/backend/**', 'src/Designer/backend/**', 'src/Runtime/localtest/**'],
    kind: 'contract',
    reason: 'plural identifier forms derived from the same DTO family (OrganisationNumbers, …)',
  },
  {
    token: 'organisations',
    identifierPart: true,
    paths: ['src/App/backend/**', 'src/Designer/backend/**', 'src/Runtime/localtest/**'],
    kind: 'contract',
    reason: 'plural identifier forms derived from the same DTO family',
  },
  {
    token: 'Occured',
    identifiers: ['Occured'],
    paths: ['src/Runtime/localtest/**', 'src/App/backend/**'],
    kind: 'contract',
    reason: 'Altinn.Platform.Storage.Interface ProcessElementInfo.Occured wire property',
  },
  {
    token: 'Submited',
    identifiers: ['Submited'],
    paths: ['src/App/backend/**', 'src/Runtime/localtest/**'],
    kind: 'contract',
    reason: 'Storage InstanceEventType.Submited enum member (instance event wire value)',
  },
  {
    token: 'submited',
    identifiers: ['submited'],
    paths: ['src/Runtime/localtest/**'],
    kind: 'contract',
    reason: 'doc comments quoting the submited instance-event wire value in query examples',
  },
  {
    token: 'Contributers',
    identifiers: ['AllowedContributers', 'allowedContributers'],
    kind: 'contract',
    reason: 'Storage application metadata wire field',
  },
  {
    token: 'Analysers',
    identifiers: ['EnabledFileAnalysers', 'enabledFileAnalysers'],
    kind: 'contract',
    reason: 'Storage application metadata wire field',
  },
  {
    token: 'Analyser',
    identifiers: ['mimeTypeAnalyser', 'enabledFileAnalysers'],
    kind: 'contract',
    reason: 'file-analyzer id that deployed apps reference by name',
  },
  {
    token: 'Unvalidate',
    identifiers: ['GetDecisionForUnvalidateRequest'],
    paths: ['src/App/backend/**'],
    kind: 'contract',
    reason: 'Altinn.Common.PEP method name (external package)',
  },
  {
    token: 'Behaviour',
    identifiers: ['autoSaveBehaviour'],
    kind: 'contract',
    reason: 'deprecated layout-settings alias apps still have on disk; see AutoSaveBehaviorLegacy',
  },
  {
    token: 'Exhange',
    identifiers: ['ExhangeToAltinnToken'],
    kind: 'contract',
    reason: 'MaskinportenSettings member name apps configure by key',
  },
  {
    token: 'periode',
    identifiers: ['periodeFritekst'],
    paths: ['src/App/frontend/**'],
    kind: 'test-fixture',
    reason: 'Norwegian data-model field path used as a binding in tests',
  },

  // ------------------------------------------------------- external names
  {
    token: 'Elipsis',
    identifiers: ['MenuElipsisVerticalIcon', 'MenuElipsisHorizontalIcon'],
    kind: 'external-name',
    reason: '@navikt/aksel-icons export names',
  },
  {
    token: 'Labelled',
    identifiers: ['ariaLabelledBy', 'AriaLabelledBy', 'hasAriaLabelledBy'],
    kind: 'external-name',
    reason: 'mirrors the W3C aria-labelledby attribute',
  },
  {
    token: 'labelled',
    identifiers: ['labelledById', 'labelledby', 'ariaLabelledBy'],
    kind: 'external-name',
    reason: 'mirrors the W3C aria-labelledby attribute',
  },
  {
    token: 'Vertexes',
    paths: ['src/Runtime/devenv/pkg/container/dockerapi/**'],
    kind: 'external-name',
    reason: 'BuildKit SolveStatus field name',
  },
  {
    token: 'vertexes',
    paths: ['src/Runtime/devenv/pkg/container/dockerapi/**'],
    kind: 'external-name',
    reason: 'BuildKit SolveStatus field name',
  },
  {
    token: 'axe',
    identifiers: ['injectAxe', 'axeCorePath'],
    paths: ['**/cypress.config.js', '**/testing/cypress/**'],
    kind: 'external-name',
    reason: 'axe-core accessibility tooling (cypress-axe)',
  },
  {
    token: 'axe',
    paths: ['**/cypress.config.js', '**/testing/cypress/**'],
    kind: 'external-name',
    reason: 'bare axe-core references in cypress support files',
  },
  {
    token: 'Axe',
    identifiers: ['injectAxe'],
    paths: ['**/cypress.config.js', '**/testing/cypress/**'],
    kind: 'external-name',
    reason: 'cypress-axe export',
  },

  // ------------------------------------------------------ codes and slugs
  {
    token: 'als',
    paths: [
      'src/App/azure-pipelines/**',
      'src/Designer/backend/src/Designer/Configuration/**',
      'src/Designer/backend/tests/**',
      'src/Designer/development/setup.js',
    ],
    kind: 'code-slug',
    reason: 'Altinn service-owner org slug used as config/test values',
  },
  {
    token: 'Als',
    paths: ['src/Designer/backend/tests/**'],
    kind: 'code-slug',
    reason: 'the als org slug in test method names (OnlyAlsTemplates…)',
  },
  {
    token: 'acn',
    paths: ['src/runner-org-sync/**'],
    kind: 'code-slug',
    reason: 'Altinn org slug in runner-org-sync test fixtures',
  },
  {
    token: 'ACN',
    paths: ['src/runner-org-sync/**', 'src/AI/agents/**'],
    kind: 'code-slug',
    reason: 'Altinn org slug (uppercased) in fixtures and policy data',
  },
  {
    token: 'AKS',
    paths: ['charts/**', 'infra/**', 'src/**'],
    kind: 'code-slug',
    reason: 'Azure Kubernetes Service, in infra config and the code that talks to it',
  },
  {
    token: 'aks',
    paths: ['charts/**', 'infra/**', 'src/**'],
    kind: 'code-slug',
    reason: 'Azure Kubernetes Service, in resource names and contexts',
  },
  {
    token: 'caf',
    paths: ['**/MimeTypeMap.cs'],
    kind: 'code-slug',
    reason: 'file extension in the MIME type map',
  },
  {
    token: 'itms',
    paths: ['**/MimeTypeMap.cs'],
    kind: 'code-slug',
    reason: 'the itms:// scheme entry in the MIME type map',
  },
  {
    token: 'mak',
    paths: ['**/MimeTypeMap.cs'],
    kind: 'code-slug',
    reason: 'file extension in the MIME type map',
  },
  {
    token: 'odf',
    paths: ['**/MimeTypeMap.cs'],
    kind: 'code-slug',
    reason: 'OpenDocument file extension in the MIME type map',
  },
  {
    token: 'thn',
    paths: ['**/MimeTypeMap.cs'],
    kind: 'code-slug',
    reason: 'file extension in the MIME type map',
  },
  {
    token: 'JOD',
    paths: ['src/App/frontend/src/codegen/**'],
    kind: 'code-slug',
    reason: 'ISO 4217 currency code (Jordanian dinar) in generated-schema source data',
  },
  {
    token: 'fpr',
    paths: ['src/Runtime/pdf3/**'],
    kind: 'code-slug',
    reason: 'gpg --with-colons fingerprint field selector',
  },
  {
    token: 'ba',
    paths: [
      'src/App/backend/Makefile',
      '**/BotAccounts/**',
      '**/FilePath/FilePathUtils.test.ts',
      '**/AttachmentWithTagSummaryComponent.test.tsx',
    ],
    kind: 'code-slug',
    reason: 'botAccount shorthand, and ba inside git SHAs in test fixtures',
  },
  {
    token: 'Ba',
    paths: ['src/Runtime/operator/config/**'],
    kind: 'code-slug',
    reason: 'part of a base64 value in local operator config',
  },
  {
    token: 'BA',
    paths: ['**/test-data/textResourcesMock.ts', 'src/AI/mcp/**'],
    kind: 'code-slug',
    reason: 'ISO 3166 country code (Bosnia and Herzegovina) in mock data and docs dumps',
  },
  {
    token: 'OCE',
    paths: ['src/Runtime/workflow-engine/tests/**'],
    kind: 'code-slug',
    reason: 'OperationCanceledException shorthand in test method names',
  },

  // -------------------------------------------------- deliberate test input
  {
    token: 'tru',
    paths: ['**/StudioExpression/StudioExpression.test.tsx'],
    kind: 'test-fixture',
    reason: 'a deliberately invalid expression under test',
  },
  {
    token: 'abd',
    paths: ['src/cli/internal/ui/**'],
    kind: 'test-fixture',
    reason: 'expected output of backspace handling on "abc\\bd"',
  },
  {
    token: 'ue',
    paths: ['src/App/frontend/src/features/formData/useDataModelBindings.test.tsx'],
    kind: 'test-fixture',
    reason: 'second half of typing "true" into an input, asserted mid-keystroke',
  },
  {
    token: 'erro',
    paths: ['src/App/backend/test/Altinn.App.Tests.Common/**'],
    kind: 'test-fixture',
    reason: '4-char log-level column: trac/debu/info/warn/erro',
  },
  {
    token: 'Adedd',
    paths: ['src/tools/releaser/**'],
    kind: 'test-fixture',
    reason: 'fixture for a changelog test named "typo in category"',
  },
  {
    token: 'Maake',
    paths: ['src/Designer/backend/tests/**'],
    kind: 'test-fixture',
    reason: 'expected å→aa transliteration output',
  },
  {
    token: 'Selv',
    identifiers: ['SelvRegistrert'],
    paths: ['src/App/backend/test/**'],
    kind: 'test-fixture',
    reason: 'real self-identified username in the Altinn test environment',
  },
  {
    token: 'Statistisk',
    paths: ['src/App/codelists/**'],
    kind: 'test-fixture',
    reason: '"Statistisk sentralbyrå" named in the codelists docs',
  },

  // ------------------------- foreign-language content in otherwise-English code
  // These directories were previously excluded wholesale, which also hid real
  // typos (decryped, chekcbox, becuase, inernal, …). Now only the measured
  // foreign tokens are accepted, and only there.
  {
    token: 'Registrering',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**'],
    kind: 'foreign-language',
    reason: 'KS.Fiks.Arkiv Norwegian model names',
  },
  {
    token: 'registrering',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**'],
    kind: 'foreign-language',
    reason: 'KS.Fiks.Arkiv Norwegian model names',
  },
  {
    token: 'Dokument',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**'],
    kind: 'foreign-language',
    reason: 'KS.Fiks.Arkiv Norwegian model names',
  },
  {
    token: 'Som',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**'],
    kind: 'foreign-language',
    reason: 'KS.Fiks SvarPaaForespoersel/Som* Norwegian member names',
  },
  {
    token: 'Passord',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**', '**/testing/playwright/pages/**'],
    kind: 'foreign-language',
    reason: 'Norwegian for password: Fiks integration points and Gitea UI selectors',
  },
  {
    token: 'passord',
    paths: ['src/App/backend/**/Altinn.App.Clients.Fiks*/**'],
    kind: 'foreign-language',
    reason: 'Norwegian for password in Fiks model members',
  },
  {
    token: 'Authorisation',
    paths: ['src/cli/**/Upgrade/**', '**/CHANGELOG.md'],
    kind: 'contract',
    reason:
      'the v8 API really was named Authorisation; the upgrade tooling matches it to rewrite it, and release notes describe it',
  },
  {
    token: 'authorisation',
    paths: ['src/cli/**/Upgrade/**', '**/CHANGELOG.md', '**/StudioTable*Pagination/**'],
    kind: 'contract',
    reason: 'v8 API names in upgrade tooling and changelogs; sample data in pagination stories',
  },
  {
    token: 'Organisation',
    paths: ['src/cli/**/Upgrade/**'],
    kind: 'contract',
    reason: 'v8 API names the upgrade tooling matches in order to rewrite them',
  },
  {
    token: 'Labour',
    paths: ['**/StudioTable*Pagination/**'],
    kind: 'external-name',
    reason: 'official English name of a Norwegian ministry, used as sample table data',
  },
  {
    token: 'ist',
    paths: ['**/Altinn3LibraryProvider/**'],
    kind: 'foreign-language',
    reason: 'German fixture content',
  },
  {
    token: 'ein',
    paths: ['**/Altinn3LibraryProvider/**'],
    kind: 'foreign-language',
    reason: 'German fixture content',
  },
  {
    token: 'Sie',
    paths: ['**/Altinn3LibraryProvider/**'],
    kind: 'foreign-language',
    reason: 'German fixture content',
  },
  {
    token: 'Adresse',
    paths: ['**/Services/Tenor/**'],
    kind: 'foreign-language',
    reason: 'Norwegian field names in Tenor test-person data',
  },
  {
    token: 'adresse',
    paths: ['**/Services/Tenor/**', '**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian field names in Tenor data and e2e selectors',
  },
  {
    token: 'hel',
    paths: ['**/Services/Tenor/**'],
    kind: 'foreign-language',
    reason: 'Norwegian in Tenor test-person data',
  },
  {
    token: 'Hel',
    paths: ['**/Services/Tenor/**'],
    kind: 'foreign-language',
    reason: 'Norwegian in Tenor test-person data',
  },
  // Cypress e2e specs assert against the Norwegian UI the test apps render.
  // Only the Norwegian words are accepted — the twelve English typos this
  // exclude used to hide (chekcbox, becuase, …) are now reported.
  {
    token: 'modell',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian UI text asserted by e2e specs',
  },
  {
    token: 'Generell',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian UI text asserted by e2e specs',
  },
  {
    token: 'juli',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian month name in e2e date assertions',
  },
  {
    token: 'Gitar',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian sample data (guitar) in e2e specs',
  },
  {
    token: 'Filtype',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian UI text asserted by e2e specs',
  },
  {
    token: 'Virtuell',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian UI text asserted by e2e specs',
  },
  {
    token: 'Maks',
    paths: ['**/test/e2e/**'],
    kind: 'foreign-language',
    reason: 'Norwegian UI text asserted by e2e specs',
  },
  {
    token: 'Organisation',
    paths: ['**/test/e2e/**'],
    kind: 'contract',
    reason: 'test-app data mirroring the Storage DTO spelling',
  },
  {
    token: 'organisation',
    paths: ['**/test/e2e/**'],
    kind: 'contract',
    reason: 'test-app data mirroring the Storage DTO spelling',
  },
  {
    token: 'Favourite',
    paths: ['**/testing/playwright/pages/**'],
    kind: 'external-name',
    reason: 'selector against Gitea UI text',
  },
  {
    token: 'favourite',
    paths: ['**/testing/playwright/pages/**'],
    kind: 'external-name',
    reason: 'selector against Gitea UI text',
  },
  {
    token: 'modelling',
    paths: ['**/testing/playwright/pages/**'],
    kind: 'external-name',
    reason: 'selector against Studio UI route names (data modelling pages)',
  },
  {
    token: 'som',
    paths: ['**/*.stories.tsx', '**/MergeConflictWarning/**'],
    kind: 'foreign-language',
    reason: 'Norwegian sample content in Storybook stories and JSX text nodes',
  },
  {
    token: 'tekst',
    paths: ['**/*.stories.tsx'],
    kind: 'foreign-language',
    reason: 'Norwegian sample content in Storybook stories',
  },
  {
    token: 'dokument',
    paths: ['**/*.stories.tsx'],
    kind: 'foreign-language',
    reason: 'Norwegian sample content in Storybook stories',
  },
  {
    token: 'designet',
    paths: ['**/AddItem/ToggleAddComponentPoc.tsx'],
    kind: 'foreign-language',
    reason: 'Norwegian JSX text node',
  },
  {
    token: 'ned',
    paths: ['**/AddItem/ToggleAddComponentPoc.tsx', '**/DownloadXMLButton/DownloadXMLButton.tsx'],
    kind: 'foreign-language',
    reason: 'Norwegian JSX text nodes',
  },
  {
    token: 'Noen',
    paths: ['**/MergeConflictWarning/**'],
    kind: 'foreign-language',
    reason: 'Norwegian JSX text node',
  },
  {
    token: 'appen',
    paths: ['**/MergeConflictWarning/**'],
    kind: 'foreign-language',
    reason: 'Norwegian JSX text node',
  },
];
