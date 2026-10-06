// Directories whose unit tests run with Vitest instead of Jest while the test suite is migrated.
// Jest ignores these directories and Vitest only includes them, so every test runs exactly once.
// Remove this file together with Jest when the last directory has been migrated.
module.exports = ['libs/studio-guard', 'settings'];
