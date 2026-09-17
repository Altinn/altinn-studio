import type { AltinnEnvironment } from './altinnEnvironments';

/** One element of an environment-scoped `altinn:` configuration list. `env` is kept verbatim. */
export type EnvironmentEntry<TValue = string> = {
  /** Missing or blank means the entry applies to every environment without an override. */
  env?: string;
  value: TValue;
};

export const globalScope = 'global';

export type EnvironmentScope = typeof globalScope | AltinnEnvironment;
