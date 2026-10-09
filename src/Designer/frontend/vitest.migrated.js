// Directories whose unit tests run with Vitest instead of Jest while the test suite is migrated.
// Jest ignores these directories and Vitest only includes them, so every test runs exactly once.
// Remove this file together with Jest when the last directory has been migrated.
module.exports = [
  'admin',
  'app-development',
  'app-preview',
  'dashboard',
  'language',
  'libs/studio-assistant',
  'libs/studio-browser-storage',
  'libs/studio-components',
  'libs/studio-content-library',
  'libs/studio-feature-flags',
  'libs/studio-feedback-form',
  'libs/studio-guard',
  'libs/studio-hooks',
  'libs/studio-icons',
  'libs/studio-pure-functions',
  'libs/studio-ui-test',
  'packages/policy-editor',
  'packages/schema-editor',
  'packages/schema-model',
  'packages/shared',
  'packages/text-editor',
  'resourceadm',
  'settings',
  'studio-root',
];
