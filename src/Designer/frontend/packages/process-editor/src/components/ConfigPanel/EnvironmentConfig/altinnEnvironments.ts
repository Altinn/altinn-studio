/**
 * Match environment names without case sensitivity. Keep these aliases in sync with
 * Altinn.App.Core/Constants/AltinnEnvironments.cs.
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

/** A missing or blank env marks the default entry. */
export const isGlobalEnv = (env: string | undefined): boolean => !env?.trim();
