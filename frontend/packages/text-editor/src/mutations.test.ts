import type { TextResourceFile } from './types';
import { findTextEntry, removeTextEntry, upsertTextEntry } from './mutations';

const testTextResource: TextResourceFile = {
  language: 'nb',
  resources: [
    {
      id: 'fornavn',
      value: 'Fornavn',
    },
  ],
};

test('that we can find entries', () => {
  expect(findTextEntry(testTextResource, 'fornavn')).toStrictEqual({
    id: 'fornavn',
    value: 'Fornavn',
  });
  expect(findTextEntry(testTextResource, 'etternavn')).toBeFalsy();
});

test('that we can remove entries', () => {
  const mutated1 = removeTextEntry(testTextResource, 'fornavn');
  expect(mutated1.resources).toHaveLength(0);
  const mutated2 = removeTextEntry(testTextResource, 'etternavn');
  expect(mutated2.resources).toHaveLength(1);
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
