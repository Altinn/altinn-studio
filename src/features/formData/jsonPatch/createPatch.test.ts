import { applyPatch } from 'fast-json-patch';

import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';

interface TestPatchProps<T> {
  prev: T;
  next: T;
  current?: T;
  final?: T;
  expectedPatch: JsonPatch;
}

function testPatch<T extends object>({ prev, next, current, final, expectedPatch }: TestPatchProps<T>) {
  const hasCurrent = current !== undefined;
  const maybeSimulatedCurrent = hasCurrent ? current : prev;

  if (!hasCurrent) {
    test('creating patch for prev -> next', () => {
      const patch = createPatch({ prev, next });
      expect(patch).toEqual(expectedPatch);
    });

    const testText2 = final ? 'applying patch to prev produces final' : 'applying patch to prev produces next';
    test(testText2, () => {
      const patch = createPatch({ prev, next });
      const prevCopy = structuredClone(prev);
      const patched = applyPatch(prevCopy, patch).newDocument;
      expect(patched).toEqual(final ?? next);
      expect(prevCopy).toEqual(final ?? next); // Ensure the patch modified the original object as well
    });
  }

  const testSuffix = hasCurrent ? '(with current)' : '(with simulated current)';
  test(`creating patch for prev -> next ${testSuffix}`, () => {
    const patch = createPatch({ prev, next, current: maybeSimulatedCurrent });
    const expectedWithoutTests = expectedPatch.filter((op) => op.op !== 'test');
    expect(patch).toEqual(expectedWithoutTests);
  });

  const testText3 = final ? 'applying patch to current produces final' : 'applying patch to current produces next';
  test(testText3, () => {
    const patch = createPatch({ prev, next, current: maybeSimulatedCurrent });
    const currentCopy = structuredClone(maybeSimulatedCurrent);
    const patched = applyPatch(currentCopy, patch).newDocument;
    expect(patched).toEqual(final ?? next);
    expect(currentCopy).toEqual(final ?? next); // Ensure the patch modified the original object as well
  });
}

describe('createPatch', () => {
  describe('should return an empty array when given two empty objects', () => {
    testPatch({ prev: {}, next: {}, expectedPatch: [] });
  });

  describe('should return an empty array when given two identical objects', () => {
    testPatch({ prev: { a: 1 }, next: { a: 1 }, expectedPatch: [] });
  });

  describe('should return simple replace', () => {
    testPatch({
      prev: { a: 1 },
      next: { a: 2 },
      expectedPatch: [
        { op: 'test', path: '/a', value: 1 },
        { op: 'replace', path: '/a', value: 2 },
      ],
    });
  });

  describe('should return simple remove', () => {
    testPatch({
      prev: { a: 1 },
      next: {},
      expectedPatch: [
        { op: 'test', path: '/a', value: 1 },
        { op: 'remove', path: '/a' },
      ],
    });
  });

  describe('should return simple add', () => {
    testPatch({ prev: {}, next: { a: 1 }, expectedPatch: [{ op: 'add', path: '/a', value: 1 }] });
  });

  describe('should create an add op for a nested object', () => {
    testPatch({ prev: {}, next: { a: { b: 1 } }, expectedPatch: [{ op: 'add', path: '/a', value: { b: 1 } }] });
  });

  describe('should create an add op for a nested array', () => {
    testPatch({ prev: {}, next: { a: [1, 2, 3] }, expectedPatch: [{ op: 'add', path: '/a', value: [1, 2, 3] }] });
  });

  describe('should create an add op for a nested array with objects', () => {
    testPatch({
      prev: {},
      next: { a: [{ b: 1 }, { b: 2 }] },
      expectedPatch: [{ op: 'add', path: '/a', value: [{ b: 1 }, { b: 2 }] }],
    });
  });

  describe('should create a shallower add op for a nested object', () => {
    testPatch({
      prev: { a: { b: 1 } },
      next: { a: { b: 1, c: 2 } },
      expectedPatch: [{ op: 'add', path: '/a/c', value: 2 }],
    });
  });

  describe('should create a shallower add op for a nested array', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: { a: [1, 2, 3, 4] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'add', path: '/a/-', value: 4 },
      ],
    });
  });

  describe('should create a shallower add op for a nested array with objects', () => {
    const common = { d: 5, e: 6 };
    testPatch({
      prev: {
        a: [
          { b: 1, ...common },
          { b: 2, ...common },
        ],
      },
      next: { a: [{ b: 1, ...common }, { b: 2, ...common }, { b: 3 }] },
      expectedPatch: [
        {
          op: 'test',
          path: '/a',
          value: [
            { b: 1, ...common },
            { b: 2, ...common },
          ],
        },
        { op: 'add', path: '/a/-', value: { b: 3 } },
      ],
    });
  });

  describe('should create a remove op for a nested object', () => {
    testPatch({
      prev: { a: { b: 1 } },
      next: {},
      expectedPatch: [
        { op: 'test', path: '/a', value: { b: 1 } },
        { op: 'remove', path: '/a' },
      ],
    });
  });

  describe('should create a remove op for a nested array', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: {},
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'remove', path: '/a' },
      ],
    });
  });

  describe('should create a remove op when removing an index from a nested array', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: { a: [1, 3] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'remove', path: '/a/1' },
      ],
    });
  });

  describe('should create a remove op when removing an object from a nested array', () => {
    testPatch({
      prev: { a: [{ b: 1 }, { b: 2 }] },
      next: { a: [{ b: 1 }] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [{ b: 1 }, { b: 2 }] },
        { op: 'remove', path: '/a/1' },
      ],
    });
  });

  describe('should not produce a patch when deep arrays are equal', () => {
    testPatch({
      prev: {
        a: [
          [1, 2],
          [3, 4],
        ],
      },
      next: {
        a: [
          [1, 2],
          [3, 4],
        ],
      },
      expectedPatch: [],
    });
  });

  describe('should create multiple remove operations when removing multiple values from arrays', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: { a: [1] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'remove', path: '/a/2' },
        { op: 'remove', path: '/a/1' },
      ],
    });
  });

  describe('should create a valid patch when removing values and adding values to the array at the same time', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: { a: [2, 3, 4] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'remove', path: '/a/0' },
        { op: 'add', path: '/a/-', value: 4 },
      ],
    });
  });

  describe('should create a valid patch when removing objects and adding objects to the array while the length stays the same', () => {
    testPatch({
      prev: {
        a: [
          { b: 1, row: 'first' },
          { b: 2, row: 'second' },
          { b: 3, row: 'third' },
        ],
      },
      next: {
        a: [{ b: 2, row: 'second' }, { b: 3, row: 'third' }, { b: 4 }],
      },
      expectedPatch: [
        {
          op: 'test',
          path: '/a',
          value: [
            { b: 1, row: 'first' },
            { b: 2, row: 'second' },
            { b: 3, row: 'third' },
          ],
        },
        { op: 'remove', path: '/a/0' },
        { op: 'add', path: '/a/-', value: { b: 4 } },
      ],
    });
  });

  describe('should create multiple remove operations when removing multiple values the middle of an array', () => {
    testPatch({
      prev: { a: [0, 1, 2, 3, 4, 5, 6] },
      next: { a: [0, 1, 5, 6] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [0, 1, 2, 3, 4, 5, 6] },
        { op: 'remove', path: '/a/4' },
        { op: 'remove', path: '/a/3' },
        { op: 'remove', path: '/a/2' },
      ],
    });
  });

  describe('should prefer remove and add operations for a simple string in a large array', () => {
    testPatch({
      prev: { a: ['foo', 'bar', 'baz', 'qux'] },
      next: { a: ['foo', 'bar2', 'baz', 'qux'] },
      expectedPatch: [
        { op: 'test', path: '/a', value: ['foo', 'bar', 'baz', 'qux'] },
        { op: 'remove', path: '/a/1' },
        { op: 'add', path: '/a/1', value: 'bar2' },
      ],
    });
  });

  describe('should prefer a simple replace op for a number in a nested array', () => {
    testPatch({
      prev: { a: [{ b: [{ a: 5, b: 3, c: 8 }] }] },
      next: { a: [{ b: [{ a: 5, b: 3, c: 9 }] }] },
      expectedPatch: [
        { op: 'test', path: '/a/0/b/0/c', value: 8 },
        { op: 'replace', path: '/a/0/b/0/c', value: 9 },
      ],
    });
  });

  describe('should create an add operation with a dash key when appending to an array', () => {
    testPatch({
      prev: { a: [1, 2, 3] },
      next: { a: [1, 2, 3, 4] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [1, 2, 3] },
        { op: 'add', path: '/a/-', value: 4 },
      ],
    });
  });

  describe('should create a minimal patch with replace operations when multiple values are changed inside nested arrays', () => {
    const equalObject = { foo: 'bar', baz: 'qux' };
    testPatch({
      prev: { a: [{ b: [equalObject, { a: 5, b: 3, c: 8 }, equalObject, { d: 4, ...equalObject }] }] },
      next: { a: [{ b: [equalObject, { a: 5, b: 3, c: 9 }, equalObject, { d: 5, ...equalObject }] }] },
      expectedPatch: [
        { op: 'test', path: '/a/0/b/1/c', value: 8 },
        { op: 'replace', path: '/a/0/b/1/c', value: 9 },
        { op: 'test', path: '/a/0/b/3/d', value: 4 },
        { op: 'replace', path: '/a/0/b/3/d', value: 5 },
      ],
    });
  });

  describe('should create a simple replace op for a string in a nested object', () => {
    testPatch({
      prev: { a: { b: 'foo' } },
      next: { a: { b: 'bar' } },
      expectedPatch: [
        { op: 'test', path: '/a/b', value: 'foo' },
        { op: 'replace', path: '/a/b', value: 'bar' },
      ],
    });
  });

  describe('should create a simple replace when new value is null', () => {
    testPatch({
      prev: { a: { b: 'foo' } },
      next: { a: { b: null } },
      expectedPatch: [
        { op: 'test', path: '/a/b', value: 'foo' },
        { op: 'replace', path: '/a/b', value: null },
      ],
    });
  });

  describe('should create a simple replace when old value is null', () => {
    testPatch({
      prev: { a: { b: null } },
      next: { a: { b: 'foo' } },
      expectedPatch: [
        { op: 'test', path: '/a/b', value: null },
        { op: 'replace', path: '/a/b', value: 'foo' },
      ],
    });
  });

  describe('should create add operations for new properties in an empty object, even when inside an array', () => {
    testPatch({
      prev: { a: [{}] },
      next: { a: [{ b: 1, d: 2, e: 5, f: 8 }] },
      expectedPatch: [
        { op: 'add', path: '/a/0/b', value: 1 },
        { op: 'add', path: '/a/0/d', value: 2 },
        { op: 'add', path: '/a/0/e', value: 5 },
        { op: 'add', path: '/a/0/f', value: 8 },
      ],
    });
  });

  describe('should compare object individually, not taking arrays in them into account', () => {
    // This case appears a lot when comparing backend changes in the data model to our own current model. The backend
    // may send us lots of new properties on objects in arrays where we just added an empty object. For nested groups
    // that could lead to the whole upper object being compared and it was assumed the whole object was changed enough
    // that it should be removed and a new one added.
    const complex = { d: 5, e: 6, f: 7 };
    testPatch({
      prev: { a: [{ b: { c: 1 }, nested: [{}, {}, {}] }] },
      next: { a: [{ b: { c: 2 }, nested: [complex, complex, complex] }] },
      expectedPatch: [
        { op: 'test', path: '/a/0/b/c', value: 1 },
        { op: 'replace', path: '/a/0/b/c', value: 2 },

        { op: 'add', path: '/a/0/nested/0/d', value: 5 },
        { op: 'add', path: '/a/0/nested/0/e', value: 6 },
        { op: 'add', path: '/a/0/nested/0/f', value: 7 },

        { op: 'add', path: '/a/0/nested/1/d', value: 5 },
        { op: 'add', path: '/a/0/nested/1/e', value: 6 },
        { op: 'add', path: '/a/0/nested/1/f', value: 7 },

        { op: 'add', path: '/a/0/nested/2/d', value: 5 },
        { op: 'add', path: '/a/0/nested/2/e', value: 6 },
        { op: 'add', path: '/a/0/nested/2/f', value: 7 },
      ],
    });
  });

  describe('when given a current object, there should be no test operations', () => {
    testPatch({
      prev: { a: 1 },
      next: { a: 2 },
      current: { a: 1 },
      final: { a: 2 },
      expectedPatch: [{ op: 'replace', path: '/a', value: 2 }],
    });
  });

  describe('should not overwrite user changes to the current object when given a change in next', () => {
    testPatch({
      prev: { a: 1 },
      next: { a: 2 },
      current: { a: 3 },
      final: { a: 3 },
      expectedPatch: [],
    });
  });

  describe('should not apply updates to a row that has been removed in the current model', () => {
    const objA = { foo: 'bar', row: 'a' };
    const objB = { foo: 'baz', row: 'b' };
    const objC = { foo: 'qux', row: 'c' };
    testPatch({
      prev: { a: [objA, objB, objC] },
      next: { a: [objA, { ...objB, foo: 'baz2' }, objC] },
      current: { a: [objA, objC] },
      final: { a: [objA, objC] },
      expectedPatch: [],
    });
  });

  describe('should seamlessly apply changes to one property even if another property has changed in current', () => {
    testPatch({
      prev: { a: [{ b: 1, c: 2 }] },
      next: { a: [{ b: 1, c: 3 }] },
      current: { a: [{ b: 1, c: 2 }] },
      final: { a: [{ b: 1, c: 3 }] },
      expectedPatch: [{ op: 'replace', path: '/a/0/c', value: 3 }],
    });
  });

  describe('should seamlessly add a property even if another property has changed in current', () => {
    testPatch({
      prev: { a: [{ b: 1 }] },
      next: { a: [{ b: 1, c: 3 }] },
      current: { a: [{ b: 2 }] },
      final: { a: [{ b: 2, c: 3 }] },
      expectedPatch: [{ op: 'add', path: '/a/0/c', value: 3 }],
    });
  });

  describe('should preserve row added by openByDefault in nested group (1)', () => {
    testPatch({
      prev: { group: [{}] },
      next: { group: [{ a: 5, childGroup: [] }] },
      current: { group: [{ childGroup: [{}] }] }, // While saving, our current model got a new blank row
      final: { group: [{ a: 5, childGroup: [{}] }] }, // The final model should have the blank row
      expectedPatch: [
        // The patch should respect the change in current and not overwrite it
        { op: 'add', path: '/group/0/a', value: 5 },
      ],
    });
  });

  describe('should preserve row added by openByDefault in nested group (2)', () => {
    testPatch({
      // The only change from the above is that we don't already have an object in prev, so in this case the two rows
      // (one from next, one from current) should be treated as two separate rows.
      prev: { group: [] },
      next: { group: [{ a: 5, childGroup: [] }] },
      current: { group: [{ childGroup: [{}] }] },
      final: { group: [{ a: 5, childGroup: [] }, { childGroup: [{}] }] },
      expectedPatch: [
        { op: 'add', path: '/group/-', value: { childGroup: [{}] } },
        { op: 'remove', path: '/group/0/childGroup/0' },
        { op: 'add', path: '/group/0/a', value: 5 },
      ],
    });
  });

  describe('should ignore removed data in current array that is changed in next', () => {
    testPatch({
      // In many ways, this is the exact opposite of what happens in the two tests above
      prev: { group: [{ a: 5 }] },
      next: { group: [{ a: 6 }] },
      current: { group: [] },
      final: { group: [] },
      expectedPatch: [],
    });
  });

  describe('adding a row with backend updates will only add new properties', () => {
    // It is important that we create new array objects for every `childGroup`, to make sure createPatch() compares
    // these properly, not just by equality (===).
    const existingRow = { a: 1, b: 2, childGroup: 'replace-this-with-an-empty-array' };
    const newRow = { a: 1, b: 2, c: 3 };
    testPatch({
      prev: { group: [{ ...existingRow, childGroup: [] }, {}] },
      next: { group: [{ ...existingRow, childGroup: [] }, newRow] },
      current: { group: [{ ...existingRow, childGroup: [] }, { d: 5 }] },
      final: {
        group: [
          { ...existingRow, childGroup: [] },
          { ...newRow, d: 5 },
        ],
      },
      expectedPatch: [
        { op: 'add', path: '/group/1/a', value: 1 },
        { op: 'add', path: '/group/1/b', value: 2 },
        { op: 'add', path: '/group/1/c', value: 3 },
      ],
    });
  });

  describe('uploaded file on the client mapped to an array should not be overwritten by backend', () => {
    testPatch({
      prev: { group: [{ fileIds: [] }] },
      next: { group: [{ fileIds: [] }] },
      current: { group: [{ fileIds: ['fileId1'] }] },
      final: { group: [{ fileIds: ['fileId1'] }] },
      expectedPatch: [],
    });
  });

  describe('when backend is slow and responds a little late with a prefill value for an array, we should keep both', () => {
    testPatch({
      prev: { group: [] },
      next: { group: [{ rowFrom: 'server' }] },
      current: { group: [{ rowFrom: 'client' }] },
      final: { group: [{ rowFrom: 'server' }, { rowFrom: 'client' }] },
      expectedPatch: [
        // The patch we generate is a bit weird, but it works.
        { op: 'add', path: '/group/-', value: { rowFrom: 'client' } },
        { op: 'replace', path: '/group/0/rowFrom', value: 'server' },
      ],
    });
  });

  describe('when backend is slow and response a little late with a prefill value for an array, we should still add it2', () => {
    testPatch({
      prev: {},
      next: { group: [{ rowFrom: 'server' }] },
      current: { group: [] },
      final: { group: [{ rowFrom: 'server' }] },
      expectedPatch: [{ op: 'add', path: '/group/-', value: { rowFrom: 'server' } }],
    });
  });

  describe('same thing as above, but with existing rows', () => {
    testPatch({
      prev: { group: [{ rowFrom: 'client' }] },
      next: { group: [{ rowFrom: 'client' }, { rowFrom: 'server' }] },
      current: { group: [{ rowFrom: 'client' }, {}] },
      final: { group: [{ rowFrom: 'client' }, { rowFrom: 'server' }, {}] },
      expectedPatch: [
        // The patch we generate is a bit weird, but it works.
        { op: 'add', path: '/group/0', value: { rowFrom: 'client' } },
        { op: 'add', path: '/group/1/rowFrom', value: 'server' },
      ],
    });
  });

  interface InitialFetch<T extends object> {
    type: 'initialFetch';
    model: T;
  }

  interface LocalChange<T extends object> {
    type: 'localChange';
    makeChange: (model: T) => void;
    expectedAfter: T;
  }

  interface PatchRequest {
    type: 'patchRequest';
    expected: JsonPatch;
  }

  interface PatchResponse<T extends object> {
    type: 'patchResponse';
    newModel: T;
  }

  interface FinalModel<T extends object> {
    type: 'finalModel';
    model: T;
  }

  type Action<T extends object> = InitialFetch<T> | LocalChange<T> | PatchRequest | PatchResponse<T> | FinalModel<T>;

  describe('createPatch with complex sequential actions', () => {
    function testActions<T extends object>(actions: Action<T>[]) {
      const currentModel = {} as T;
      const lastSavedModel = {} as T;
      for (const action of actions) {
        switch (action.type) {
          case 'initialFetch':
            Object.assign(currentModel, action.model);
            Object.assign(lastSavedModel, action.model);
            break;
          case 'localChange':
            action.makeChange(currentModel);
            expect(currentModel).toEqual(action.expectedAfter);
            break;
          case 'patchRequest':
            expect(createPatch({ prev: lastSavedModel, next: currentModel })).toEqual(action.expected);
            break;
          case 'patchResponse':
            applyPatch(
              currentModel,
              createPatch({ prev: lastSavedModel, next: action.newModel, current: currentModel }),
            );
            Object.assign(lastSavedModel, action.newModel);
            break;
          case 'finalModel':
            expect(currentModel).toEqual(action.model);
            break;
        }
      }
    }

    function initialFetch<T extends object>(model: T): InitialFetch<T> {
      return { type: 'initialFetch', model };
    }

    function localChange<T extends object>(makeChange: (model: T) => void, expectedAfter: T): LocalChange<T> {
      return { type: 'localChange', makeChange, expectedAfter };
    }

    function patchRequest(expected: JsonPatch): PatchRequest {
      return { type: 'patchRequest', expected };
    }

    function patchResponse<T extends object>(newModel: T): PatchResponse<T> {
      return { type: 'patchResponse', newModel };
    }

    function finalModel<T extends object>(model: T): FinalModel<T> {
      return { type: 'finalModel', model };
    }

    describe('should work with a simple add operation', () => {
      testActions([
        initialFetch({}),
        localChange(
          (model) => {
            model['a'] = 1;
          },
          { a: 1 },
        ),
        patchRequest([{ op: 'add', path: '/a', value: 1 }]),
        patchResponse({ a: 1 }),
        finalModel({ a: 1 }),
      ]);
    });

    describe('opening repeating group with delayed response', () => {
      testActions<{ group: null | { rowFrom: string }[]; a: number }>([
        initialFetch({ group: null, a: 0 }),
        localChange(
          (model) => {
            model['a'] = 1;
          },
          { group: null, a: 1 },
        ),
        patchRequest([
          { op: 'test', path: '/a', value: 0 },
          { op: 'replace', path: '/a', value: 1 },
        ]),

        // While we're waiting for a response, the user renders the repeating group and makes it an array
        localChange(
          (model) => {
            model['group'] = [];
          },
          { group: [], a: 1 },
        ),

        // Then openByDefault kicks in and adds a row to the array
        localChange(
          (model) => {
            model['group'].push({ rowFrom: 'client' });
          },
          { group: [{ rowFrom: 'client' }], a: 1 },
        ),

        // The backend responds with a prefill value for the array
        patchResponse({ group: [{ rowFrom: 'server' }], a: 1 }),

        // Now we should have two rows in the array, one from the backend and one from the user. As the one we
        // got from the backend appeared last, that one will be appended to the array.
        finalModel({ group: [{ rowFrom: 'client' }, { rowFrom: 'server' }], a: 1 }),
      ]);
    });
  });
});
