import type { TextResourceFile } from './types';
import {
  generateTextResourceFile,
  mapTextResources,
  removeTextEntry,
  upsertTextEntry,
} from './mutations';

const testTextResource: TextResourceFile = {
  language: 'nb',
  resources: [
    {
      id: 'fornavn',
      value: 'Fornavn',
    },
  ],
};

test('that we can remove entries, does not mutate and creates new object', () => {
  const mappedResource = mapTextResources(testTextResource.resources);
  const mutated1 = removeTextEntry(mappedResource, 'fornavn');
  expect(mutated1).toEqual({});
  expect(mutated1).not.toBe(mappedResource);
  const mutated2 = removeTextEntry(mappedResource, 'etternavn');
  expect(mutated2).toEqual({ fornavn: { value: 'Fornavn' } });
  expect(mappedResource).toEqual({ fornavn: { value: 'Fornavn' } });
  expect(mutated2).not.toBe(mappedResource);
});

test('that we can update an entry', () => {
  const mutated = upsertTextEntry(testTextResource, {
    id: 'fornavn',
    value: 'Førnavn',
  });
  expect(mutated.language).toBe('nb');
  expect(mutated.resources).toHaveLength(1);
  expect(mutated.resources[0].id).toBe('fornavn');
  expect(mutated.resources[0].value).toBe('Førnavn');
});

test('that we can generate an old-school resource file', () => {
  const ids = ['a', 'b', 'c'];
  const entries = {
    a: { value: 'foo' },
    b: { value: 'bar' },
    c: { value: 'buz' },
  };
  const expected = {
    language: 'nb',
    resources: [
      { id: 'a', value: 'foo' },
      { id: 'b', value: 'bar' },
      { id: 'c', value: 'buz' },
    ],
  };
  const generatedFile1 = generateTextResourceFile('nb', ids, entries);
  expect(generatedFile1).toEqual(expected);

  const variables = [
    {
      key: 'fiz',
      dataSource: 'boo',
    },
  ];
  const generatedFile2 = generateTextResourceFile('nb', ids, {
    ...entries,
    c: {
      value: 'buz',
      variables,
    },
  });
  const expected2 = { ...expected };
  expected2.resources[2]['variables'] = [
    {
      key: 'fiz',
      dataSource: 'boo',
    },
  ];
  expect(generatedFile2).toEqual(expected2);
});
