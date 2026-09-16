import type { AltinnEnvironment } from './altinnEnvironments';

/**
 * One `<altinn:…>` element of an environment-scoped configuration list, as plain data.
 *
 * `env` is kept verbatim so that saving an unrelated row does not rewrite `tt02` to `staging` and
 * produce a semantically null diff in a file that lives in git.
 */
export type EnvironmentEntry<TValue = string> = {
  /** Missing or blank means the entry applies to every environment without an override. */
  env?: string;
  value: TValue;
};

export const globalScope = 'global';

/** The rows the editor can show: the environment-independent value plus the three buckets. */
export type EnvironmentScope = typeof globalScope | AltinnEnvironment;
