import { applyPatch } from 'fast-json-patch';
import { v4 as uuidv4 } from 'uuid';

import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
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
    const row1 = uuidv4();
    const row2 = uuidv4();
    const row3 = uuidv4();
    testPatch({
      prev: {
        a: [
          { [ALTINN_ROW_ID]: row1, b: 1, ...common },
          { [ALTINN_ROW_ID]: row2, b: 2, ...common },
        ],
      },
      next: {
        a: [
          { [ALTINN_ROW_ID]: row1, b: 1, ...common },
          { [ALTINN_ROW_ID]: row2, b: 2, ...common },
          { [ALTINN_ROW_ID]: row3, b: 3 },
        ],
      },
      expectedPatch: [
        {
          op: 'test',
          path: '/a',
          value: [
            { [ALTINN_ROW_ID]: row1, b: 1, ...common },
            { [ALTINN_ROW_ID]: row2, b: 2, ...common },
          ],
        },
        { op: 'add', path: '/a/-', value: { [ALTINN_ROW_ID]: row3, b: 3 } },
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
    const row1 = uuidv4();
    const row2 = uuidv4();
    testPatch({
      prev: {
        a: [
          { [ALTINN_ROW_ID]: row1, b: 1 },
          { [ALTINN_ROW_ID]: row2, b: 2 },
        ],
      },
      next: { a: [{ [ALTINN_ROW_ID]: row1, b: 1 }] },
      expectedPatch: [
        {
          op: 'test',
          path: '/a',
          value: [
            { [ALTINN_ROW_ID]: row1, b: 1 },
            { [ALTINN_ROW_ID]: row2, b: 2 },
          ],
        },
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
        { op: 'remove', path: '/a/1' },
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
    const row1 = uuidv4();
    const row2 = uuidv4();
    const row3 = uuidv4();
    const row4 = uuidv4();
    testPatch({
      prev: {
        a: [
          { [ALTINN_ROW_ID]: row1, b: 1, row: 'first' },
          { [ALTINN_ROW_ID]: row2, b: 2, row: 'second' },
          { [ALTINN_ROW_ID]: row3, b: 3, row: 'third' },
        ],
      },
      next: {
        a: [
          { [ALTINN_ROW_ID]: row2, b: 2, row: 'second' },
          { [ALTINN_ROW_ID]: row3, b: 3, row: 'third' },
          { [ALTINN_ROW_ID]: row4, b: 4 },
        ],
      },
      expectedPatch: [
        {
          op: 'test',
          path: '/a',
          value: [
            { [ALTINN_ROW_ID]: row1, b: 1, row: 'first' },
            { [ALTINN_ROW_ID]: row2, b: 2, row: 'second' },
            { [ALTINN_ROW_ID]: row3, b: 3, row: 'third' },
          ],
        },
        { op: 'remove', path: '/a/0' },
        { op: 'add', path: '/a/-', value: { [ALTINN_ROW_ID]: row4, b: 4 } },
      ],
    });
  });

  describe('should create multiple remove operations when removing multiple values the middle of an array', () => {
    testPatch({
      prev: { a: [0, 1, 2, 3, 4, 5, 6] },
      next: { a: [0, 1, 5, 6] },
      expectedPatch: [
        { op: 'test', path: '/a', value: [0, 1, 2, 3, 4, 5, 6] },
        { op: 'remove', path: '/a/2' },
        { op: 'remove', path: '/a/2' },
        { op: 'remove', path: '/a/2' },
      ],
    });
  });

  describe('should overwrite simple arrays in current if the next value is new', () => {
    testPatch({
      prev: { a: ['foo', 'bar', 'baz', 'qux'] },
      next: { a: ['foo', 'bar2', 'baz', 'qux'] },
      current: { a: ['foo', 'bar', 'baz', 'qux'] },
      final: { a: ['foo', 'bar2', 'baz', 'qux'] },
      expectedPatch: [{ op: 'replace', path: '/a', value: ['foo', 'bar2', 'baz', 'qux'] }],
    });
  });

  describe('should avoid overwriting simple arrays in current if the current value is newer', () => {
    testPatch({
      prev: { a: ['foo', 'bar', 'baz', 'qux'] },
      next: { a: ['foo', 'bar2', 'baz', 'qux'] },
      current: { a: ['foo', 'bar', 'baz', 'qux2'] },
      final: { a: ['foo', 'bar', 'baz', 'qux2'] },
      expectedPatch: [],
    });
  });

  describe('should prefer a simple replace op for a number in a nested array', () => {
    const outer_row = uuidv4();
    const inner_row = uuidv4();
    testPatch({
      prev: { a: [{ [ALTINN_ROW_ID]: outer_row, b: [{ [ALTINN_ROW_ID]: inner_row, a: 5, b: 3, c: 8 }] }] },
      next: { a: [{ [ALTINN_ROW_ID]: outer_row, b: [{ [ALTINN_ROW_ID]: inner_row, a: 5, b: 3, c: 9 }] }] },
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
    const obj1 = { [ALTINN_ROW_ID]: uuidv4(), foo: 'bar', baz: 'qux' };
    const obj2 = { [ALTINN_ROW_ID]: uuidv4(), foo: 'bar', baz: 'qux' };
    const obj3 = { [ALTINN_ROW_ID]: uuidv4(), foo: 'bar', baz: 'qux' };
    const rowId = uuidv4();
    const parent = uuidv4();
    testPatch({
      prev: {
        a: [
          { [ALTINN_ROW_ID]: parent, b: [obj1, { [ALTINN_ROW_ID]: rowId, a: 5, b: 3, c: 8 }, obj2, { d: 4, ...obj3 }] },
        ],
      },
      next: {
        a: [
          { [ALTINN_ROW_ID]: parent, b: [obj1, { [ALTINN_ROW_ID]: rowId, a: 5, b: 3, c: 9 }, obj2, { d: 5, ...obj3 }] },
        ],
      },
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
    const rowId = uuidv4();
    testPatch({
      prev: { a: [{ [ALTINN_ROW_ID]: rowId }] },
      next: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, d: 2, e: 5, f: 8 }] },
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
    const parent = uuidv4();
    const row1 = uuidv4();
    const row2 = uuidv4();
    const row3 = uuidv4();
    testPatch({
      prev: {
        a: [
          {
            [ALTINN_ROW_ID]: parent,
            b: { c: 1 },
            nested: [{ [ALTINN_ROW_ID]: row1 }, { [ALTINN_ROW_ID]: row2 }, { [ALTINN_ROW_ID]: row3 }],
          },
        ],
      },
      next: {
        a: [
          {
            [ALTINN_ROW_ID]: parent,
            b: { c: 2 },
            nested: [
              { [ALTINN_ROW_ID]: row1, ...complex },
              { [ALTINN_ROW_ID]: row2, ...complex },
              { [ALTINN_ROW_ID]: row3, ...complex },
            ],
          },
        ],
      },
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
    const objA = { [ALTINN_ROW_ID]: uuidv4(), foo: 'bar', row: 'a' };
    const objB = { [ALTINN_ROW_ID]: uuidv4(), foo: 'baz', row: 'b' };
    const objC = { [ALTINN_ROW_ID]: uuidv4(), foo: 'qux', row: 'c' };
    testPatch({
      prev: { a: [objA, objB, objC] },
      next: { a: [objA, { ...objB, foo: 'baz2' }, objC] },
      current: { a: [objA, objC] },
      final: { a: [objA, objC] },
      expectedPatch: [],
    });
  });

  describe('should seamlessly apply changes to one property even if another property has changed in current', () => {
    const rowId = uuidv4();
    testPatch({
      prev: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, c: 2 }] },
      next: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, c: 3 }] },
      current: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, c: 2 }] },
      final: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, c: 3 }] },
      expectedPatch: [{ op: 'replace', path: '/a/0/c', value: 3 }],
    });
  });

  describe('should seamlessly add a property even if another property has changed in current', () => {
    const rowId = uuidv4();
    testPatch({
      prev: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1 }] },
      next: { a: [{ [ALTINN_ROW_ID]: rowId, b: 1, c: 3 }] },
      current: { a: [{ [ALTINN_ROW_ID]: rowId, b: 2 }] },
      final: { a: [{ [ALTINN_ROW_ID]: rowId, b: 2, c: 3 }] },
      expectedPatch: [{ op: 'add', path: '/a/0/c', value: 3 }],
    });
  });

  describe('should preserve row added by openByDefault in nested group (1)', () => {
    const rowId = uuidv4();
    const childRow = uuidv4();
    testPatch({
      prev: { group: [{ [ALTINN_ROW_ID]: rowId }] },
      next: { group: [{ [ALTINN_ROW_ID]: rowId, a: 5, childGroup: [] }] },

      // While saving, our current model got a new blank row
      current: { group: [{ [ALTINN_ROW_ID]: rowId, childGroup: [{ [ALTINN_ROW_ID]: childRow }] }] },

      // The final model should have the blank row
      final: { group: [{ [ALTINN_ROW_ID]: rowId, a: 5, childGroup: [{ [ALTINN_ROW_ID]: childRow }] }] },

      expectedPatch: [
        // The patch should respect the change in current and not overwrite it
        { op: 'add', path: '/group/0/a', value: 5 },
      ],
    });
  });

  describe('should preserve row added by openByDefault in nested group (2)', () => {
    const parentOnClient = uuidv4();
    const newFromServer = uuidv4();
    const child = uuidv4();
    testPatch({
      // The only change from the above is that we don't already have an object in prev, so in this case the two rows
      // (one from next, one from current) should be treated as two separate rows.
      prev: { group: [] },
      next: { group: [{ [ALTINN_ROW_ID]: newFromServer, a: 5, childGroup: [] }] },
      current: { group: [{ [ALTINN_ROW_ID]: parentOnClient, childGroup: [{ [ALTINN_ROW_ID]: child }] }] },
      final: {
        group: [
          { [ALTINN_ROW_ID]: parentOnClient, childGroup: [{ [ALTINN_ROW_ID]: child }] },
          { [ALTINN_ROW_ID]: newFromServer, a: 5, childGroup: [] },
        ],
      },
      expectedPatch: [
        {
          op: 'add',
          path: '/group/-',
          value: {
            a: 5,
            altinnRowId: newFromServer,
            childGroup: [],
          },
        },
      ],
    });
  });

  describe('should ignore removed data in current array that is changed in next', () => {
    const rowId = uuidv4();
    testPatch({
      // In many ways, this is the exact opposite of what happens in the two tests above
      prev: { group: [{ [ALTINN_ROW_ID]: rowId, a: 5 }] },
      next: { group: [{ [ALTINN_ROW_ID]: rowId, a: 6 }] },
      current: { group: [] },
      final: { group: [] },
      expectedPatch: [],
    });
  });

  describe('adding a row with backend updates will only add new properties', () => {
    // It is important that we create new array objects for every `childGroup`, to make sure createPatch() compares
    // these properly, not just by equality (===).
    const existingRow = { [ALTINN_ROW_ID]: uuidv4(), a: 1, b: 2, childGroup: 'replace-this-with-an-empty-array' };
    const newRow = { [ALTINN_ROW_ID]: uuidv4(), a: 1, b: 2, c: 3 };
    testPatch({
      prev: { group: [{ ...existingRow, childGroup: [] }, { [ALTINN_ROW_ID]: newRow[ALTINN_ROW_ID] }] },
      next: { group: [{ ...existingRow, childGroup: [] }, newRow] },
      current: {
        group: [
          { ...existingRow, childGroup: [] },
          { [ALTINN_ROW_ID]: newRow[ALTINN_ROW_ID], d: 5 },
        ],
      },
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
    const rowId = uuidv4();
    testPatch({
      prev: { group: [{ [ALTINN_ROW_ID]: rowId, fileIds: [] }] },
      next: { group: [{ [ALTINN_ROW_ID]: rowId, fileIds: [] }] },
      current: { group: [{ [ALTINN_ROW_ID]: rowId, fileIds: ['fileId1'] }] },
      final: { group: [{ [ALTINN_ROW_ID]: rowId, fileIds: ['fileId1'] }] },
      expectedPatch: [],
    });
  });

  describe('when backend is slow and responds a little late with a prefill value for an array, we should keep both', () => {
    const rowFromServer = uuidv4();
    const rowFromClient = uuidv4();
    testPatch({
      prev: { group: [] },
      next: { group: [{ [ALTINN_ROW_ID]: rowFromServer, rowFrom: 'server' }] },
      current: { group: [{ [ALTINN_ROW_ID]: rowFromClient, rowFrom: 'client' }] },
      final: {
        group: [
          { [ALTINN_ROW_ID]: rowFromClient, rowFrom: 'client' },
          { [ALTINN_ROW_ID]: rowFromServer, rowFrom: 'server' },
        ],
      },
      expectedPatch: [{ op: 'add', path: '/group/-', value: { [ALTINN_ROW_ID]: rowFromServer, rowFrom: 'server' } }],
    });
  });

  describe('when backend is slow and responds a little late with a prefill value for an array, we should still add it2', () => {
    const rowId = uuidv4();
    testPatch({
      prev: {},
      next: { group: [{ [ALTINN_ROW_ID]: rowId, rowFrom: 'server' }] },
      current: { group: [] },
      final: { group: [{ [ALTINN_ROW_ID]: rowId, rowFrom: 'server' }] },
      expectedPatch: [{ op: 'add', path: '/group/-', value: { [ALTINN_ROW_ID]: rowId, rowFrom: 'server' } }],
    });
  });

  describe('same thing as above, but with existing rows', () => {
    const fromClient1 = uuidv4();
    const fromClient2 = uuidv4();
    const fromServer = uuidv4();
    testPatch({
      prev: { group: [{ [ALTINN_ROW_ID]: fromClient1, rowFrom: 'client' }] },
      next: {
        group: [
          { [ALTINN_ROW_ID]: fromClient1, rowFrom: 'client' },
          { [ALTINN_ROW_ID]: fromServer, rowFrom: 'server' },
        ],
      },
      current: { group: [{ [ALTINN_ROW_ID]: fromClient1, rowFrom: 'client' }, { [ALTINN_ROW_ID]: fromClient2 }] },
      final: {
        group: [
          { [ALTINN_ROW_ID]: fromClient1, rowFrom: 'client' },
          { [ALTINN_ROW_ID]: fromClient2 },
          { [ALTINN_ROW_ID]: fromServer, rowFrom: 'server' },
        ],
      },
      expectedPatch: [{ op: 'add', path: '/group/-', value: { [ALTINN_ROW_ID]: fromServer, rowFrom: 'server' } }],
    });
  });

  describe('deleting multiple rows should keep track of the correct indexes', () => {
    const prevGroup = [
      { [ALTINN_ROW_ID]: 'abc123', name: 'Per' },
      { [ALTINN_ROW_ID]: 'abc234', name: 'Kari' },
      { [ALTINN_ROW_ID]: 'abc345', name: 'Petter' },
      { [ALTINN_ROW_ID]: 'abc456', name: 'Lisa' },
      { [ALTINN_ROW_ID]: 'abc567', name: 'Erlend' },
    ];
    testPatch({
      prev: {
        group: prevGroup,
      },
      next: {
        group: [
          { [ALTINN_ROW_ID]: 'abc234', name: 'Kari' },
          { [ALTINN_ROW_ID]: 'abc456', name: 'Lisa' },
        ],
      },
      expectedPatch: [
        { op: 'test', path: '/group', value: prevGroup },
        { op: 'remove', path: '/group/4' }, // Index removal should always appear in the reverse order
        { op: 'remove', path: '/group/2' },
        { op: 'remove', path: '/group/0' },
      ],
    });
  });

  describe('deleting multiple rows and then adding a new row', () => {
    const prevGroup = [
      { [ALTINN_ROW_ID]: 'abc123', name: 'Per' },
      { [ALTINN_ROW_ID]: 'abc234', name: 'Kari' },
      { [ALTINN_ROW_ID]: 'abc345', name: 'Petter' },
      { [ALTINN_ROW_ID]: 'abc456', name: 'Lisa' },
      { [ALTINN_ROW_ID]: 'abc567', name: 'Erlend' },
    ];
    testPatch({
      prev: {
        group: prevGroup,
      },
      next: {
        group: [
          { [ALTINN_ROW_ID]: 'abc234', name: 'Kari' },
          { [ALTINN_ROW_ID]: 'abc456', name: 'Lisa' },
          { [ALTINN_ROW_ID]: 'abc678', name: 'Reidar' },
        ],
      },
      expectedPatch: [
        { op: 'test', path: '/group', value: prevGroup },
        { op: 'remove', path: '/group/4' }, // Index removal should always appear in the reverse order
        { op: 'remove', path: '/group/2' },
        { op: 'remove', path: '/group/0' },
        { op: 'add', path: '/group/-', value: { [ALTINN_ROW_ID]: 'abc678', name: 'Reidar' } },
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
      let currentCopy = {} as T;
      const lastSavedModel = {} as T;
      for (const action of actions) {
        switch (action.type) {
          case 'initialFetch':
            Object.assign(currentModel, action.model);
            Object.assign(lastSavedModel, action.model);
            break;
          case 'localChange':
            currentCopy = structuredClone(currentModel);
            action.makeChange(currentCopy);
            Object.assign(currentModel, currentCopy);
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

    test('should work with a simple add operation', () => {
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

    test('opening repeating group with delayed response', () => {
      const fromClient = uuidv4();
      const fromServer = uuidv4();
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
            model['group'].push({ [ALTINN_ROW_ID]: fromClient, rowFrom: 'client' });
          },
          { group: [{ [ALTINN_ROW_ID]: fromClient, rowFrom: 'client' }], a: 1 },
        ),

        // The backend responds with a prefill value for the array
        patchResponse({ group: [{ [ALTINN_ROW_ID]: fromServer, rowFrom: 'server' }], a: 1 }),

        // Now we should have two rows in the array, one from the backend and one from the user. As the one we
        // got from the backend appeared last, that one will be appended to the array.
        finalModel({
          group: [
            { [ALTINN_ROW_ID]: fromClient, rowFrom: 'client' },
            { [ALTINN_ROW_ID]: fromServer, rowFrom: 'server' },
          ],
          a: 1,
        }),
      ]);
    });

    test('getting changes for a row that was deleted on the client', () => {
      const row1 = uuidv4();
      const row2 = uuidv4();
      testActions<{ group: { a: number }[] }>([
        initialFetch({
          group: [
            { [ALTINN_ROW_ID]: row1, a: 1 },
            { [ALTINN_ROW_ID]: row2, a: 2 },
          ],
        }),
        localChange(
          (model) => {
            model.group[1].a = 3;
          },
          {
            group: [
              { [ALTINN_ROW_ID]: row1, a: 1 },
              { [ALTINN_ROW_ID]: row2, a: 3 },
            ],
          },
        ),
        patchRequest([
          { op: 'test', path: '/group/1/a', value: 2 },
          { op: 'replace', path: '/group/1/a', value: 3 },
        ]),

        // While we're waiting for a response, the user deletes the row
        localChange(
          (model) => {
            model.group.splice(1, 1);
          },
          {
            group: [{ [ALTINN_ROW_ID]: row1, a: 1 }],
          },
        ),

        // The backend responds with a new value for the row that was deleted
        patchResponse({
          group: [
            { [ALTINN_ROW_ID]: row1, a: 1 },
            { [ALTINN_ROW_ID]: row2, a: 4 },
          ],
        }),

        // The row that was deleted should not be added back
        finalModel({
          group: [{ [ALTINN_ROW_ID]: row1, a: 1 }],
        }),
      ]);
    });
  });
});
