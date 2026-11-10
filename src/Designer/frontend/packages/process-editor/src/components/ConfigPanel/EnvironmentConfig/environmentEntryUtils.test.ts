import { describe, expect, it } from 'vitest';
import {
  getEffectiveEnvironmentValue,
  resolveEnvironmentEntries,
  withEnvironmentValue,
  withoutEnvironmentValue,
} from './environmentEntryUtils';
import type { EnvironmentEntry } from './types';

const combineLists = (values: string[][]): string[] => values.flat();

describe('resolveEnvironmentEntries', () => {
  it('separates the default entry from environment overrides', () => {
    const resolved = resolveEnvironmentEntries([
      { value: 'global' },
      { env: 'tt02', value: 'staging' },
    ]);

    expect(resolved.global).toEqual({ value: 'global' });
    expect(resolved.overrides).toEqual([
      { environment: 'staging', entry: { env: 'tt02', value: 'staging' } },
    ]);
  });

  it('sorts overrides by environment regardless of file order', () => {
    const resolved = resolveEnvironmentEntries([
      { env: 'production', value: 'p' },
      { env: 'local', value: 'd' },
      { env: 'tt02', value: 's' },
    ]);

    expect(resolved.overrides.map(({ environment }) => environment)).toEqual([
      'development',
      'staging',
      'production',
    ]);
  });

  it('preserves entries for unknown environments', () => {
    const resolved = resolveEnvironmentEntries([{ env: 'at21', value: 'dead' }]);

    expect(resolved.unknownEntries).toEqual([{ env: 'at21', value: 'dead' }]);
    expect(resolved.overrides).toEqual([]);
  });

  it('uses the last entry when aliases refer to the same environment', () => {
    const resolved = resolveEnvironmentEntries([
      { env: 'tt02', value: 'first' },
      { env: 'at22', value: 'second' },
    ]);

    expect(resolved.overrides).toEqual([
      { environment: 'staging', entry: { env: 'at22', value: 'second' } },
    ]);
    expect(resolved.duplicateEntries).toEqual([{ env: 'tt02', value: 'first' }]);
  });

  it('treats a blank environment name as the default', () => {
    const resolved = resolveEnvironmentEntries([{ env: '  ', value: 'global' }]);

    expect(resolved.global).toEqual({ env: '  ', value: 'global' });
    expect(resolved.overrides).toEqual([]);
  });

  it('combines values for the same environment when a combiner is provided', () => {
    const resolved = resolveEnvironmentEntries<string[]>(
      [
        { env: 'tt02', value: ['a'] },
        { env: 'at22', value: ['b'] },
      ],
      combineLists,
    );

    expect(resolved.overrides).toEqual([
      { environment: 'staging', entry: { env: 'at22', value: ['a', 'b'] } },
    ]);
    expect(resolved.duplicateEntries).toEqual([{ env: 'tt02', value: ['a'] }]);
  });
});

describe('withEnvironmentValue', () => {
  it('preserves the original environment name when updating an override', () => {
    const entries: EnvironmentEntry[] = [{ env: 'tt02', value: 'old' }];

    expect(withEnvironmentValue(entries, 'staging', 'new')).toEqual([
      { env: 'tt02', value: 'new' },
    ]);
  });

  it('uses the standard environment name for a new override', () => {
    expect(withEnvironmentValue([], 'staging', 'new')).toEqual([{ env: 'staging', value: 'new' }]);
  });

  it('adds the default entry without an env attribute', () => {
    expect(withEnvironmentValue([], 'global', 'new')).toEqual([{ value: 'new' }]);
  });

  it('appends a new entry without changing existing entries', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'at21', value: 'unknown' },
      { env: 'production', value: 'p' },
      { value: 'global' },
    ];

    expect(withEnvironmentValue(entries, 'development', 'd')).toEqual([
      { env: 'at21', value: 'unknown' },
      { env: 'production', value: 'p' },
      { value: 'global' },
      { env: 'development', value: 'd' },
    ]);
  });

  it('preserves earlier duplicates when updating the active entry', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'tt02', value: 'shadowed' },
      { env: 'at22', value: 'used' },
    ];

    expect(withEnvironmentValue(entries, 'staging', 'updated')).toEqual([
      { env: 'tt02', value: 'shadowed' },
      { env: 'at22', value: 'updated' },
    ]);
  });

  it('replaces duplicate entries with one combined entry', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'tt02', value: 'a' },
      { value: 'global' },
      { env: 'at22', value: 'b' },
    ];

    expect(withEnvironmentValue(entries, 'staging', 'a,b,c', true)).toEqual([
      { value: 'global' },
      { env: 'at22', value: 'a,b,c' },
    ]);
  });
});

describe('withoutEnvironmentValue', () => {
  it('removes the selected override and preserves other entries', () => {
    const entries: EnvironmentEntry[] = [
      { value: 'global' },
      { env: 'tt02', value: 's' },
      { env: 'at21', value: 'unknown' },
    ];

    expect(withoutEnvironmentValue(entries, 'staging')).toEqual([
      { value: 'global' },
      { env: 'at21', value: 'unknown' },
    ]);
  });

  it('removes the default entry', () => {
    const entries: EnvironmentEntry[] = [{ value: 'global' }, { env: 'tt02', value: 's' }];

    expect(withoutEnvironmentValue(entries, 'global')).toEqual([{ env: 'tt02', value: 's' }]);
  });

  it('removes all entries for the selected environment', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'tt02', value: 'shadowed' },
      { value: 'global' },
      { env: 'at22', value: 'used' },
    ];

    expect(withoutEnvironmentValue(entries, 'staging')).toEqual([{ value: 'global' }]);
  });
});

describe('getEffectiveEnvironmentValue', () => {
  it('returns the environment override or falls back to the default', () => {
    const resolved = resolveEnvironmentEntries([{ value: 'global' }, { env: 'tt02', value: 's' }]);

    expect(getEffectiveEnvironmentValue(resolved, 'staging')).toBe('s');
    expect(getEffectiveEnvironmentValue(resolved, 'production')).toBe('global');
  });

  it('returns undefined when neither an override nor a default exists', () => {
    const resolved = resolveEnvironmentEntries([{ env: 'tt02', value: 's' }]);

    expect(getEffectiveEnvironmentValue(resolved, 'production')).toBeUndefined();
  });

  it('combines environment entries when a combiner is provided', () => {
    const entries: EnvironmentEntry<string[]>[] = [
      { env: 'tt02', value: ['model'] },
      { env: 'at22', value: [] },
    ];

    expect(getEffectiveEnvironmentValue(resolveEnvironmentEntries(entries), 'staging')).toEqual([]);
    expect(
      getEffectiveEnvironmentValue(resolveEnvironmentEntries(entries, combineLists), 'staging'),
    ).toEqual(['model']);
  });
});
