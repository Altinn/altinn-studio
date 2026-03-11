import { describe, expect, it } from '@jest/globals';
import { extractBinding, extractField, resolveChildBindings } from 'nextsrc/libs/form-client/resolveBindings';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

describe('extractField', () => {
  it('returns string binding as-is', () => {
    expect(extractField('person.name')).toBe('person.name');
  });

  it('returns field from DataModelReference object', () => {
    expect(extractField({ field: 'person.name' })).toBe('person.name');
  });

  it('returns field from object with dataType', () => {
    expect(extractField({ dataType: 'other', field: 'person.name' })).toBe('person.name');
  });

  it('returns empty string for null', () => {
    expect(extractField(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(extractField(undefined)).toBe('');
  });
});

describe('extractBinding', () => {
  it('wraps string in default dataType', () => {
    expect(extractBinding('name', 'model-a')).toEqual({ dataType: 'model-a', field: 'name' });
  });

  it('preserves explicit dataType from object', () => {
    expect(extractBinding({ dataType: 'model-b', field: 'name' }, 'model-a')).toEqual({
      dataType: 'model-b',
      field: 'name',
    });
  });

  it('falls back to defaultDataType when object lacks dataType', () => {
    expect(extractBinding({ field: 'name' }, 'model-a')).toEqual({ dataType: 'model-a', field: 'name' });
  });

  it('handles null by returning empty field', () => {
    expect(extractBinding(null, 'model-a')).toEqual({ dataType: 'model-a', field: '' });
  });
});

describe('resolveChildBindings', () => {
  function makeComp(overrides: Partial<ResolvedCompExternal> = {}): ResolvedCompExternal {
    return { id: 'comp-1', type: 'Input', ...overrides } as ResolvedCompExternal;
  }

  it('resolves string binding with row index', () => {
    const children = [makeComp({ dataModelBindings: { simpleBinding: 'people.name' } })];
    const resolved = resolveChildBindings(children, 'people', 0);
    expect((resolved[0].dataModelBindings as Record<string, unknown>).simpleBinding).toBe('people[0].name');
  });

  it('resolves group binding without sub-field', () => {
    const children = [makeComp({ dataModelBindings: { simpleBinding: 'people' } })];
    const resolved = resolveChildBindings(children, 'people', 2);
    expect((resolved[0].dataModelBindings as Record<string, unknown>).simpleBinding).toBe('people[2]');
  });

  it('leaves unrelated bindings unchanged', () => {
    const children = [makeComp({ dataModelBindings: { simpleBinding: 'address.street' } })];
    const resolved = resolveChildBindings(children, 'people', 0);
    expect((resolved[0].dataModelBindings as Record<string, unknown>).simpleBinding).toBe('address.street');
  });

  it('resolves DataModelReference objects preserving extra properties', () => {
    const children = [
      makeComp({ dataModelBindings: { simpleBinding: { dataType: 'model-b', field: 'people.name' } } }),
    ];
    const resolved = resolveChildBindings(children, 'people', 1);
    expect((resolved[0].dataModelBindings as Record<string, unknown>).simpleBinding).toEqual({
      dataType: 'model-b',
      field: 'people[1].name',
    });
  });

  it('resolves nested children recursively', () => {
    const inner = makeComp({ dataModelBindings: { simpleBinding: 'people.age' } });
    const outer = makeComp({ id: 'group', type: 'Group', children: [inner] });
    const resolved = resolveChildBindings([outer], 'people', 0);
    const innerResolved = resolved[0].children![0];
    expect((innerResolved.dataModelBindings as Record<string, unknown>).simpleBinding).toBe('people[0].age');
  });
});
