/**
 * A risk of deploying a release to an environment, from the version of the app libraries on each side.
 * - `upgradeToV9`: the release uses v9 or later, and the environment runs an older major.
 * - `rollbackFromV9`: the release uses an older major than v9, and the environment runs v9 or later.
 * - `prereleaseToProduction`: the release uses a prerelease, and the environment is production.
 */
export type DeployWarning = 'upgradeToV9' | 'rollbackFromV9' | 'prereleaseToProduction';

/** What the user should know before deploying a release to an environment. */
export interface DeployWarnings {
  warnings: DeployWarning[];
  /** Null when the version is not a literal in the release's App.csproj, so the warnings that need it are left out. */
  releaseAppLibVersion: string | null;
  /** Null when the app does not run in the environment or did not answer. */
  environmentAppLibVersion: string | null;
}
