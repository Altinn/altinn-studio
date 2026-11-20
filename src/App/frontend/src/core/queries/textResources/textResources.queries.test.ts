import { describe, expect, it } from 'vitest';

import { resourcesAsMap } from 'src/core/queries/textResources/textResources.queries';
import type { IRawTextResource, TextResourceMap } from 'src/features/language/textResources';

function previousResourcesAsMap(resources: IRawTextResource[]): TextResourceMap {
  return resources.reduce((acc, { id, ...resource }) => ({ ...acc, [id]: resource }), {});
}

describe('resourcesAsMap', () => {
  it('returns a fresh ordinary object for an empty resource list', () => {
    const result = resourcesAsMap([]);

    expect(result).toEqual({});
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result).not.toBe(resourcesAsMap([]));
  });

  it('keeps the last duplicate value and the first insertion position', () => {
    const resources = [
      { id: 'first', value: 'First' },
      { id: 'duplicate', value: 'Before' },
      { id: 'last', value: 'Last' },
      { id: 'duplicate', value: 'After' },
    ];
    const result = resourcesAsMap(resources);

    expect(result).toEqual(previousResourcesAsMap(resources));
    expect(result.duplicate).toEqual({ value: 'After' });
    expect(Object.keys(result)).toEqual(['first', 'duplicate', 'last']);
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'retains an own resource entry for the special key %s',
    (id) => {
      const resources = [
        { id, value: 'Before' },
        { id: 'ordinary', value: 'Text' },
        { id, value: 'After' },
      ];
      const result = resourcesAsMap(resources);
      const previous = previousResourcesAsMap(resources);

      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(Object.hasOwn(result, id)).toBe(true);
      expect(result[id]).toEqual({ value: 'After' });
      expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(previous));
      expect(Object.keys(result)).toEqual(Object.keys(previous));
    },
  );

  it('preserves the property order of integer and ordinary string IDs', () => {
    const resources = ['later', '10', '2', '01', '4294967295', '4294967294', 'later'].map((id, index) => ({
      id,
      value: `Text ${index}`,
    }));
    const result = resourcesAsMap(resources);

    expect(result).toEqual(previousResourcesAsMap(resources));
    expect(Object.keys(result)).toEqual(['2', '10', '4294967294', 'later', '01', '4294967295']);
  });

  it('copies each value without its ID and retains nested variable identity', () => {
    const variables: IRawTextResource['variables'] = [{ key: 'name', dataSource: 'dataModel.default' }];
    const resource = { id: 'text', value: 'Hello {0}', variables };
    const result = resourcesAsMap([resource]);

    expect(result).toEqual(previousResourcesAsMap([resource]));
    expect(result.text).not.toBe(resource);
    expect(result.text?.variables).toBe(variables);
    expect(Object.hasOwn(result.text ?? {}, 'id')).toBe(false);
    expect(result.text).not.toBe(resourcesAsMap([resource]).text);
    expect(resource).toEqual({ id: 'text', value: 'Hello {0}', variables });
  });

  it('skips holes in a sparse resource list', () => {
    const resources: IRawTextResource[] = [];
    resources[2] = { id: 'text', value: 'Text' };

    expect(resourcesAsMap(resources)).toEqual(previousResourcesAsMap(resources));
    expect(resourcesAsMap(resources)).toEqual({ text: { value: 'Text' } });
  });
});
