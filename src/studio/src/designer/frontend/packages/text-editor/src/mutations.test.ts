import type { TextResourceFile } from './types';
import { mapTextResources, removeTextEntry, upsertTextEntry } from './mutations';

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

test('that we can add an entry', () => {
  const mutated = upsertTextEntry(testTextResource, {
    id: 'etternavn',
    value: 'Etternavn',
  });
  expect(mutated.language).toBe('nb');
  expect(mutated.resources).toHaveLength(2);
  expect(mutated.resources[0].id).toBe('fornavn');
  expect(mutated.resources[0].value).toBe('Fornavn');
  expect(mutated.resources[1].id).toBe('etternavn');
  expect(mutated.resources[1].value).toBe('Etternavn');
});
