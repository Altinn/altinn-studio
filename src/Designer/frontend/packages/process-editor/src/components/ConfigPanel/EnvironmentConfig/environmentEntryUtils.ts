import { ArrayUtils } from '@studio/pure-functions';
import type { AltinnEnvironment } from './altinnEnvironments';
import { altinnEnvironments, isGlobalEnv, normalizeAltinnEnvironment } from './altinnEnvironments';
import type { EnvironmentEntry, EnvironmentScope } from './types';
import { globalScope } from './types';

export type EnvironmentOverride<TValue> = {
  environment: AltinnEnvironment;
  entry: EnvironmentEntry<TValue>;
};

/**
 * How the runtime folds several entries resolving to the same environment. Left out for a
 * last-one-wins field, which is every `altinn:` config list except eFormidling `dataTypes`, where
 * `AltinnEFormidlingConfiguration.GetDataTypesForEnvironment` concatenates them.
 */
export type CombineDuplicateValues<TValue> = (values: TValue[]) => TValue;

export type ResolvedEnvironmentEntries<TValue> = {
  global?: EnvironmentEntry<TValue>;
  /** At most one entry per environment, in `altinnEnvironments` order. */
  overrides: EnvironmentOverride<TValue>[];
  /** Entries whose `env` the runtime does not recognize. */
  unknownEntries: EnvironmentEntry<TValue>[];
  /** Entries the runtime shadows with, or folds into, a later entry of the same environment. */
  duplicateEntries: EnvironmentEntry<TValue>[];
};

export const getEntryScope = <TValue>(
  entry: EnvironmentEntry<TValue>,
): EnvironmentScope | undefined => {
  const env = entry.env ?? '';
  return isGlobalEnv(env) ? globalScope : normalizeAltinnEnvironment(env);
};

/** Folds a raw entry list into what the runtime reads per environment. */
export const resolveEnvironmentEntries = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  combineDuplicateValues?: CombineDuplicateValues<TValue>,
): ResolvedEnvironmentEntries<TValue> => {
  const unknownEntries: EnvironmentEntry<TValue>[] = [];
  const entriesByScope = new Map<EnvironmentScope, EnvironmentEntry<TValue>[]>();

  entries.forEach((entry) => {
    const scope = getEntryScope(entry);
    if (!scope) {
      unknownEntries.push(entry);
      return;
    }
    entriesByScope.set(scope, [...(entriesByScope.get(scope) ?? []), entry]);
  });

  const globalEntries = entriesByScope.get(globalScope);

  return {
    global: globalEntries && getEffectiveEntry(globalEntries, combineDuplicateValues),
    overrides: altinnEnvironments
      .filter((environment) => entriesByScope.has(environment))
      .map((environment) => ({
        environment,
        entry: getEffectiveEntry(entriesByScope.get(environment), combineDuplicateValues),
      })),
    unknownEntries,
    duplicateEntries: [...entriesByScope.values()].flatMap((scopeEntries) =>
      ArrayUtils.removeLast(scopeEntries),
    ),
  };
};

/**
 * Sets the value for one scope. The entry the runtime reads is edited in place and every other
 * entry is left where it stands, so a save changes nothing the user did not touch. A new entry is
 * appended. When the field combines duplicates, the other entries of the scope are folded into the
 * edited one, since the edited value already contains them.
 */
export const withEnvironmentValue = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
  value: TValue,
  combineDuplicates: boolean = false,
): EnvironmentEntry<TValue>[] => {
  const index = findWinningEntryIndex(entries, scope);
  if (index === -1) return [...entries, createEntry(scope, value)];
  const updatedEntries = entries.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, value } : entry,
  );
  if (!combineDuplicates) return updatedEntries;
  return updatedEntries.filter(
    (entry, entryIndex) => entryIndex === index || getEntryScope(entry) !== scope,
  );
};

/** Removes every entry resolving to the scope, so that a shadowed duplicate cannot take over. */
export const withoutEnvironmentValue = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): EnvironmentEntry<TValue>[] => entries.filter((entry) => getEntryScope(entry) !== scope);

/** Removes one entry by identity, which is how an entry with an unknown `env` is removed. */
export const withoutEntry = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  entryToRemove: EnvironmentEntry<TValue>,
): EnvironmentEntry<TValue>[] => entries.filter((entry) => entry !== entryToRemove);

const getEffectiveEntry = <TValue>(
  scopeEntries: EnvironmentEntry<TValue>[],
  combineDuplicateValues?: CombineDuplicateValues<TValue>,
): EnvironmentEntry<TValue> => {
  const winningEntry = ArrayUtils.last(scopeEntries);
  if (!combineDuplicateValues || scopeEntries.length === 1) return winningEntry;
  return {
    ...winningEntry,
    value: combineDuplicateValues(scopeEntries.map((entry) => entry.value)),
  };
};

const createEntry = <TValue>(scope: EnvironmentScope, value: TValue): EnvironmentEntry<TValue> =>
  scope === globalScope ? { value } : { env: scope, value };

/** The runtime reads the last entry resolving to a scope, so that is the one an edit changes. */
const findWinningEntryIndex = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): number =>
  entries.reduce(
    (winningIndex, entry, index) => (getEntryScope(entry) === scope ? index : winningIndex),
    -1,
  );

/** The value the app reads in one environment: its override, else the environment-independent entry. */
export const getEffectiveEnvironmentValue = <TValue>(
  resolved: ResolvedEnvironmentEntries<TValue>,
  environment: AltinnEnvironment,
): TValue | undefined => (findOverrideEntry(resolved, environment) ?? resolved.global)?.value;

export const findOverrideEntry = <TValue>(
  resolved: ResolvedEnvironmentEntries<TValue>,
  environment: AltinnEnvironment,
): EnvironmentEntry<TValue> | undefined =>
  resolved.overrides.find((override) => override.environment === environment)?.entry;

export const getUnknownEnvironmentNames = <TValue>(
  resolved: ResolvedEnvironmentEntries<TValue>,
): string[] => ArrayUtils.removeDuplicates(resolved.unknownEntries.map(({ env }) => env));

const environmentScopeTextKeys: Readonly<Record<EnvironmentScope, string>> = {
  global: 'process_editor.configuration_panel.environment_config.scope_global',
  development: 'process_editor.configuration_panel.environment_config.scope_development',
  staging: 'process_editor.configuration_panel.environment_config.scope_staging',
  production: 'process_editor.configuration_panel.environment_config.scope_production',
};

export const getEnvironmentScopeTextKey = (scope: EnvironmentScope): string =>
  environmentScopeTextKeys[scope];
