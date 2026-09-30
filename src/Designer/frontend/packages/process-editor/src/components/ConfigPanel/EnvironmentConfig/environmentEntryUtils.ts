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
 * Combines duplicate entries for one environment. eFormidling dataTypes uses concatenation. Omit for
 * scalar fields, where the last entry takes precedence.
 */
export type CombineDuplicateValues<TValue> = (values: TValue[]) => TValue;

export type ResolvedEnvironmentEntries<TValue> = {
  global?: EnvironmentEntry<TValue>;
  /** At most one entry per environment, in `altinnEnvironments` order. */
  overrides: EnvironmentOverride<TValue>[];
  /** Entries whose `env` the runtime does not recognize. */
  unknownEntries: EnvironmentEntry<TValue>[];
  /** Earlier entries replaced or combined with a later entry for the same environment. */
  duplicateEntries: EnvironmentEntry<TValue>[];
};

export const getEntryScope = <TValue>(
  entry: EnvironmentEntry<TValue>,
): EnvironmentScope | undefined => {
  const env = entry.env ?? '';
  return isGlobalEnv(env) ? globalScope : normalizeAltinnEnvironment(env);
};

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
 * Updates the active entry or appends a new one. Preserves other entries and their order. When
 * combining duplicates, removes the earlier entries because the new value already includes them.
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

/** Remove all entries for the scope so an earlier duplicate cannot become active. */
export const withoutEnvironmentValue = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): EnvironmentEntry<TValue>[] => entries.filter((entry) => getEntryScope(entry) !== scope);

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

/** Edit the last matching entry because it takes precedence at runtime. */
const findWinningEntryIndex = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): number =>
  entries.reduce(
    (winningIndex, entry, index) => (getEntryScope(entry) === scope ? index : winningIndex),
    -1,
  );

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
