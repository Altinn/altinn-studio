/**
 * Mirrors `Altinn.App.Core/Constants/AltinnEnvironments.cs`: the runtime folds every `env`
 * attribute into one of three environments, case-insensitively, and treats anything else as
 * unknown. Keep the two tables in sync.
 */
export type AltinnEnvironment = 'development' | 'staging' | 'production';

export const altinnEnvironments: readonly AltinnEnvironment[] = [
  'development',
  'staging',
  'production',
];

const environmentAliases: Readonly<Record<AltinnEnvironment, readonly string[]>> = {
  development: ['development', 'dev', 'local', 'localtest'],
  staging: ['staging', 'test', 'at22', 'at23', 'at24', 'tt02', 'yt01'],
  production: ['production', 'prod', 'produksjon'],
};

export const normalizeAltinnEnvironment = (env: string): AltinnEnvironment | undefined => {
  const lowerCasedEnv = env.toLowerCase();
  return altinnEnvironments.find((environment) =>
    environmentAliases[environment].includes(lowerCasedEnv),
  );
};

/** The runtime reads a missing or blank `env` as the entry that applies to every environment. */
export const isGlobalEnv = (env: string | undefined): boolean => !env?.trim();
