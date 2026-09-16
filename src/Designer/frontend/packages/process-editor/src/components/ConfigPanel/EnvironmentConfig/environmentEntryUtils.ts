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
 * How the runtime folds several entries resolving to the same environment into the one value it
 * reads. A field that omits it is a last-one-wins field, which is what
 * `AltinnTaskExtension.GetConfigForEnvironment` does for every `altinn:` config list but one: it
 * assigns `lookup[key] = candidate`. eFormidling `dataTypes` is the exception -
 * `AltinnEFormidlingConfiguration.GetDataTypesForEnvironment` calls `existingList.AddRange`, so its
 * entries concatenate. The semantics belong to the field, so each one states its own rather than
 * having the core guess from the value type.
 */
export type CombineDuplicateValues<TValue> = (values: TValue[]) => TValue;

export type ResolvedEnvironmentEntries<TValue> = {
  /** The entry without an `env`, if any. */
  global?: EnvironmentEntry<TValue>;
  /** At most one entry per bucket, in `altinnEnvironments` order. */
  overrides: EnvironmentOverride<TValue>[];
  /** Entries whose `env` the runtime resolves to `Unknown`. Warned about, carried through as they are. */
  unknownEntries: EnvironmentEntry<TValue>[];
  /**
   * The entries of a bucket that are not the one carrying its effective value: in a last-one-wins
   * field every entry a later one shadows, and in a combining field every entry whose value was
   * folded into the effective one. Warned about either way, and carried through as they are - the
   * file may legitimately contain what this UI cannot show, and an edit elsewhere is not permission
   * to delete it.
   */
  duplicateEntries: EnvironmentEntry<TValue>[];
};

/**
 * Which row an entry belongs to, or `undefined` when the runtime resolves its `env` to `Unknown`.
 */
export const getEntryScope = <TValue>(
  entry: EnvironmentEntry<TValue>,
): EnvironmentScope | undefined => {
  const env = entry.env ?? '';
  return isGlobalEnv(env) ? globalScope : normalizeAltinnEnvironment(env);
};

/**
 * Folds a raw entry list into the shape the editor shows, the same way the runtime does: entries
 * are keyed by bucket, and the value of a bucket is the last entry's unless the field combines them
 * (see `CombineDuplicateValues`). Showing anything else would make the panel disagree with the app.
 */
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

export type EnvironmentWriteOptions = {
  /**
   * The `env` spelling to reuse for a new entry, from the entry a clear just removed. Without it,
   * clearing a row and typing a new value rewrites `tt02` to `staging` - a diff the user did not
   * ask for, in a file that lives in git.
   */
  clearedEnv?: string;
  /**
   * Whether the field combines duplicates rather than letting the last entry win. When it does, the
   * written entry carries the combined value the user just edited, so the other entries of that
   * bucket have to go: leaving them would add their values to it a second time.
   *
   * This is consolidation rather than deletion. The runtime reads exactly what it read before, the
   * value is still there in full, and it happens only to the one field the user is editing - which
   * is why it does not break the rule that an edit never drops a line, the way removing a genuinely
   * inert shadowed entry would.
   */
  consolidateDuplicates?: boolean;
};

/**
 * Sets the value for one scope.
 *
 * The entry is edited where it stands and every other entry is carried through unchanged, in its
 * original position - including one the runtime shadows and one whose `env` the runtime cannot
 * resolve. Editing one row must never remove or move a line the user did not touch: this editor
 * has a history of deleting configuration it did not understand, and the diff of a save should
 * show only what the user actually changed. A new entry is appended, which is a pure addition.
 *
 * "Unchanged" here is about `env` and `value`, which is all an `EnvironmentEntry` holds. The moddle
 * conversions hand back a matching existing element for such an entry - the one it came from, or an
 * indistinguishable sibling where the file repeats a pair - so anything else that element carries
 * survives the round trip too.
 */
export const withEnvironmentValue = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
  value: TValue,
  { clearedEnv, consolidateDuplicates }: EnvironmentWriteOptions = {},
): EnvironmentEntry<TValue>[] => {
  const index = findWinningEntryIndex(entries, scope);
  if (index === -1) return [...entries, createEntry(scope, value, clearedEnv)];
  const updatedEntries = entries.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, value } : entry,
  );
  if (!consolidateDuplicates) return updatedEntries;
  return updatedEntries.filter(
    (entry, entryIndex) => entryIndex === index || getEntryScope(entry) !== scope,
  );
};

/**
 * Removes the configuration for one scope.
 *
 * Every entry resolving to that scope goes, not only the one the runtime reads. Removing just the
 * winner would promote a shadowed duplicate the user cannot see, leaving the override silently in
 * place. This is the one place an entry is deleted, and it is the user asking for exactly that.
 */
export const withoutEnvironmentValue = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): EnvironmentEntry<TValue>[] => entries.filter((entry) => getEntryScope(entry) !== scope);

/** The entry carrying the value the runtime reads for one scope. */
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

/**
 * A newly written entry is spelled with the canonical environment name, unless a clear just removed
 * one that spelled the same environment differently - that spelling is the user's, not ours.
 */
const createEntry = <TValue>(
  scope: EnvironmentScope,
  value: TValue,
  clearedEnv?: string,
): EnvironmentEntry<TValue> => {
  if (scope === globalScope) return { value };
  const isReusable = !!clearedEnv && normalizeAltinnEnvironment(clearedEnv) === scope;
  return { env: isReusable ? clearedEnv : scope, value };
};

/** The runtime reads the last entry resolving to a scope, so that is the one an edit changes. */
const findWinningEntryIndex = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  scope: EnvironmentScope,
): number =>
  entries.reduce(
    (winningIndex, entry, index) => (getEntryScope(entry) === scope ? index : winningIndex),
    -1,
  );

export const findOverrideEntry = <TValue>(
  resolved: ResolvedEnvironmentEntries<TValue>,
  environment: AltinnEnvironment,
): EnvironmentEntry<TValue> | undefined =>
  resolved.overrides.find((override) => override.environment === environment)?.entry;

/** What the collapsed property button shows. Kept free of i18n so the rules are unit-testable. */
export type EnvironmentConfigSummary =
  | { kind: 'empty' }
  | { kind: 'globalOnly'; value: string }
  | { kind: 'overridesOnly'; overrideCount: number }
  | { kind: 'globalWithOverrides'; value: string; overrideCount: number };

export const getEnvironmentConfigSummary = <TValue>(
  resolved: ResolvedEnvironmentEntries<TValue>,
  formatValue: (value: TValue) => string,
): EnvironmentConfigSummary => {
  const overrideCount = resolved.overrides.length;
  const value = resolved.global ? formatValue(resolved.global.value) : '';
  if (!value) {
    return overrideCount === 0 ? { kind: 'empty' } : { kind: 'overridesOnly', overrideCount };
  }
  return overrideCount === 0
    ? { kind: 'globalOnly', value }
    : { kind: 'globalWithOverrides', value, overrideCount };
};

const environmentScopeTextKeys: Readonly<Record<EnvironmentScope, string>> = {
  global: 'process_editor.configuration_panel.environment_config.scope_global',
  development: 'process_editor.configuration_panel.environment_config.scope_development',
  staging: 'process_editor.configuration_panel.environment_config.scope_staging',
  production: 'process_editor.configuration_panel.environment_config.scope_production',
};

export const getEnvironmentScopeTextKey = (scope: EnvironmentScope): string =>
  environmentScopeTextKeys[scope];
