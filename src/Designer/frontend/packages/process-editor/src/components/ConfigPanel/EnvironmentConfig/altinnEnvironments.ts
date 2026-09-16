/**
 * TypeScript mirror of the app runtime's environment table.
 *
 * Source of truth: `Altinn.App.Core/Constants/AltinnEnvironments.cs:9-35`. The runtime folds every
 * `env` attribute in the BPMN into one of three buckets, case-insensitively, and resolves anything
 * it does not recognize to `Unknown`. An `Unknown` entry is not quite dead: `GetHostingEnvironment`
 * answers `Unknown` for an unrecognized *deployment* name too, so such an entry applies to an app
 * running under a deployment name the runtime does not know either - and there it shadows the
 * environment-independent entry. No Altinn deployment is named that way today, which is why the
 * editor treats these entries as unusable rather than as a fourth bucket.
 *
 * Keep this table in sync with the C# one; drift lets Studio offer configuration the runtime throws
 * away. `altinnEnvironments.test.ts` parses the C# file and fails when the two disagree.
 */
export type AltinnEnvironment = 'development' | 'staging' | 'production';

/** The order overrides are presented and written in. */
export const altinnEnvironments: readonly AltinnEnvironment[] = [
  'development',
  'staging',
  'production',
];

/**
 * The `env` strings each bucket accepts. The bucket name is itself the first accepted alias, and is
 * the canonical name Studio writes for a newly added override.
 *
 * Exported for the drift test only - callers resolve an `env` through
 * {@link normalizeAltinnEnvironment} rather than reading the table.
 */
export const environmentAliases: Readonly<Record<AltinnEnvironment, readonly string[]>> = {
  development: ['development', 'dev', 'local', 'localtest'],
  staging: ['staging', 'test', 'at22', 'at23', 'at24', 'tt02', 'yt01'],
  production: ['production', 'prod', 'produksjon'],
};

/**
 * Resolves a raw `env` attribute to the bucket the runtime resolves it to, or `undefined` when the
 * runtime would resolve it to `Unknown`.
 */
export const normalizeAltinnEnvironment = (env: string): AltinnEnvironment | undefined => {
  const lowerCasedEnv = env.toLowerCase();
  return altinnEnvironments.find((environment) =>
    environmentAliases[environment].includes(lowerCasedEnv),
  );
};

/**
 * The runtime treats a missing or blank `env` as the entry that applies to every environment
 * without an override of its own (`AltinnTaskExtension.GetConfigForEnvironment`).
 */
export const isGlobalEnv = (env: string | undefined): boolean => !env?.trim();
