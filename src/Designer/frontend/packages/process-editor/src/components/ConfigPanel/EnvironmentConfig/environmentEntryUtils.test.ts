import {
  getEffectiveEnvironmentValue,
  resolveEnvironmentEntries,
  withEnvironmentValue,
  withoutEntry,
  withoutEnvironmentValue,
} from './environmentEntryUtils';
import type { EnvironmentEntry } from './types';

const combineLists = (values: string[][]): string[] => values.flat();

describe('resolveEnvironmentEntries', () => {
  it('splits the list into the environment-independent entry and the overrides', () => {
    const resolved = resolveEnvironmentEntries([
      { value: 'global' },
      { env: 'tt02', value: 'staging' },
    ]);

    expect(resolved.global).toEqual({ value: 'global' });
    expect(resolved.overrides).toEqual([
      { environment: 'staging', entry: { env: 'tt02', value: 'staging' } },
    ]);
  });

  it('orders the overrides by environment, whatever order the file has them in', () => {
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

  it('keeps an entry whose environment the runtime does not recognize', () => {
    const resolved = resolveEnvironmentEntries([{ env: 'at21', value: 'dead' }]);

    expect(resolved.unknownEntries).toEqual([{ env: 'at21', value: 'dead' }]);
    expect(resolved.overrides).toEqual([]);
  });

  it('keeps only the last of two aliases of the same environment, the way the runtime does', () => {
    const resolved = resolveEnvironmentEntries([
      { env: 'tt02', value: 'first' },
      { env: 'at22', value: 'second' },
    ]);

    expect(resolved.overrides).toEqual([
      { environment: 'staging', entry: { env: 'at22', value: 'second' } },
    ]);
    expect(resolved.duplicateEntries).toEqual([{ env: 'tt02', value: 'first' }]);
  });

  it('treats a blank env as the environment-independent entry', () => {
    const resolved = resolveEnvironmentEntries([{ env: '  ', value: 'global' }]);

    expect(resolved.global).toEqual({ env: '  ', value: 'global' });
    expect(resolved.overrides).toEqual([]);
  });

  it('combines the values of one environment when the field says the runtime does', () => {
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
  it('keeps the raw env string of an existing override', () => {
    const entries: EnvironmentEntry[] = [{ env: 'tt02', value: 'old' }];

    expect(withEnvironmentValue(entries, 'staging', 'new')).toEqual([
      { env: 'tt02', value: 'new' },
    ]);
  });

  it('writes the canonical environment name for a newly added override', () => {
    expect(withEnvironmentValue([], 'staging', 'new')).toEqual([{ env: 'staging', value: 'new' }]);
  });

  it('adds the environment-independent entry without an env attribute', () => {
    expect(withEnvironmentValue([], 'global', 'new')).toEqual([{ value: 'new' }]);
  });

  it('leaves every other entry where it stands and appends the new one', () => {
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

  it('keeps an entry the runtime shadows when the winning entry of that environment is edited', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'tt02', value: 'shadowed' },
      { env: 'at22', value: 'used' },
    ];

    expect(withEnvironmentValue(entries, 'staging', 'updated')).toEqual([
      { env: 'tt02', value: 'shadowed' },
      { env: 'at22', value: 'updated' },
    ]);
  });

  it('folds the duplicates of the edited environment into one entry when they are combined', () => {
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
  it('removes the override and leaves everything else untouched', () => {
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

  it('removes the environment-independent entry', () => {
    const entries: EnvironmentEntry[] = [{ value: 'global' }, { env: 'tt02', value: 's' }];

    expect(withoutEnvironmentValue(entries, 'global')).toEqual([{ env: 'tt02', value: 's' }]);
  });

  it('removes every entry for the environment, so a shadowed duplicate cannot take over', () => {
    const entries: EnvironmentEntry[] = [
      { env: 'tt02', value: 'shadowed' },
      { value: 'global' },
      { env: 'at22', value: 'used' },
    ];

    expect(withoutEnvironmentValue(entries, 'staging')).toEqual([{ value: 'global' }]);
  });
});

describe('withoutEntry', () => {
  it('removes the given entry and leaves a sibling that spells its environment the same', () => {
    const firstAt21: EnvironmentEntry = { env: 'at21', value: 'first' };
    const secondAt21: EnvironmentEntry = { env: 'at21', value: 'second' };

    expect(withoutEntry([firstAt21, secondAt21], firstAt21)).toEqual([secondAt21]);
  });
});

describe('getEffectiveEnvironmentValue', () => {
  it('reads the override of the environment, and the environment-independent entry otherwise', () => {
    const resolved = resolveEnvironmentEntries([{ value: 'global' }, { env: 'tt02', value: 's' }]);

    expect(getEffectiveEnvironmentValue(resolved, 'staging')).toBe('s');
    expect(getEffectiveEnvironmentValue(resolved, 'production')).toBe('global');
  });

  it('answers undefined when the file has neither', () => {
    const resolved = resolveEnvironmentEntries([{ env: 'tt02', value: 's' }]);

    expect(getEffectiveEnvironmentValue(resolved, 'production')).toBeUndefined();
  });

  it('combines the entries of an environment for a field that says they combine', () => {
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
